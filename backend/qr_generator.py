import io
import re
from typing import Optional

import qrcode
import qrcode.constants
from PIL import Image, ImageColor, ImageDraw, ImageFont
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask
from qrcode.image.styles.moduledrawers.pil import (
    CircleModuleDrawer,
    GappedSquareModuleDrawer,
    HorizontalBarsDrawer,
    RoundedModuleDrawer,
    SquareModuleDrawer,
    VerticalBarsDrawer,
)

VALID_MODULE_STYLES = {"square", "rounded", "gapped", "circle", "vertical", "horizontal"}
VALID_FRAME_STYLES = {"none", "simple", "rounded", "shadow", "scan_me", "scan_me_top"}

_MODULE_DRAWERS = {
    "square": SquareModuleDrawer,
    "rounded": RoundedModuleDrawer,
    "gapped": GappedSquareModuleDrawer,
    "circle": CircleModuleDrawer,
    "vertical": VerticalBarsDrawer,
    "horizontal": HorizontalBarsDrawer,
}

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _parse_hex(hex_str: str) -> tuple[int, int, int]:
    if not _HEX_RE.match(hex_str):
        raise ValueError(f"Color inválido: {hex_str!r}. Debe ser formato #RRGGBB.")
    return ImageColor.getrgb(hex_str)


def _is_default_black_white(qr_color: str, bg_color: str) -> bool:
    return qr_color.upper() == "#000000" and bg_color.upper() == "#FFFFFF"


def _make_raw_qr(url: str, module_style: str, qr_color: str, bg_color: str, has_logo: bool) -> Image.Image:
    error_correction = qrcode.constants.ERROR_CORRECT_H if has_logo else qrcode.constants.ERROR_CORRECT_L

    qr = qrcode.QRCode(
        version=None,
        error_correction=error_correction,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Fast path: square + black/white — no StyledPilImage needed
    if module_style == "square" and _is_default_black_white(qr_color, bg_color):
        img = qr.make_image(fill_color="black", back_color="white")
        return _unwrap(img)

    front_color = _parse_hex(qr_color)
    back_color = _parse_hex(bg_color)

    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=_MODULE_DRAWERS[module_style](),
        color_mask=SolidFillColorMask(back_color=back_color, front_color=front_color),
    )
    return _unwrap(img)


def _unwrap(img) -> Image.Image:
    """Extract PIL Image from qrcode wrapper objects."""
    if hasattr(img, "to_pil"):
        return img.to_pil()
    if hasattr(img, "_img"):
        return img._img
    return img


def _embed_logo(pil_img: Image.Image, logo_bytes: bytes) -> Image.Image:
    img = pil_img.convert("RGB")
    qr_w, qr_h = img.size
    max_side = int(qr_w * 0.25)

    logo = Image.open(io.BytesIO(logo_bytes))
    logo.thumbnail((max_side, max_side), Image.LANCZOS)

    pos_x = (qr_w - logo.width) // 2
    pos_y = (qr_h - logo.height) // 2

    if logo.mode == "RGBA":
        img.paste(logo, (pos_x, pos_y), logo)
    else:
        img.paste(logo.convert("RGB"), (pos_x, pos_y))
    return img


def _apply_frame(pil_img: Image.Image, frame_style: str, qr_color: str) -> Image.Image:
    if frame_style == "none":
        return pil_img

    img = pil_img.convert("RGB")
    color = _parse_hex(qr_color)
    w, h = img.size

    PADDING = 24
    TEXT_AREA = 40 if frame_style in ("scan_me", "scan_me_top") else 0
    BORDER = 8

    extra_top = TEXT_AREA if frame_style == "scan_me_top" else 0
    extra_bottom = TEXT_AREA if frame_style == "scan_me" else 0

    new_w = w + PADDING * 2
    new_h = h + PADDING * 2 + extra_top + extra_bottom

    canvas = Image.new("RGB", (new_w, new_h), (255, 255, 255))
    canvas.paste(img, (PADDING, PADDING + extra_top))

    draw = ImageDraw.Draw(canvas)

    if frame_style == "simple":
        draw.rectangle([BORDER // 2, BORDER // 2, new_w - BORDER // 2, new_h - BORDER // 2],
                       outline=color, width=BORDER)

    elif frame_style == "rounded":
        _draw_rounded_rect(draw, [BORDER // 2, BORDER // 2, new_w - BORDER // 2, new_h - BORDER // 2],
                           radius=16, outline=color, width=BORDER)

    elif frame_style == "shadow":
        shadow_offset = 6
        shadow = Image.new("RGB", (new_w, new_h), (255, 255, 255))
        sdraw = ImageDraw.Draw(shadow)
        sdraw.rectangle([BORDER // 2 + shadow_offset, BORDER // 2 + shadow_offset,
                         new_w - BORDER // 2 + shadow_offset, new_h - BORDER // 2 + shadow_offset],
                        fill=(180, 180, 180))
        shadow.paste(canvas, (0, 0))
        canvas = shadow
        draw = ImageDraw.Draw(canvas)
        draw.rectangle([BORDER // 2, BORDER // 2, new_w - BORDER // 2, new_h - BORDER // 2],
                       outline=color, width=BORDER)

    elif frame_style in ("scan_me", "scan_me_top"):
        draw.rectangle([BORDER // 2, BORDER // 2, new_w - BORDER // 2, new_h - BORDER // 2],
                       outline=color, width=BORDER)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except OSError:
            font = ImageFont.load_default()

        text = "ESCANEAME"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]

        if frame_style == "scan_me":
            text_y = new_h - extra_bottom + (extra_bottom - (bbox[3] - bbox[1])) // 2
        else:
            text_y = (extra_top - (bbox[3] - bbox[1])) // 2

        draw.text(((new_w - text_w) // 2, text_y), text, fill=color, font=font)

    return canvas


def _draw_rounded_rect(draw: ImageDraw.ImageDraw, xy, radius: int, outline, width: int):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=outline, width=width)


def create_qr(
    url: str,
    module_style: str,
    qr_color: str,
    bg_color: str,
    frame_style: str,
    logo_bytes: Optional[bytes] = None,
) -> io.BytesIO:
    """
    Generate a customized QR code image and return it as a PNG BytesIO.

    Args:
        url: Target URL (must start with http:// or https://)
        module_style: One of VALID_MODULE_STYLES
        qr_color: Hex color for QR modules e.g. "#000000"
        bg_color: Hex background color e.g. "#FFFFFF"
        frame_style: One of VALID_FRAME_STYLES
        logo_bytes: Optional raw bytes of logo image to embed in center
    """
    if module_style not in VALID_MODULE_STYLES:
        raise ValueError(f"module_style inválido: {module_style!r}")
    if frame_style not in VALID_FRAME_STYLES:
        raise ValueError(f"frame_style inválido: {frame_style!r}")

    pil_img = _make_raw_qr(url, module_style, qr_color, bg_color, has_logo=logo_bytes is not None)
    pil_img = pil_img.convert("RGB")

    if logo_bytes:
        pil_img = _embed_logo(pil_img, logo_bytes)

    pil_img = _apply_frame(pil_img, frame_style, qr_color)

    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    buf.seek(0)
    return buf
