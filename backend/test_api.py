import io
import os
import sys

import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Bypass strict rate limit during tests
os.environ["TESTING"] = "1"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

client = TestClient(app)


def _fake_png(size=(60, 60), color="red") -> bytes:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _is_valid_png(content: bytes) -> bool:
    img = Image.open(io.BytesIO(content))
    return img.format == "PNG"


class TestGenerate:
    def test_simple_valid_url_returns_200_png(self):
        r = client.post("/generate", data={"url": "https://example.com"})
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
        assert _is_valid_png(r.content)

    def test_url_without_protocol_returns_400(self):
        r = client.post("/generate", data={"url": "example.com"})
        assert r.status_code == 400

    def test_ftp_url_returns_400(self):
        r = client.post("/generate", data={"url": "ftp://example.com"})
        assert r.status_code == 400

    def test_module_style_rounded_returns_png(self):
        r = client.post("/generate", data={
            "url": "https://example.com",
            "module_style": "rounded",
        })
        assert r.status_code == 200
        assert _is_valid_png(r.content)

    def test_frame_scan_me_returns_png(self):
        r = client.post("/generate", data={
            "url": "https://example.com",
            "frame_style": "scan_me",
        })
        assert r.status_code == 200
        assert _is_valid_png(r.content)

    def test_custom_color_returns_png(self):
        r = client.post("/generate", data={
            "url": "https://example.com",
            "qr_color": "#FF0000",
            "bg_color": "#FFFFFF",
            "module_style": "circle",
        })
        assert r.status_code == 200
        assert _is_valid_png(r.content)

    def test_with_logo_returns_png(self):
        logo = _fake_png()
        r = client.post(
            "/generate",
            data={"url": "https://example.com", "module_style": "square"},
            files={"logo": ("logo.png", logo, "image/png")},
        )
        assert r.status_code == 200
        assert _is_valid_png(r.content)

    def test_invalid_module_style_returns_400(self):
        r = client.post("/generate", data={
            "url": "https://example.com",
            "module_style": "nonexistent",
        })
        assert r.status_code == 400

    def test_invalid_color_returns_400(self):
        r = client.post("/generate", data={
            "url": "https://example.com",
            "qr_color": "not-a-color",
        })
        assert r.status_code == 400

    def test_health_endpoint(self):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}

    def test_honeypot_filled_returns_400(self):
        r = client.post("/generate", data={
            "url": "https://example.com",
            "website": "i-am-a-bot",
        })
        assert r.status_code == 400

    def test_empty_user_agent_returns_403(self):
        r = client.post(
            "/generate",
            data={"url": "https://example.com"},
            headers={"user-agent": ""},
        )
        assert r.status_code == 403

    def test_url_too_long_returns_400(self):
        long_url = "https://example.com/" + ("a" * 2100)
        r = client.post("/generate", data={"url": long_url})
        assert r.status_code == 400

    def test_options_endpoint(self):
        r = client.get("/api/options")
        assert r.status_code == 200
        data = r.json()
        assert "module_styles" in data
        assert "frame_styles" in data
        assert "rounded" in data["module_styles"]
        assert "scan_me" in data["frame_styles"]
