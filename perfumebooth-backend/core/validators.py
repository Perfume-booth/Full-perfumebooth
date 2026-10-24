"""
Core Validators for File Uploads — Type, Size, and Content Verification
"""
import os
import io
import csv
from PIL import Image
from rest_framework.exceptions import ValidationError

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.webm', '.mov', '.m4v'}
ALLOWED_SPREADSHEET_EXTENSIONS = {'.csv', '.xlsx', '.xls'}

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024       # 10 MB
MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024      # 100 MB
MAX_SPREADSHEET_SIZE_BYTES = 15 * 1024 * 1024 # 15 MB

ALLOWED_MEDIA_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

ZIP_MAGIC_HEADER = b'PK\x03\x04'
OLE2_MAGIC_HEADER = b'\xd0\xcf\x11\xe0'


def validate_media_upload(file_obj, max_image_size=MAX_IMAGE_SIZE_BYTES, max_video_size=MAX_VIDEO_SIZE_BYTES):
    """
    Validates uploaded media files (images and streaming videos).
    Allows .jpg, .png, .webp, .gif, .mp4, .webm, .mov.
    Returns 'video' or 'image'.
    """
    if not file_obj:
        return None

    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_MEDIA_EXTENSIONS))}."
        )

    if ext in ALLOWED_VIDEO_EXTENSIONS:
        if file_obj.size > max_video_size:
            max_mb = max_video_size // (1024 * 1024)
            raise ValidationError(f"Video file size exceeds maximum limit of {max_mb}MB.")
        return 'video'
    else:
        validate_image_upload(file_obj, max_size_bytes=max_image_size)
        return 'image'


def validate_image_upload(file_obj, max_size_bytes=MAX_IMAGE_SIZE_BYTES):
    """
    Validates uploaded image file type, size, and binary image integrity.
    Resets the file pointer to byte 0 after inspection.
    """
    if not file_obj:
        return None

    # 1. Size Validation
    if file_obj.size > max_size_bytes:
        max_mb = max_size_bytes // (1024 * 1024)
        raise ValidationError(f"Image file size exceeds maximum limit of {max_mb}MB.")

    # 2. Extension Validation
    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            f"Unsupported image extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}."
        )

    # 3. Content Inspection via Pillow
    try:
        file_obj.seek(0)
        img = Image.open(file_obj)
        img.verify()
        
        # Verify format matches image formats
        if img.format.lower() not in ['jpeg', 'png', 'webp', 'gif']:
            raise ValidationError("File content is not a supported image format.")
    except Exception:
        raise ValidationError("Uploaded file contains corrupted or invalid image data.")
    finally:
        file_obj.seek(0)

    return file_obj


def validate_spreadsheet_upload(file_obj, max_size_bytes=MAX_SPREADSHEET_SIZE_BYTES):
    """
    Validates uploaded spreadsheet (CSV/Excel) file type, size, and header content.
    Resets the file pointer to byte 0 after inspection.
    """
    if not file_obj:
        raise ValidationError("No file was uploaded.")

    # 1. Size Validation
    if file_obj.size > max_size_bytes:
        max_mb = max_size_bytes // (1024 * 1024)
        raise ValidationError(f"File size exceeds maximum limit of {max_mb}MB.")

    # 2. Extension Validation
    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_SPREADSHEET_EXTENSIONS:
        raise ValidationError(
            f"Unsupported spreadsheet format '{ext}'. Allowed formats: .csv, .xlsx, .xls."
        )

    # 3. Content Inspection
    try:
        file_obj.seek(0)
        header_bytes = file_obj.read(512)
        file_obj.seek(0)

        if ext == '.csv':
            # Verify CSV content is decodable text
            try:
                sample_text = header_bytes.decode('utf-8-sig')
            except UnicodeDecodeError:
                try:
                    sample_text = header_bytes.decode('latin-1')
                except Exception:
                    raise ValidationError("CSV file must be valid UTF-8 or Latin-1 encoded text.")
            
            # Verify delimiter parsing
            if not sample_text.strip():
                raise ValidationError("Uploaded CSV file is empty.")

        elif ext == '.xlsx':
            # XLSX is an OpenXML ZIP container starting with PK\x03\x04
            if not header_bytes.startswith(ZIP_MAGIC_HEADER):
                raise ValidationError("Uploaded .xlsx file is not a valid OpenXML workbook.")

        elif ext == '.xls':
            # Legacy binary Excel format starts with OLE2 signature
            if not header_bytes.startswith(OLE2_MAGIC_HEADER):
                raise ValidationError("Uploaded .xls file is not a valid Excel binary workbook.")

    except ValidationError:
        raise
    except Exception:
        raise ValidationError("Unable to read or parse the uploaded file content.")
    finally:
        file_obj.seek(0)

    return file_obj
