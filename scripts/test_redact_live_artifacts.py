"""Credential masking must cover both trace resources and embedded reports."""

import base64
import io
import re
import unittest
import zipfile

from redact_live_artifacts import redact


class RedactionTest(unittest.TestCase):
    def test_embedded_report_and_binary_resource(self):
        secret = b"ci-disposable-password-2026"
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w") as out:
            out.writestr("report.json", b'{"password":"' + secret + b'"}')
            out.writestr("image.png", b"\x89PNG\xff\xfe")
        html = (
            b"<template>data:application/zip;base64,"
            + base64.b64encode(archive.getvalue())
            + b"</template>"
        )
        result = redact(html)
        encoded = re.search(rb"base64,([A-Za-z0-9+/=]+)", result)[1]
        with zipfile.ZipFile(io.BytesIO(base64.b64decode(encoded))) as report:
            self.assertNotIn(secret, report.read("report.json"))
            self.assertEqual(report.read("image.png"), b"\x89PNG\xff\xfe")

    def test_tokens_and_query_link(self):
        result = redact(
            b'{"refresh_token":"opaque-secret"} /reset?token=random-secret&next=x '
            b"Bearer eyJabc.def.ghi"
        )
        self.assertNotIn(b"opaque-secret", result)
        self.assertNotIn(b"random-secret", result)
        self.assertNotIn(b"eyJabc.def.ghi", result)


if __name__ == "__main__":
    unittest.main()
