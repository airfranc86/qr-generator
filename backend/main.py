import os
import re
import sys
from typing import Optional

# Allow running from repo root: uvicorn backend.main:app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from backend.qr_generator import (
    VALID_FRAME_STYLES,
    VALID_MODULE_STYLES,
    create_qr,
)

# Allow tests to bypass rate limits (TESTING=1)
_RATE_LIMIT = "300/minute" if os.getenv("TESTING") else "30/minute"

limiter = Limiter(key_func=get_remote_address, default_limits=[_RATE_LIMIT])

app = FastAPI(title="QR Generator API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
_MAX_LOGO_BYTES = 2 * 1024 * 1024  # 2 MB

# Cloudflare Turnstile (CAPTCHA gratuito, ilimitado)
# Default: test secret que SIEMPRE pasa (1x...AA). Reemplazar via env en producción.
_TURNSTILE_SECRET = os.getenv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
_TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
_TURNSTILE_ENABLED = bool(_TURNSTILE_SECRET) and not os.getenv("TESTING")


async def _verify_turnstile(token: Optional[str], remote_ip: str) -> bool:
    """Verify CF Turnstile token against Cloudflare. Returns True if valid (or disabled)."""
    if not _TURNSTILE_ENABLED:
        return True
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                _TURNSTILE_VERIFY_URL,
                data={"secret": _TURNSTILE_SECRET, "response": token, "remoteip": remote_ip},
            )
            return bool(resp.json().get("success", False))
    except Exception:
        return False


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/options")
async def options():
    return {
        "module_styles": sorted(VALID_MODULE_STYLES),
        "frame_styles": sorted(VALID_FRAME_STYLES),
    }


@app.post("/generate")
@limiter.limit(_RATE_LIMIT)
async def generate_qr(
    request: Request,
    url: str = Form(...),
    module_style: str = Form("square"),
    qr_color: str = Form("#000000"),
    bg_color: str = Form("#FFFFFF"),
    frame_style: str = Form("none"),
    logo: Optional[UploadFile] = File(None),
    website: str = Form("", description="Honeypot — must remain empty"),
    cf_turnstile_token: Optional[str] = Form(None),
):
    # ---------- ANTI-BOT CHECKS ----------
    # 1. Honeypot — bots filling all fields will trip this
    if website:
        raise HTTPException(400, "Bad request")

    # 2. User-Agent presence check (reject empty UA — common bot tell)
    ua = request.headers.get("user-agent", "").strip()
    if not ua:
        raise HTTPException(403, "Acceso restringido")

    # 3. Cloudflare Turnstile CAPTCHA verification (skipped in tests)
    if _TURNSTILE_ENABLED:
        remote_ip = get_remote_address(request)
        ok = await _verify_turnstile(cf_turnstile_token, remote_ip)
        if not ok:
            raise HTTPException(403, "Verificación de CAPTCHA fallida")

    # ---------- VALIDACIÓN DE INPUT ----------
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "La URL debe empezar con http:// o https://")

    if len(url) > 2048:
        raise HTTPException(400, "URL demasiado larga (máx 2048 caracteres)")

    if module_style not in VALID_MODULE_STYLES:
        raise HTTPException(400, f"module_style inválido: {module_style!r}")

    if frame_style not in VALID_FRAME_STYLES:
        raise HTTPException(400, f"frame_style inválido: {frame_style!r}")

    if not _HEX_RE.match(qr_color):
        raise HTTPException(400, f"qr_color inválido: {qr_color!r}. Formato esperado: #RRGGBB")

    if not _HEX_RE.match(bg_color):
        raise HTTPException(400, f"bg_color inválido: {bg_color!r}. Formato esperado: #RRGGBB")

    logo_bytes: Optional[bytes] = None
    if logo is not None and logo.filename:
        data = await logo.read()
        if data:
            if len(data) > _MAX_LOGO_BYTES:
                raise HTTPException(400, "El logo supera el tamaño máximo (2 MB)")
            logo_bytes = data

    try:
        buf = create_qr(url, module_style, qr_color, bg_color, frame_style, logo_bytes)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"QR generation failed: {e}")

    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": 'inline; filename="qr.png"'},
    )


# Static frontend mount — MUST be the last route registered
_dist_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend",
    "dist",
)
if os.path.isdir(_dist_path):
    app.mount("/", StaticFiles(directory=_dist_path, html=True), name="static")
