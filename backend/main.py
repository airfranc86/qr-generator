import os
import re
import sys
from typing import Optional

# Allow running from repo root: uvicorn backend.main:app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from backend.qr_generator import (
    VALID_FRAME_STYLES,
    VALID_MODULE_STYLES,
    create_qr,
)

app = FastAPI(title="QR Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


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
async def generate_qr(
    url: str = Form(...),
    module_style: str = Form("square"),
    qr_color: str = Form("#000000"),
    bg_color: str = Form("#FFFFFF"),
    frame_style: str = Form("none"),
    logo: Optional[UploadFile] = File(None),
):
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "La URL debe empezar con http:// o https://")

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
