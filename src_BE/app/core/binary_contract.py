"""OpenAPI media contracts for endpoints returning bytes rather than JSON."""

IMAGE_RESPONSE = {
    200: {
        "description": "Decoded and normalized JPEG image",
        "content": {"image/jpeg": {"schema": {"type": "string", "format": "binary"}}},
    }
}

REPORT_FILE_RESPONSE = {
    200: {
        "description": "Report download in the requested format",
        "headers": {"Content-Disposition": {"schema": {"type": "string"}}},
        "content": {
            media: {"schema": {"type": "string", "format": "binary"}}
            for media in (
                "text/csv",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    }
}
