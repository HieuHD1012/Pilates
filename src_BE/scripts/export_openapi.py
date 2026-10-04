"""Export the running backend contract without needing a database connection."""

import json
import sys
from pathlib import Path

from app.main import app

if __name__ == "__main__":
    destination = Path(sys.argv[1])
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(app.openapi(), ensure_ascii=False), encoding="utf-8")
