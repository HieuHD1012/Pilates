"""Read a browser-downloaded CSV/XLSX for comparison with the live API query."""

import csv
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

path = Path(sys.argv[1])
if path.suffix == ".csv":
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.reader(stream))
elif path.suffix == ".xlsx":
    workbook = load_workbook(path, read_only=True, data_only=False)
    rows = [["" if cell is None else str(cell) for cell in row] for row in workbook.active.values]
else:
    raise SystemExit("Expected CSV or XLSX test export")
print(json.dumps(rows, ensure_ascii=False))
