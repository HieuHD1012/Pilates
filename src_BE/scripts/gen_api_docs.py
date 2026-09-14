"""Sinh tài liệu API chi tiết từ chính ứng dụng.

Một bộ tài liệu API chép tay sẽ lệch với mã nguồn trong vài tuần, và
tài liệu lệch tệ hơn không có tài liệu: FE dựng xong màn hình rồi mới biết
trường đó không tồn tại. Nên phần **máy đọc được** — đường dẫn, tham số, kiểu
dữ liệu, ràng buộc, mã trạng thái — được sinh từ bản OpenAPI mà FastAPI dựng
từ chính các router và schema Pydantic.

Phần **người viết** — vì sao có endpoint này, chỗ nào dễ làm sai — nằm trong
khối ``<!-- ghi-chu -->`` và không bao giờ bị ghi đè. Đó là ranh giới: máy giữ
sự thật, người giữ ý nghĩa.

    uv run python -m scripts.gen_api_docs           # ghi tài liệu
    uv run python -m scripts.gen_api_docs --check   # chỉ báo lệch, không ghi

``--check`` chạy trong CI: đổi API mà quên sinh lại thì đỏ.
"""

from __future__ import annotations

import argparse
import importlib
import inspect
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi.params import Depends as DependsParam
from fastapi.routing import APIRoute

from app.core import permissions as perms
from app.main import app

DOCS_ROOT = Path(__file__).resolve().parents[2] / "docs/api"

#: Các router của ứng dụng, theo đúng thứ tự `main.py` gắn chúng.
API_MODULES = [
    "auth", "accounts", "public", "leads", "students", "progress_photos",
    "trainers", "announcements", "packages", "payments", "classes",
    "bookings", "my_schedule", "renewals", "reports",
]

#: Dependency phân quyền → nhãn dùng trong tài liệu.
AUTH_LABELS = {
    id(perms.require_admin): "ADMIN",
    id(perms.require_staff): "ADMIN, STAFF",
    id(perms.require_trainer): "TRAINER (chỉ lớp mình dạy)",
    id(perms.require_student): "STUDENT (chỉ của mình)",
    id(perms.get_current_actor): "đăng nhập",
}

PUBLIC = "công khai"

#: Route khai thẳng trên `app` chứ không qua router nào. Liệt kê tường minh:
#: đoán "công khai" cho một đường không tìm thấy là cách gán nhãn sai cho đúng
#: những endpoint nguy hiểm nhất.
APP_LEVEL_ROUTES: dict[tuple[str, str], str] = {("GET", "/health"): PUBLIC}

#: Tag OpenAPI → (thư mục, tên tiếng Việt). Tag do chính router khai, nên thêm
#: một nhóm endpoint mới mà quên khai ở đây sẽ dừng bộ sinh chứ không lặng lẽ
#: bỏ sót.
FEATURES: dict[str, tuple[str, str]] = {
    "auth": ("auth", "Xác thực & phiên đăng nhập"),
    "accounts": ("accounts", "Quản lý tài khoản"),
    "public": ("public", "Trang công khai"),
    "leads": ("leads", "Khách quan tâm"),
    "students": ("students", "Học viên"),
    "progress-photos": ("progress-photos", "Ảnh tiến trình"),
    "trainers": ("trainers", "Huấn luyện viên"),
    "announcements": ("announcements", "Thông báo"),
    "packages": ("packages", "Gói tập & sổ buổi"),
    "payments": ("payments", "Thanh toán"),
    "classes": ("classes", "Lớp & lịch"),
    "bookings": ("bookings", "Đăng ký lớp"),
    "my-schedule": ("my-schedule", "Lịch của học viên"),
    "renewals": ("renewals", "Nhắc gia hạn"),
    "reports": ("reports", "Báo cáo"),
    "meta": ("meta", "Hạ tầng"),
}

NOTE_START = "<!-- ghi-chu:start -->"
NOTE_END = "<!-- ghi-chu:end -->"
INDEX_START = "<!-- muc-luc:start -->"
INDEX_END = "<!-- muc-luc:end -->"

_GENERATED_BANNER = (
    "> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng "
    "`uv run python -m scripts.gen_api_docs`.\n"
    "> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — "
    "muốn đổi thì sửa mã nguồn rồi sinh lại."
)


# --- Bề mặt thật của ứng dụng ------------------------------------------------


def live_surface() -> dict[tuple[str, str], str]:
    """(method, path) → nhãn quyền, đọc thẳng từ router.

    Quyền của nhiều nhóm được khai ở **tầng router**
    (``APIRouter(dependencies=[Depends(require_admin)])``) nên không có trong
    chữ ký hàm. Bỏ sót chúng là ghi "công khai" cho những đường chỉ ADMIN mới
    vào được — sai kiểu đó nguy hiểm hơn thiếu hẳn.
    """
    surface: dict[tuple[str, str], str] = dict(APP_LEVEL_ROUTES)
    for name in API_MODULES:
        module = importlib.import_module(f"app.api.{name}")
        for attr in dir(module):
            if not attr.endswith("router"):
                continue
            router = getattr(module, attr)
            for route in getattr(router, "routes", []):
                if not isinstance(route, APIRoute):
                    continue
                label = PUBLIC
                for dependency in getattr(route, "dependencies", []):
                    found = AUTH_LABELS.get(id(getattr(dependency, "dependency", None)))
                    if found:
                        label = found
                for parameter in inspect.signature(route.endpoint).parameters.values():
                    default = parameter.default
                    if isinstance(default, DependsParam) and default.dependency:
                        found = AUTH_LABELS.get(id(default.dependency))
                        if found:
                            label = found
                for method in sorted(route.methods - {"HEAD", "OPTIONS"}):
                    surface[(method, route.path)] = label
    return surface


# --- Đọc OpenAPI -------------------------------------------------------------


@dataclass(frozen=True)
class Endpoint:
    method: str
    path: str
    tag: str
    summary: str
    description: str
    operation: dict[str, Any]
    auth: str

    @property
    def slug(self) -> str:
        body = self.path.strip("/").replace("{", "").replace("}", "").replace("_", "-")
        body = re.sub(r"[^a-zA-Z0-9/-]", "", body).replace("/", "-")
        return f"{self.method.lower()}-{body}" if body else self.method.lower()

    @property
    def vi_name(self) -> str:
        """Tên tiếng Việt của endpoint — dòng đầu docstring của chính route.

        Lùi về `summary` (do FastAPI sinh từ tên hàm, nên bằng tiếng Anh) chỉ
        khi route chưa có docstring. Khi thấy một tiêu đề tiếng Anh trong tài
        liệu thì chỗ cần sửa là docstring, không phải trang markdown.
        """
        if self.description:
            return self.description.splitlines()[0].strip().rstrip(".")
        return self.summary


def collect(spec: dict[str, Any]) -> list[Endpoint]:
    surface = live_surface()
    out: list[Endpoint] = []
    for path, item in spec["paths"].items():
        for method, operation in item.items():
            if method.upper() not in {"GET", "POST", "PATCH", "PUT", "DELETE"}:
                continue
            tag = (operation.get("tags") or ["meta"])[0]
            if tag not in FEATURES:
                raise SystemExit(f"Tag '{tag}' chưa khai trong FEATURES ({method} {path})")
            key = (method.upper(), path)
            if key not in surface:
                raise SystemExit(f"Không xác định được quyền của {method.upper()} {path}")
            out.append(
                Endpoint(
                    method=method.upper(),
                    path=path,
                    tag=tag,
                    summary=operation.get("summary", path),
                    description=(operation.get("description") or "").strip(),
                    operation=operation,
                    auth=surface[key],
                )
            )
    return sorted(out, key=lambda e: (list(FEATURES).index(e.tag), e.path, e.method))


# --- Diễn giải schema --------------------------------------------------------


class SchemaBook:
    """Tra cứu schema và ghi nhớ những schema đã được nhắc tới trong một trang.

    Một endpoint tham chiếu tới các schema lồng nhau; trang tài liệu phải tự
    đứng được nên chúng được trải ra ở cuối trang thay vì bắt người đọc nhảy
    sang file khác.
    """

    def __init__(self, spec: dict[str, Any]) -> None:
        self.schemas = spec["components"]["schemas"]
        self.seen: list[str] = []

    def reset(self) -> None:
        self.seen = []

    def resolve(self, schema: dict[str, Any]) -> dict[str, Any]:
        ref = schema.get("$ref")
        if not ref:
            return schema
        return self.schemas[ref.rsplit("/", 1)[-1]]

    def note(self, name: str) -> None:
        if name not in self.seen:
            self.seen.append(name)

    def render_type(self, schema: dict[str, Any] | None) -> str:
        """Kiểu dữ liệu viết cho người đọc, không phải JSON Schema thô."""
        if not schema:
            return "any"
        if ref := schema.get("$ref"):
            name = ref.rsplit("/", 1)[-1]
            target = self.schemas[name]
            if "enum" in target:
                return " \\| ".join(f"`{v}`" for v in target["enum"])
            self.note(name)
            return f"[{name}](#{name.lower()})"
        if any_of := (schema.get("anyOf") or schema.get("oneOf")):
            parts = [self.render_type(s) for s in any_of]
            return " \\| ".join(dict.fromkeys(parts))
        kind = schema.get("type")
        if kind == "array":
            return f"{self.render_type(schema.get('items'))}[]"
        if kind == "null":
            return "null"
        if "enum" in schema:
            return " \\| ".join(f"`{v}`" for v in schema["enum"])
        if kind == "string" and schema.get("format"):
            return f"string ({schema['format']})"
        return kind or "object"

    def constraints(self, schema: dict[str, Any]) -> str:
        """Ràng buộc lấy từ Pydantic — độ dài, khoảng giá trị, mẫu ký tự.

        Đây là phần FE hay phải đoán: biết trước `phone` có mẫu ký tự thì form
        kiểm tại chỗ thay vì đợi 422 dội về.
        """
        bits: list[str] = []
        for key, label in (
            ("minLength", "tối thiểu %s ký tự"),
            ("maxLength", "tối đa %s ký tự"),
            ("minimum", "≥ %s"),
            ("maximum", "≤ %s"),
            ("exclusiveMinimum", "> %s"),
            ("exclusiveMaximum", "< %s"),
        ):
            if key in schema:
                bits.append(label % schema[key])
        if pattern := schema.get("pattern"):
            bits.append(f"mẫu `{pattern}`")
        for sub in schema.get("anyOf", []):
            inner = self.constraints(sub)
            if inner:
                bits.append(inner)
        if "default" in schema and schema["default"] is not None:
            bits.append(f"mặc định `{schema['default']}`")
        return "; ".join(dict.fromkeys(bits))

    def describe(self, schema: dict[str, Any]) -> str:
        parts = [schema.get("description", "").strip().replace("\n", " ")]
        parts.append(self.constraints(schema))
        return " — ".join(p for p in parts if p) or "—"

    def fields(self, schema: dict[str, Any]) -> list[tuple[str, str, str, str]]:
        schema = self.resolve(schema)
        required = set(schema.get("required", []))
        rows = []
        for name, prop in (schema.get("properties") or {}).items():
            rows.append(
                (
                    name,
                    self.render_type(prop),
                    "Có" if name in required else "Không",
                    self.describe(prop),
                )
            )
        return rows

    def example(self, schema: dict[str, Any] | None, depth: int = 0) -> Any:
        """Một giá trị mẫu đúng hình dạng, để FE dán thẳng vào `curl`."""
        if not schema or depth > 4:
            return None
        schema = self.resolve(schema)
        if "enum" in schema:
            return schema["enum"][0]
        if any_of := (schema.get("anyOf") or schema.get("oneOf")):
            concrete = [s for s in any_of if s.get("type") != "null"]
            return self.example(concrete[0], depth + 1) if concrete else None
        kind = schema.get("type")
        if kind == "object" or "properties" in schema:
            return {
                name: self.example(prop, depth + 1)
                for name, prop in (schema.get("properties") or {}).items()
            }
        if kind == "array":
            return [self.example(schema.get("items"), depth + 1)]
        if kind == "integer":
            return 1
        if kind == "number":
            return 1.0
        if kind == "boolean":
            return True
        if kind == "null":
            return None
        fmt = schema.get("format")
        return {
            "date-time": "2026-09-14T06:00:00+07:00",
            "date": "2026-09-14",
            "email": "hocvien@example.com",
            "decimal": "1500000",
            "binary": "<file>",
        }.get(fmt, "string")


# --- Dựng trang markdown -----------------------------------------------------


def _table(header: list[str], rows: list[tuple[str, ...]]) -> str:
    line = "| " + " | ".join(header) + " |"
    sep = "|" + "|".join("---" for _ in header) + "|"
    body = "\n".join("| " + " | ".join(str(c) for c in row) + " |" for row in rows)
    return "\n".join([line, sep, body])


def _json_block(value: Any) -> str:
    return "```json\n" + json.dumps(value, ensure_ascii=False, indent=2) + "\n```"


def _preserved_note(path: Path) -> str:
    """Giữ nguyên phần người viết khi sinh lại."""
    if not path.exists():
        return "_Chưa có ghi chú nghiệp vụ cho endpoint này._"
    text = path.read_text()
    if NOTE_START in text and NOTE_END in text:
        return text.split(NOTE_START, 1)[1].split(NOTE_END, 1)[0].strip()
    return "_Chưa có ghi chú nghiệp vụ cho endpoint này._"


def _auth_sentence(auth: str) -> str:
    if auth == PUBLIC:
        return "Không cần đăng nhập"
    if auth == "đăng nhập":
        return "`Authorization: Bearer <access_token>` — mọi vai đã đăng nhập"
    return f"`Authorization: Bearer <access_token>` — vai **{auth}**"


def render_endpoint(endpoint: Endpoint, book: SchemaBook, target: Path) -> str:
    book.reset()
    op = endpoint.operation
    params = op.get("parameters", [])
    path_params = [p for p in params if p["in"] == "path"]
    query_params = [p for p in params if p["in"] == "query"]
    body = op.get("requestBody")

    out: list[str] = [
        f"# API: {endpoint.vi_name}",
        "",
        _GENERATED_BANNER,
        "",
        "## 1. Overview",
        "",
        f"- **Purpose:** {endpoint.description.splitlines()[0] if endpoint.description else '—'}",
        f"- **Method:** `{endpoint.method}`",
        f"- **Endpoint:** `{endpoint.path}`",
        f"- **Auth:** {_auth_sentence(endpoint.auth)}",
    ]
    rest = "\n".join(endpoint.description.splitlines()[1:]).strip()
    if rest:
        out += ["", rest]

    out += ["", "## 2. Request", ""]

    headers = [("`Authorization`", "Có" if endpoint.auth != PUBLIC else "Không",
                "`Bearer <access_token>`")]
    if body:
        content = list(body.get("content", {})) or ["application/json"]
        headers.append(("`Content-Type`", "Có", f"`{content[0]}`"))
    out += ["### Headers", "", _table(["Key", "Required", "Description"], headers), ""]

    out += ["### Path Params", ""]
    if path_params:
        out += [_table(
            ["Name", "Type", "Required", "Description"],
            [(f"`{p['name']}`", book.render_type(p.get("schema")),
              "Có" if p.get("required") else "Không", book.describe(p.get("schema", {})))
             for p in path_params],
        ), ""]
    else:
        out += ["Không có.", ""]

    out += ["### Query Params", ""]
    if query_params:
        out += [_table(
            ["Name", "Type", "Required", "Description"],
            [(f"`{p['name']}`", book.render_type(p.get("schema")),
              "Có" if p.get("required") else "Không", book.describe(p.get("schema", {})))
             for p in query_params],
        ), ""]
    else:
        out += ["Không có.", ""]

    out += ["### Request Body", ""]
    if body:
        media, content = next(iter(body.get("content", {}).items()))
        schema = content.get("schema", {})
        rows = book.fields(schema)
        if not rows:
            out += ["Xem mô tả ở phần Overview.", ""]
        elif media == "application/json":
            out += [_json_block(book.example(schema)), "",
                    _table(["Field", "Type", "Required", "Description"], rows), ""]
        else:
            # Body `multipart/form-data` không phải JSON; in ví dụ JSON ở đây là
            # chỉ cho FE một hình dạng không gửi được.
            out += [f"Gửi dạng `{media}` với các trường sau:", "",
                    _table(["Field", "Type", "Required", "Description"], rows), ""]
    else:
        out += ["Không có.", ""]

    out += ["## 3. Response", ""]
    for status, response in sorted(op.get("responses", {}).items()):
        if status == "422":
            continue
        schema = (next(iter(response.get("content", {}).values()), {}) or {}).get("schema")
        out += [f"### `{status}`", ""]
        if not schema:
            out += ["Không có nội dung.", ""]
            continue
        rows = book.fields(schema) if not schema.get("type") == "array" else []
        out += [_json_block(book.example(schema)), ""]
        if rows:
            out += [_table(["Field", "Type", "Required", "Description"], rows), ""]
        elif schema.get("type") == "array":
            out += [f"Mảng `{book.render_type(schema.get('items'))}`.", ""]

    out += [
        "### Lỗi",
        "",
        "Mọi lỗi nghiệp vụ dùng chung hình dạng "
        "`{ \"detail\": { \"code\": ..., \"message\": ... } }`; `message` đã viết sẵn "
        "tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở "
        "[quy ước chung](../README.md#quy-ước-lỗi).",
        "",
    ]

    out += ["## 4. Ghi chú", "", NOTE_START, _preserved_note(target), NOTE_END, ""]

    # Schema lồng nhau có thể kéo theo schema khác; lặp cho tới khi không phát
    # sinh tên mới nữa, nếu không trang sẽ có liên kết trỏ vào chỗ trống.
    rendered: list[str] = []
    index = 0
    while index < len(book.seen):
        name = book.seen[index]
        index += 1
        schema = book.schemas[name]
        rows = book.fields(schema)
        rendered += [f"### {name}", ""]
        rendered += [_table(["Field", "Type", "Required", "Description"], rows) if rows
                     else "_Không có trường._", ""]
    if rendered:
        out += ["## 5. Kiểu dữ liệu lồng nhau", ""] + rendered

    return "\n".join(out).rstrip() + "\n"


def render_index(endpoints: list[Endpoint], base: str = "") -> str:
    """Bảng endpoint — nguồn duy nhất, sinh từ router nên không trôi lệch."""
    rows = [
        (
            f"`{e.method}`",
            f"`{e.path}`",
            e.auth,
            f"[chi tiết]({base}{FEATURES[e.tag][0]}/{e.slug}.md)",
        )
        for e in endpoints
    ]
    return _table(["Method", "Đường dẫn", "Quyền", ""], rows)


def _replace_block(text: str, start: str, end: str, payload: str) -> str:
    head, _, rest = text.partition(start)
    _, _, tail = rest.partition(end)
    return f"{head}{start}\n{payload}\n{end}{tail}"


def render_feature_readme(tag: str, endpoints: list[Endpoint], target: Path) -> str:
    folder, title = FEATURES[tag]
    index = render_index(endpoints, base="../")
    # Liên kết trong README của chính nhóm không cần đi lên một cấp.
    index = index.replace(f"](../{folder}/", "](")
    if target.exists() and INDEX_START in target.read_text():
        return _replace_block(target.read_text(), INDEX_START, INDEX_END, index)
    return "\n".join([
        f"# {title}",
        "",
        "_Mô tả nghiệp vụ của nhóm này chưa được viết._",
        "",
        "## Endpoint",
        "",
        INDEX_START,
        index,
        INDEX_END,
        "",
    ])


# --- Ghi ra đĩa --------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="Chỉ báo tài liệu đã lệch, không ghi gì")
    args = parser.parse_args(argv)

    spec = app.openapi()
    book = SchemaBook(spec)
    endpoints = collect(spec)

    planned: dict[Path, str] = {}
    for endpoint in endpoints:
        folder = DOCS_ROOT / FEATURES[endpoint.tag][0]
        target = folder / f"{endpoint.slug}.md"
        planned[target] = render_endpoint(endpoint, book, target)

    for tag in FEATURES:
        group = [e for e in endpoints if e.tag == tag]
        if not group:
            continue
        target = DOCS_ROOT / FEATURES[tag][0] / "README.md"
        planned[target] = render_feature_readme(tag, group, target)

    root = DOCS_ROOT / "README.md"
    sections: list[str] = []
    for tag in FEATURES:
        group = [e for e in endpoints if e.tag == tag]
        if not group:
            continue
        folder, title = FEATURES[tag]
        sections += [f"### [{title}]({folder}/README.md)", "", render_index(group), ""]
    payload = "\n".join(sections).rstrip()
    if root.exists() and INDEX_START in root.read_text():
        planned[root] = _replace_block(root.read_text(), INDEX_START, INDEX_END, payload)

    stale: list[Path] = []
    for target, content in planned.items():
        current = target.read_text() if target.exists() else None
        if current == content:
            continue
        stale.append(target)
        if not args.check:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)

    if args.check and stale:
        print("Tài liệu API đã lệch với mã nguồn:", file=sys.stderr)
        for target in stale:
            print(f"  {target}", file=sys.stderr)
        print("Chạy: uv run python -m scripts.gen_api_docs", file=sys.stderr)
        return 1
    if not args.check:
        print(f"{len(endpoints)} endpoint · {len(planned)} tệp · cập nhật {len(stale)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
