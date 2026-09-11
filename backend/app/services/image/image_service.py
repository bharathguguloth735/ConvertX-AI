"""
DocuFlow AI — Image Service
All image operations using Pillow.
"""
import io
from typing import Optional, Tuple, List
from PIL import Image, ImageFilter, ImageEnhance, ImageOps, ExifTags


class ImageService:
    """Handles all image processing operations."""

    SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF", "TIFF", "BMP"}

    @staticmethod
    def _open(image_bytes: bytes) -> Image.Image:
        return Image.open(io.BytesIO(image_bytes))

    @staticmethod
    def _to_bytes(img: Image.Image, fmt: str = "PNG", quality: int = 95) -> bytes:
        buf = io.BytesIO()
        fmt_upper = fmt.upper()
        if fmt_upper == "JPG":
            fmt_upper = "JPEG"
        save_kwargs = {"format": fmt_upper}
        if fmt_upper in ("JPEG", "WEBP"):
            save_kwargs["quality"] = quality
            if fmt_upper == "JPEG":
                save_kwargs["optimize"] = True
                save_kwargs["subsampling"] = 0
        img.save(buf, **save_kwargs)
        return buf.getvalue()

    # ── Format Conversion ──────────────────────────────────────────────────────

    @staticmethod
    def convert_format(image_bytes: bytes, target_format: str, quality: int = 85) -> bytes:
        """Convert image to target format (JPEG, PNG, WEBP, etc.)."""
        img = Image.open(io.BytesIO(image_bytes))
        target_fmt = target_format.upper()
        if target_fmt == "JPG":
            target_fmt = "JPEG"

        # Convert RGBA, LA, P, CMYK modes for formats that do not support transparency
        if target_fmt in ("JPEG", "BMP") and img.mode in ("RGBA", "LA", "P", "CMYK"):
            if img.mode == "CMYK":
                img = img.convert("RGB")
            else:
                bg = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                img = bg
        elif target_fmt == "PNG" and img.mode == "CMYK":
            img = img.convert("RGB")

        return ImageService._to_bytes(img, target_fmt, quality)

    # ── Crop ──────────────────────────────────────────────────────────────────

    @staticmethod
    def crop(image_bytes: bytes, x: int, y: int, width: int, height: int) -> bytes:
        """Crop image to specified rectangle."""
        img = Image.open(io.BytesIO(image_bytes))
        cropped = img.crop((x, y, x + width, y + height))
        return ImageService._to_bytes(cropped, img.format or "PNG")

    @staticmethod
    def crop_aspect_ratio(image_bytes: bytes, aspect_w: float, aspect_h: float) -> bytes:
        """Crop image to given aspect ratio (centered)."""
        img = Image.open(io.BytesIO(image_bytes))
        img_w, img_h = img.size
        target_ratio = aspect_w / aspect_h
        current_ratio = img_w / img_h

        if current_ratio > target_ratio:
            new_w = int(img_h * target_ratio)
            left = (img_w - new_w) // 2
            box = (left, 0, left + new_w, img_h)
        else:
            new_h = int(img_w / target_ratio)
            top = (img_h - new_h) // 2
            box = (0, top, img_w, top + new_h)

        cropped = img.crop(box)
        return ImageService._to_bytes(cropped, img.format or "PNG")

    # ── Resize ────────────────────────────────────────────────────────────────

    @staticmethod
    def resize(image_bytes: bytes, width: int, height: int, keep_aspect: bool = True) -> bytes:
        """Resize image to given dimensions."""
        img = Image.open(io.BytesIO(image_bytes))
        if keep_aspect:
            img.thumbnail((width, height), Image.LANCZOS)
        else:
            img = img.resize((width, height), Image.LANCZOS)
        return ImageService._to_bytes(img, img.format or "PNG")

    # ── Rotate & Flip ─────────────────────────────────────────────────────────

    @staticmethod
    def rotate(image_bytes: bytes, angle: float, expand: bool = True) -> bytes:
        """Rotate image by given angle."""
        img = Image.open(io.BytesIO(image_bytes))
        rotated = img.rotate(angle, expand=expand, resample=Image.BICUBIC)
        return ImageService._to_bytes(rotated, img.format or "PNG")

    @staticmethod
    def flip(image_bytes: bytes, direction: str = "horizontal") -> bytes:
        """Flip image horizontally or vertically."""
        img = Image.open(io.BytesIO(image_bytes))
        if direction == "horizontal":
            flipped = ImageOps.mirror(img)
        else:
            flipped = ImageOps.flip(img)
        return ImageService._to_bytes(flipped, img.format or "PNG")

    # ── Compress ──────────────────────────────────────────────────────────────

    @staticmethod
    def compress(image_bytes: bytes, quality: int = 70, max_dimension: Optional[int] = None) -> bytes:
        """Compress image by reducing quality and optionally resizing."""
        img = Image.open(io.BytesIO(image_bytes))
        if max_dimension:
            img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)
        # Determine output format
        fmt = img.format or "JPEG"
        if fmt not in ("JPEG", "WEBP"):
            fmt = "JPEG"
        return ImageService._to_bytes(img.convert("RGB") if fmt == "JPEG" and img.mode in ("RGBA", "P") else img, fmt, quality)

    # ── Enhancement ───────────────────────────────────────────────────────────

    @staticmethod
    def enhance(image_bytes: bytes, brightness: float = 1.0, contrast: float = 1.0,
                sharpness: float = 1.0, saturation: float = 1.0) -> bytes:
        """Apply enhancement filters to image."""
        img = Image.open(io.BytesIO(image_bytes))
        if brightness != 1.0:
            img = ImageEnhance.Brightness(img).enhance(brightness)
        if contrast != 1.0:
            img = ImageEnhance.Contrast(img).enhance(contrast)
        if sharpness != 1.0:
            img = ImageEnhance.Sharpness(img).enhance(sharpness)
        if saturation != 1.0:
            img = ImageEnhance.Color(img).enhance(saturation)
        return ImageService._to_bytes(img, img.format or "PNG")

    # ── Metadata ──────────────────────────────────────────────────────────────

    @staticmethod
    def remove_metadata(image_bytes: bytes) -> bytes:
        """Strip all EXIF/metadata from image."""
        img = Image.open(io.BytesIO(image_bytes))
        # Create new image without metadata
        clean = Image.new(img.mode, img.size)
        clean.putdata(list(img.getdata()))
        fmt = img.format or "JPEG"
        return ImageService._to_bytes(clean, fmt)

    @staticmethod
    def get_image_info(image_bytes: bytes) -> dict:
        """Return image metadata: size, format, mode, EXIF."""
        img = Image.open(io.BytesIO(image_bytes))
        info = {
            "width": img.width,
            "height": img.height,
            "format": img.format,
            "mode": img.mode,
            "size_bytes": len(image_bytes),
        }
        try:
            exif_data = img._getexif() or {}
            info["exif"] = {
                ExifTags.TAGS.get(k, k): str(v)
                for k, v in exif_data.items()
                if k in ExifTags.TAGS
            }
        except Exception:
            info["exif"] = {}
        return info

    # ── Multiple Images to PDF ────────────────────────────────────────────────

    @staticmethod
    def images_to_pdf(image_bytes_list: List[bytes]) -> bytes:
        """Combine multiple images into a PDF."""
        if not image_bytes_list:
            raise ValueError("No images provided")
        images = [Image.open(io.BytesIO(b)).convert("RGB") for b in image_bytes_list]
        buf = io.BytesIO()
        images[0].save(buf, format="PDF", save_all=True, append_images=images[1:])
        return buf.getvalue()
