"""Dựng một studio đầy đủ qua chính API — nền cho kịch bản đầu-cuối.

Tách khỏi file test vì phần dựng dữ liệu dài hơn phần kiểm, và trộn hai thứ
vào một chỗ thì mỗi lần một bước kiểm đỏ lại phải đọc lướt qua sáu chục dòng
seed để tìm xem dữ liệu nào đang nói chuyện.

Dàn nhân vật cố định — 1 admin, 3 HLV, 8 học viên — và **mỗi học viên đại
diện một trạng thái khác nhau** của hệ: gói bình thường, gói chưa thu tiền,
gói Private, gói sắp hết buổi, gói sắp hết hạn, chưa có gói, gói dùng cho
lớp đầy, gói bị huỷ giao dịch. Một studio có đủ tám trạng thái đó là studio
mà mọi nhánh nghiệp vụ đều có dữ liệu thật để chạy qua.

Mọi dữ liệu đi qua HTTP, kể cả admin cấp và nối tài khoản học viên.
Ngoại lệ duy nhất là tài khoản admin đầu tiên, đúng như `scripts/seed_admin.py`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.rules import ClassType, Role, now, today
from tests.conftest import TEST_PASSWORD, auth_header, login, make_user

ADMIN_EMAIL = "quanly@example.com"


@dataclass(frozen=True)
class ApiUser:
    """Một người thật kèm token — request nào cũng có danh tính rõ ràng.

    Bọc `TestClient` thay vì truyền cặp (client, token) đi khắp nơi: gần như
    mọi khẳng định của kịch bản là "ai làm gì", và một lời gọi đọc được thành
    câu đúng như thế thì khó gắn nhầm token của người khác.
    """

    client: TestClient
    token: str
    user_id: int
    label: str

    def get(self, path: str, **params: Any):
        return self.client.get(path, headers=self._headers, params=params or None)

    def post(self, path: str, json: Any = None):
        return self.client.post(path, json=json, headers=self._headers)

    def patch(self, path: str, json: Any):
        return self.client.patch(path, json=json, headers=self._headers)

    def delete(self, path: str):
        return self.client.delete(path, headers=self._headers)

    def upload(self, path: str, files: Any, data: Any = None):
        return self.client.post(path, files=files, data=data, headers=self._headers)

    @property
    def _headers(self) -> dict[str, str]:
        return auth_header(self.token)


@dataclass
class Studio:
    """Toàn bộ dàn nhân vật và dữ liệu của kịch bản."""

    admin: ApiUser
    #: HLV theo khoá: `mai`, `ha`, `bao`.
    trainers: dict[str, ApiUser] = field(default_factory=dict)
    trainer_ids: dict[str, int] = field(default_factory=dict)
    #: Học viên theo khoá: `lan`, `minh`, `trang`, `huy`, `phuong`, `nam`,
    #: `ngan`, `yen`.
    students: dict[str, ApiUser] = field(default_factory=dict)
    student_ids: dict[str, int] = field(default_factory=dict)
    package_type_ids: dict[str, int] = field(default_factory=dict)
    #: Gói đã bán, theo khoá học viên.
    package_ids: dict[str, int] = field(default_factory=dict)
    payment_ids: dict[str, int] = field(default_factory=dict)
    session_ids: dict[str, int] = field(default_factory=dict)
    lead_id: int | None = None


# --- Trợ giúp khẳng định mã trạng thái ---------------------------------------


def created(response) -> dict:
    assert response.status_code == 201, response.text
    return response.json()


def ok(response) -> dict:
    assert response.status_code == 200, response.text
    return response.json()


def fails(response, code: str, status: int = 409) -> dict:
    """Khẳng định cả mã HTTP lẫn **mã nghiệp vụ**.

    Chỉ kiểm mã HTTP là để lọt đúng loại lỗi nguy hiểm nhất: một 409 đúng số
    nhưng sai lý do (hết chỗ thay vì hết buổi) thì giao diện nói sai với học
    viên, và test vẫn xanh.
    """
    assert response.status_code == status, response.text
    body = response.json()
    assert body["detail"]["code"] == code, response.text
    return body


# --- Dựng sân khấu ------------------------------------------------------------


def _account(
    admin: ApiUser,
    *,
    email: str,
    full_name: str,
    role: Role,
    phone: str,
    student_id: int | None = None,
) -> int:
    body = created(
        admin.post(
            "/accounts",
            {
                "email": email,
                "full_name": full_name,
                "phone": phone,
                "role": role.value,
                "password": TEST_PASSWORD,
                "student_id": student_id,
            },
        )
    )
    return body["id"]


def _as_user(client: TestClient, email: str, user_id: int, label: str) -> ApiUser:
    tokens = login(client, email)
    return ApiUser(client=client, token=tokens["access_token"], user_id=user_id, label=label)


def _class_session(
    admin: ApiUser,
    *,
    trainer_id: int,
    starts_at: datetime,
    class_type: ClassType = ClassType.GROUP,
    capacity: int | None = None,
    hours: int = 1,
) -> int:
    body = created(
        admin.post(
            "/classes",
            {
                "starts_at": starts_at.isoformat(),
                "ends_at": (starts_at + timedelta(hours=hours)).isoformat(),
                "trainer_id": trainer_id,
                "class_type": class_type.value,
                "capacity": capacity,
            },
        )
    )
    return body["id"]


def _sell(admin: ApiUser, student_id: int, type_id: int, start_date=None) -> int:
    payload: dict[str, Any] = {"student_id": student_id, "package_type_id": type_id}
    if start_date is not None:
        payload["start_date"] = start_date.isoformat()
    return created(admin.post("/packages/sell", payload))["id"]


def _pay(admin: ApiUser, package_id: int, amount: str, method: str = "CASH") -> int:
    return created(
        admin.post(
            "/payments",
            {"student_package_id": package_id, "amount": amount, "method": method},
        )
    )["id"]


def build_studio(db: Session, client: TestClient) -> Studio:
    """Dựng toàn bộ studio qua API, trừ tài khoản admin đầu tiên."""
    admin_user = make_user(db, Role.ADMIN, email=ADMIN_EMAIL)
    studio = Studio(admin=_as_user(client, ADMIN_EMAIL, admin_user.id, "admin"))
    admin = studio.admin

    _build_trainers(client, studio)
    _build_students(client, studio)
    _build_package_types(admin, studio)
    _build_money(admin, studio)
    _build_schedule(admin, studio)
    _build_announcements(admin)
    return studio


def _build_trainers(client: TestClient, studio: Studio) -> None:
    """Ba HLV, khác nhau **chỉ ở cờ `is_public`**.

    `is_public` quyết định HLV có hiện trên `/public/trainers` hay không, và
    không liên quan gì tới loại lớp: HLV không chia Group/Private, ai cũng dạy
    được cả hai. Để hai người `True` và một người `False` là để kịch bản trang
    công khai có cái để kiểm — cả ba cùng `True` thì phép lọc không chứng minh
    được gì.
    """
    spec = [
        ("mai", "Ngọc Mai", "hlv.mai@example.com", "0911000001", True, "Reformer, cột sống"),
        ("ha", "Thu Hà", "hlv.ha@example.com", "0911000002", True, "Tiền sản, hậu sản"),
        ("bao", "Quốc Bảo", "hlv.bao@example.com", "0911000003", False, "Mat Pilates"),
    ]
    for key, name, email, phone, is_public, specialties in spec:
        account_id = _account(
            studio.admin, email=email, full_name=f"HLV {name}", role=Role.TRAINER, phone=phone
        )
        trainer = created(
            studio.admin.post(
                "/trainers",
                {
                    "full_name": f"HLV {name}",
                    "phone": phone,
                    "bio": f"{name} dạy tại studio từ 2019.",
                    "specialties": specialties,
                    "is_public": is_public,
                    "user_id": account_id,
                },
            )
        )
        studio.trainer_ids[key] = trainer["id"]
        studio.trainers[key] = _as_user(client, email, account_id, f"hlv-{key}")


#: Bảy học viên nhập thẳng; người thứ tám đến từ form tư vấn công khai.
_STUDENT_SPEC = [
    ("lan", "Nguyễn Thị Lan", "0901000001"),
    ("minh", "Trần Văn Minh", "0901000002"),
    ("trang", "Lê Thu Trang", "0901000003"),
    ("huy", "Phạm Quốc Huy", "0901000004"),
    ("phuong", "Đỗ Mai Phương", "0901000005"),
    ("nam", "Vũ Hoàng Nam", "0901000006"),
    ("ngan", "Bùi Kim Ngân", "0901000007"),
]

#: Người thứ tám: khách để lại số trên web rồi được nhân viên chuyển thành
#: học viên. Đi đúng đường thật thay vì tạo thẳng, vì đó là đường khách hàng
#: mới vào hệ thống nhiều nhất.
LEAD_SPEC = ("yen", "Hoàng Thị Yến", "0901000008")


def _build_students(client: TestClient, studio: Studio) -> None:
    admin = studio.admin
    for key, name, phone in _STUDENT_SPEC:
        student = created(
            admin.post(
                "/students",
                {
                    "full_name": name,
                    "phone": phone,
                    "email": f"{key}@example.com",
                    "note": "Khách quen" if key == "lan" else None,
                },
            )
        )
        studio.student_ids[key] = student["id"]

    key, name, phone = LEAD_SPEC
    assert (
        client.post(
            "/public/leads",
            json={
                "full_name": name,
                "phone": phone,
                "need": "Muốn tập giảm đau lưng",
                "source": "facebook",
            },
        ).status_code
        == 201
    )
    lead = ok(admin.get("/leads", q=phone))[0]
    studio.lead_id = lead["id"]
    studio.student_ids[key] = created(admin.post(f"/leads/{lead['id']}/convert"))["id"]

    for key in studio.student_ids:
        email = f"{key}@example.com"
        account_id = _account(
            admin,
            email=email,
            full_name=f"Học viên {key}",
            role=Role.STUDENT,
            phone=f"0901{studio.student_ids[key]:06d}",
            student_id=studio.student_ids[key],
        )
        studio.students[key] = _as_user(client, email, account_id, f"hv-{key}")


def _build_package_types(admin: ApiUser, studio: Studio) -> None:
    """Năm loại gói, gồm cả hai ca biên của trang công khai.

    `thu1` ngừng bán và `khong_gia` chưa có giá: trang công khai phải giấu
    cái đầu và để trống có nhãn cho cái sau, chứ không được bịa ra số 0.
    """
    spec = [
        ("group10", "Gói 10 buổi Group", "2500000.00", 10, 90, ClassType.GROUP, True),
        ("group20", "Gói 20 buổi Group", "4500000.00", 20, 180, ClassType.GROUP, True),
        ("private5", "Gói 5 buổi Private", "3000000.00", 5, 60, ClassType.PRIVATE, True),
        ("thu1", "Gói thử 1 buổi", "300000.00", 1, 7, ClassType.GROUP, False),
        ("khong_gia", "Gói 8 buổi liên hệ giá", None, 8, 60, ClassType.GROUP, True),
    ]
    for key, name, price, credits, days, class_type, is_selling in spec:
        body = created(
            admin.post(
                "/package-types",
                {
                    "name": name,
                    "price": price,
                    "credits": credits,
                    "duration_days": days,
                    "class_type": class_type.value,
                    "is_selling": is_selling,
                },
            )
        )
        studio.package_type_ids[key] = body["id"]


def _build_money(admin: ApiUser, studio: Studio) -> None:
    """Gói và tiền của tám học viên — tám trạng thái khác nhau."""
    types, students = studio.package_type_ids, studio.student_ids
    packages, payments = studio.package_ids, studio.payment_ids

    # Lan: gói lớn, tiền đã xác nhận. Nhân vật chính của luồng đăng ký.
    packages["lan"] = _sell(admin, students["lan"], types["group20"])
    payments["lan"] = _pay(admin, packages["lan"], "4500000.00")
    ok(admin.post(f"/payments/{payments['lan']}/confirm"))

    # Minh: đã tập được nhưng tiền **chưa xác nhận** — nguồn của danh sách
    # cảnh báo ở F09.
    packages["minh"] = _sell(admin, students["minh"], types["group10"])
    payments["minh"] = _pay(admin, packages["minh"], "2500000.00", "TRANSFER")

    # Trang: gói Private, dùng để chứng minh gói không dùng chéo loại lớp.
    packages["trang"] = _sell(admin, students["trang"], types["private5"])
    payments["trang"] = _pay(admin, packages["trang"], "3000000.00")
    ok(admin.post(f"/payments/{payments['trang']}/confirm"))

    # Huy: còn 2 buổi sau một lần điều chỉnh tay → sắp hết buổi.
    packages["huy"] = _sell(admin, students["huy"], types["group10"])
    payments["huy"] = _pay(admin, packages["huy"], "2500000.00")
    ok(admin.post(f"/payments/{payments['huy']}/confirm"))
    ok(
        admin.post(
            f"/packages/{packages['huy']}/adjust",
            {"delta": -8, "reason": "Chuyển 8 buổi sang gói Private theo yêu cầu khách"},
        )
    )

    # Phương: gói mua từ 80 ngày trước, còn 10 ngày → sắp hết hạn.
    packages["phuong"] = _sell(
        admin, students["phuong"], types["group10"], start_date=today() - timedelta(days=80)
    )
    payments["phuong"] = _pay(admin, packages["phuong"], "2500000.00")
    ok(admin.post(f"/payments/{payments['phuong']}/confirm"))

    # Nam: **chưa có gói nào**. Không phải thiếu sót của seed.

    # Ngân: gói thường, dành cho luồng đăng ký khi lớp đầy.
    packages["ngan"] = _sell(admin, students["ngan"], types["group10"])
    payments["ngan"] = _pay(admin, packages["ngan"], "2500000.00")
    ok(admin.post(f"/payments/{payments['ngan']}/confirm"))

    # Yến: chuyển khoản không về, giao dịch bị huỷ → gói mất hiệu lực.
    packages["yen"] = _sell(admin, students["yen"], types["group10"])
    payments["yen"] = _pay(admin, packages["yen"], "2500000.00", "TRANSFER")
    ok(
        admin.post(
            f"/payments/{payments['yen']}/void",
            {"reason": "Đối soát ngân hàng: tiền chưa về"},
        )
    )


def _build_schedule(admin: ApiUser, studio: Studio) -> None:
    """Lịch lớp trải đủ các tình huống hủy, dời, hết chỗ và sai loại lớp.

    Mỗi HLV giữ một dải giờ riêng: ràng buộc chống trùng giờ là ràng buộc
    CSDL, nên hai buổi chồng nhau sẽ làm seed đổ ở một chỗ không liên quan
    gì đến điều đang kiểm.
    """
    mai, ha, bao = (studio.trainer_ids[k] for k in ("mai", "ha", "bao"))
    right_now = now()
    sessions = studio.session_ids

    # HLV Mai — lớp Group.
    sessions["group_tomorrow"] = _class_session(
        admin, trainer_id=mai, starts_at=right_now + timedelta(days=1), capacity=6
    )
    #: Còn 2 giờ nữa: dưới ngưỡng hủy 4 giờ của lớp Group → hủy không hoàn.
    sessions["group_soon"] = _class_session(
        admin, trainer_id=mai, starts_at=right_now + timedelta(hours=2), capacity=2
    )
    #: Sức chứa 1 → người thứ hai bị từ chối đăng ký.
    sessions["group_full"] = _class_session(
        admin, trainer_id=mai, starts_at=right_now + timedelta(days=3), capacity=1
    )
    sessions["group_to_cancel"] = _class_session(
        admin, trainer_id=mai, starts_at=right_now + timedelta(days=4), capacity=4
    )

    # HLV Hà — một lớp sẽ bị dời giờ và một lớp Duo.
    sessions["group_to_move"] = _class_session(
        admin, trainer_id=ha, starts_at=right_now + timedelta(days=5), capacity=5
    )
    sessions["private_duo"] = _class_session(
        admin,
        trainer_id=ha,
        starts_at=right_now + timedelta(days=6),
        class_type=ClassType.PRIVATE,
        capacity=2,
    )

    # HLV Bảo — lớp Private 1 kèm 1.
    sessions["private_solo"] = _class_session(
        admin,
        trainer_id=bao,
        starts_at=right_now + timedelta(days=7),
        class_type=ClassType.PRIVATE,
        capacity=None,
    )


def recurrence_payload(trainer_id: int, *, weeks_ahead: int = 3) -> dict[str, Any]:
    """Lịch lặp đặt **xa hẳn** dải ngày của các lớp lẻ ở trên.

    Lịch lặp chạy theo ngày-giờ địa phương còn lớp lẻ chạy theo `now()`, nên
    đặt hai thứ trong cùng một tuần là để giờ chạy test quyết định có đụng
    nhau hay không — và một bộ test đỏ theo giờ trong ngày thì không dùng được.
    """
    start = today() + timedelta(days=7 * weeks_ahead)
    return {
        "start_date": start.isoformat(),
        "end_date": (start + timedelta(days=13)).isoformat(),
        "weekdays": [0, 2, 4],
        "start_time": time(6, 0).isoformat(),
        "duration_minutes": 60,
        "trainer_id": trainer_id,
        "class_type": ClassType.GROUP.value,
        "capacity": 8,
    }


def _build_announcements(admin: ApiUser) -> None:
    """Một tin đã đăng và một tin nháp — trang công khai chỉ được thấy tin đầu."""
    created(
        admin.post(
            "/announcements",
            {
                "title": "Ưu đãi tháng này",
                "body": "Giảm 10% cho học viên gia hạn trước ngày hết hạn.",
                "is_published": True,
            },
        )
    )
    created(
        admin.post(
            "/announcements",
            {
                "title": "Nháp: lịch nghỉ lễ",
                "body": "Chưa chốt, không hiển thị ra ngoài.",
                "is_published": False,
            },
        )
    )


def student_credits(studio: Studio, key: str) -> int:
    """Số buổi còn lại theo đúng màn hình nhân viên mở ra để đọc."""
    return ok(studio.admin.get(f"/students/{studio.student_ids[key]}/overview"))[
        "credits_remaining"
    ]


def session_seats_left(studio: Studio, key: str) -> int:
    return ok(studio.admin.get(f"/classes/{studio.session_ids[key]}"))["seats_left"]
