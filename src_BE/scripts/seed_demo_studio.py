"""Dựng một studio DEMO đầy đủ để bấm thử từng màn hình của frontend.

    docker compose up -d db mailpit
    uv run alembic upgrade head
    SEED_ADMIN_EMAIL=admin@soulpilates.vn SEED_ADMIN_PASSWORD=... \
        uv run python -m scripts.seed_admin
    uv run uvicorn app.main:app --port 8099
    SEED_ADMIN_EMAIL=admin@soulpilates.vn SEED_ADMIN_PASSWORD=... \
        uv run python -m scripts.seed_demo_studio --base-url http://127.0.0.1:8099

Script **gọi qua HTTP**, không đụng thẳng vào ORM như các script còn lại trong
thư mục này. Cố ý: dữ liệu dựng ra phải đi qua đúng những quy tắc mà frontend
sẽ gặp — chỉ học viên tự đăng ký lớp của mình, HLV chỉ điểm danh sau giờ tan
lớp, bán gói và ghi thu là hai bước. Dữ liệu nặn thẳng vào bảng sẽ dựng được
những trạng thái mà API không bao giờ tạo ra, và màn hình đầu tiên đọc phải
chúng là màn hình đầu tiên nói dối.

Hai chốt an toàn: từ chối chạy khi `ENVIRONMENT=prod`, và từ chối chạy khi
studio đã có học viên — seed lần hai sẽ nhân đôi gói và sổ buổi.

Mọi người trong đây đều có tên bắt đầu bằng "DEMO" ở ghi chú hồ sơ, và email
dùng `example.com`, để không ai nhầm với người thật.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.config import get_settings

#: Giờ studio. Việt Nam không có DST nên độ lệch là hằng số.
STUDIO_TZ = timezone(timedelta(hours=7))

#: Mật khẩu chung cho mọi tài khoản demo. Chỉ dùng ở máy dev.
DEMO_PASSWORD = "SoulPilates2026!"

TRAINERS = [
    (
        "Nguyễn Thu Hà",
        "0905123001",
        "Mười năm dạy Pilates thiết bị, chuyên phục hồi cột sống.",
        "Reformer, Phục hồi cột sống",
    ),
    (
        "Trần Minh Anh",
        "0905123002",
        "Huấn luyện viên Mat Pilates, làm việc nhiều với người mới bắt đầu.",
        "Mat, Người mới bắt đầu",
    ),
    (
        "Lê Khánh Vy",
        "0905123003",
        "Chuyên Pilates trước và sau sinh.",
        "Tiền sản, Hậu sản",
    ),
]

PACKAGE_TYPES = [
    ("Gói 10 buổi nhóm", "3500000.00", 10, 90, "GROUP"),
    ("Gói 20 buổi nhóm", "6500000.00", 20, 180, "GROUP"),
    ("Gói 8 buổi riêng", "8000000.00", 8, 90, "PRIVATE"),
    ("Thẻ lẻ 1 buổi nhóm", "420000.00", 1, 30, "GROUP"),
]

STUDENTS = [
    ("Đặng Thanh Mai", "0912000001", "mai@example.com", "1994-03-12", "Đau lưng dưới."),
    ("Vũ Hồng Nhung", "0912000002", "nhung@example.com", "1990-07-02", None),
    ("Bùi Quốc Bảo", "0912000003", None, "1988-11-25", "Vận động viên chạy bộ."),
    ("Hoàng Lan Chi", "0912000004", "chi@example.com", None, None),
    ("Ngô Thùy Dương", "0912000005", None, "1996-01-08", "Mới sinh 6 tháng."),
    ("Phan Gia Huy", "0912000006", "huy@example.com", "1992-05-30", None),
]

#: (chỉ số học viên, tên gói, số tiền, hình thức trả, đã xác nhận chưa)
SALES = [
    (0, "Gói 20 buổi nhóm", "6500000.00", "TRANSFER", True),
    (1, "Gói 10 buổi nhóm", "3500000.00", "CASH", True),
    (2, "Gói 8 buổi riêng", "8000000.00", "TRANSFER", False),
    (3, "Gói 10 buổi nhóm", "3500000.00", "CASH", True),
    (4, "Thẻ lẻ 1 buổi nhóm", "420000.00", "CASH", True),
]

LEADS = [
    ("Trịnh Mỹ Linh", "0987000011", "Muốn tập giảm đau vai gáy, buổi tối sau 18h."),
    ("Đỗ Anh Tuấn", "0987000012", "Hỏi giá gói 1 kèm 1 và lịch trống cuối tuần."),
    ("Lý Thu Trang", "0987000013", None),
]


class ApiError(RuntimeError):
    pass


class Api:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.token: str | None = None

    def __call__(
        self, method: str, path: str, body: Any = None, *, token: str | None = None
    ) -> Any:
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(self.base_url + path, data=data, method=method)
        if data is not None:
            request.add_header("Content-Type", "application/json")
        bearer = token if token is not None else self.token
        if bearer:
            request.add_header("Authorization", f"Bearer {bearer}")
        try:
            with urllib.request.urlopen(request) as response:
                return json.loads(response.read() or b"null")
        except urllib.error.HTTPError as error:
            raise ApiError(f"{method} {path} → {error.code} {error.read().decode()}") from error

    def login(self, email: str, password: str) -> str:
        return self("POST", "/auth/login", {"email": email, "password": password})[
            "access_token"
        ]


def studio_instant(day: date, hour: int, minute: int = 0) -> str:
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=STUDIO_TZ).isoformat()


def seed(api: Api, today: date) -> dict[str, Any]:
    trainer_ids = [
        api(
            "POST",
            "/trainers",
            {
                "full_name": name,
                "phone": phone,
                "bio": bio,
                "specialties": specialties,
                "is_public": True,
            },
        )["id"]
        for name, phone, bio, specialties in TRAINERS
    ]

    staff = api(
        "POST",
        "/accounts",
        {
            "email": "letan@soulpilates.vn",
            "full_name": "Phạm Lễ Tân",
            "phone": "0905123010",
            "role": "STAFF",
            "password": DEMO_PASSWORD,
        },
    )
    trainer_account = api(
        "POST",
        "/accounts",
        {
            "email": "hlv@soulpilates.vn",
            "full_name": TRAINERS[0][0],
            "phone": TRAINERS[0][1],
            "role": "TRAINER",
            "password": DEMO_PASSWORD,
        },
    )
    # Hồ sơ HLV nối với tài khoản qua `user_id`; thiếu bước này thì người đăng
    # nhập bằng vai TRAINER không có lớp nào để dạy.
    api("PATCH", f"/trainers/{trainer_ids[0]}", {"user_id": trainer_account["id"]})

    type_ids: dict[str, int] = {}
    for name, price, credits, days, class_type in PACKAGE_TYPES:
        type_ids[name] = api(
            "POST",
            "/package-types",
            {
                "name": name,
                "price": price,
                "credits": credits,
                "duration_days": days,
                "class_type": class_type,
                "is_selling": True,
            },
        )["id"]

    student_ids: list[int] = []
    for full_name, phone, email, dob, note in STUDENTS:
        payload: dict[str, Any] = {"full_name": full_name, "phone": phone}
        if email:
            payload["email"] = email
        if dob:
            payload["dob"] = dob
        if note:
            payload["note"] = note
        student_ids.append(api("POST", "/students", payload)["id"])

    student_accounts = [
        api(
            "POST",
            "/accounts",
            {
                "email": STUDENTS[index][2],
                "full_name": STUDENTS[index][0],
                "phone": STUDENTS[index][1],
                "role": "STUDENT",
                "student_id": student_ids[index],
                "password": DEMO_PASSWORD,
            },
        )["id"]
        for index in (0, 1)
    ]
    # Một tài khoản bỏ trống mật khẩu: đó là trạng thái PENDING_ACTIVATION mà
    # màn hình Tài khoản phải hiển thị được.
    pending = api(
        "POST",
        "/accounts",
        {
            "email": STUDENTS[3][2],
            "full_name": STUDENTS[3][0],
            "role": "STUDENT",
            "student_id": student_ids[3],
        },
    )

    package_ids: list[int] = []
    for index, type_name, amount, method, confirmed in SALES:
        package = api(
            "POST",
            "/packages/sell",
            {
                "student_id": student_ids[index],
                "package_type_id": type_ids[type_name],
                "start_date": str(today - timedelta(days=10)),
            },
        )
        package_ids.append(package["id"])
        payment = api(
            "POST",
            "/payments",
            {
                "student_package_id": package["id"],
                "amount": amount,
                "method": method,
                "note": None,
            },
        )
        # Một khoản cố ý để chờ: báo cáo "thanh toán chưa xác nhận" cần có số.
        if confirmed:
            api("POST", f"/payments/{payment['id']}/confirm")

    session_ids: list[int] = []
    for offset in range(-3, 12):
        day = today + timedelta(days=offset)
        if day.weekday() == 6:  # studio nghỉ Chủ nhật
            continue
        session_ids.append(
            api(
                "POST",
                "/classes",
                {
                    "starts_at": studio_instant(day, 6, 30),
                    "ends_at": studio_instant(day, 7, 30),
                    "trainer_id": trainer_ids[0],
                    "class_type": "GROUP",
                    "capacity": 8,
                },
            )["id"]
        )
        session_ids.append(
            api(
                "POST",
                "/classes",
                {
                    "starts_at": studio_instant(day, 18, 0),
                    "ends_at": studio_instant(day, 19, 0),
                    "trainer_id": trainer_ids[1],
                    "class_type": "GROUP",
                    "capacity": 10,
                },
            )["id"]
        )
        if day.weekday() in (1, 3):
            session_ids.append(
                api(
                    "POST",
                    "/classes",
                    {
                        "starts_at": studio_instant(day, 9, 0),
                        "ends_at": studio_instant(day, 10, 0),
                        "trainer_id": trainer_ids[2],
                        "class_type": "PRIVATE",
                        "capacity": 1,
                    },
                )["id"]
            )

    for title, body, published in [
        (
            "Lịch nghỉ lễ Quốc khánh",
            "Studio nghỉ ngày 02/09 và mở lại từ 03/09. Buổi đã đặt trong ngày nghỉ "
            "được hoàn vào gói.",
            True,
        ),
        (
            "Lớp Reformer buổi sáng mở thêm khung 6:30",
            "Từ tuần này studio mở thêm lớp Reformer 6:30 sáng các ngày trong tuần.",
            True,
        ),
        ("Bản nháp: chương trình giới thiệu bạn bè", "Nội dung đang chờ duyệt.", False),
    ]:
        api(
            "POST",
            "/announcements",
            {"title": title, "body": body, "is_published": published},
        )

    for full_name, phone, need in LEADS:
        payload = {"full_name": full_name, "phone": phone}
        if need:
            payload["need"] = need
        # Form công khai, không kèm token — đúng như khách để lại số trên web.
        api("POST", "/public/leads", payload, token="")

    # Học viên tự đăng ký lớp của mình. ADMIN không đặt hộ được, và đó là quy
    # tắc chứ không phải thiếu sót, nên seed cũng phải đi đường đó.
    booked = 0
    for email, want in ((STUDENTS[0][2], 5), (STUDENTS[1][2], 3)):
        token = api.login(str(email), DEMO_PASSWORD)
        for session_id in api("GET", "/my-schedule/bookable?limit=50", token=token)[:want]:
            api("POST", "/bookings", {"class_session_id": session_id}, token=token)
            booked += 1

    return {
        "trainers": trainer_ids,
        "students": student_ids,
        "classes": len(session_ids),
        "packages": package_ids,
        "bookings": booked,
        "accounts": {
            "staff": staff["id"],
            "trainer": trainer_account["id"],
            "students": student_accounts,
            "pending": pending["id"],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()

    settings = get_settings()
    if settings.environment == "prod":
        print("Không dựng dữ liệu demo trên PROD.", file=sys.stderr)
        return 1
    if not settings.seed_admin_email or not settings.seed_admin_password:
        print("Cần SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD để đăng nhập ADMIN.", file=sys.stderr)
        return 1

    api = Api(args.base_url)
    try:
        api.token = api.login(settings.seed_admin_email, settings.seed_admin_password)
    except ApiError as error:
        print(f"Không đăng nhập được ADMIN: {error}", file=sys.stderr)
        return 1

    if api("GET", "/students?limit=1"):
        print(
            "Studio đã có học viên — dừng lại. Chạy lần hai sẽ nhân đôi gói và sổ buổi.",
            file=sys.stderr,
        )
        return 1

    today = datetime.now(STUDIO_TZ).date()
    try:
        summary = seed(api, today)
    except ApiError as error:
        print(f"Dừng giữa chừng: {error}", file=sys.stderr)
        return 1

    print(f"Đã dựng studio demo: {json.dumps(summary, ensure_ascii=False)}")
    print(f"\nMật khẩu chung: {DEMO_PASSWORD}")
    print(f"  ADMIN   {settings.seed_admin_email} (mật khẩu SEED_ADMIN_PASSWORD)")
    print("  STAFF   letan@soulpilates.vn")
    print("  TRAINER hlv@soulpilates.vn")
    print(f"  STUDENT {STUDENTS[0][2]} · {STUDENTS[1][2]}")
    print(f"  chưa kích hoạt: {STUDENTS[3][2]} — đặt mật khẩu qua liên kết email")
    print(
        "\nMàn điểm danh của HLV cần một lớp ĐÃ TAN mà vẫn có người đăng ký, và"
        "\nkhông có đường nào qua API dựng được trạng thái đó: lớp đã bắt đầu thì"
        "\nkhông đặt được, và studio không dời được giờ lớp. Muốn thử thì tự lùi"
        "\ngiờ một lớp đã có người đặt, ngay trên CSDL dev:"
        "\n"
        "\n  update class_session set starts_at = now() - interval '3 hours',"
        "\n                           ends_at   = now() - interval '2 hours'"
        "\n  where id = (select b.class_session_id from booking b"
        "\n                join class_session cs on cs.id = b.class_session_id"
        "\n                join trainer t on t.id = cs.trainer_id"
        "\n               where t.user_id is not null order by b.id limit 1);"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
