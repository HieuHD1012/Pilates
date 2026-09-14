"""Gói tập, sổ buổi và thanh toán qua API (F05)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.rules import ClassType, LedgerReason, PackageStatus, Role, today
from app.models.money import CreditLedger, PackageType, StudentPackage
from app.models.people import Student
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import auth_header, login, make_user


def _headers(client: TestClient, user) -> dict[str, str]:
    return auth_header(login(client, user.email)["access_token"])


@pytest.fixture
def setup(client: TestClient, db: Session) -> dict:
    admin = make_user(db, Role.ADMIN)
    staff = make_user(db, Role.STAFF)
    student = Student(full_name="Học viên Demo 01", phone="0900000001")
    db.add(student)
    db.flush()
    package_type = PackageType(
        name="Group 10 buổi",
        price=Decimal("2500000.00"),
        credits=10,
        duration_days=90,
        class_type=ClassType.GROUP,
    )
    db.add(package_type)
    db.commit()
    return {
        "admin": admin,
        "staff": staff,
        "student": student,
        "package_type": package_type,
        "admin_headers": _headers(client, admin),
        "staff_headers": _headers(client, staff),
    }


def _sell(client: TestClient, setup: dict) -> dict:
    response = client.post(
        "/packages/sell",
        headers=setup["staff_headers"],
        json={
            "student_id": setup["student"].id,
            "package_type_id": setup["package_type"].id,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


# --- Bán gói -----------------------------------------------------------------


def test_selling_a_package_credits_the_sessions_atomically(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Gói và buổi ra đời cùng lúc — không có trạng thái "có gói mà chưa có buổi"."""
    package = _sell(client, setup)

    assert package["balance_cached"] == 10
    assert package["credits_snapshot"] == 10

    entries = db.scalars(
        select(CreditLedger).where(CreditLedger.student_package_id == package["id"])
    ).all()
    assert len(entries) == 1
    assert entries[0].reason_code is LedgerReason.PACKAGE_SOLD
    assert entries[0].delta == 10
    assert_ledger_is_sound(db)


def test_package_snapshot_survives_later_price_changes(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Sửa loại gói **không** chạm gói đã bán.

    Đổi giá hôm nay mà viết lại được lịch sử hôm qua thì mọi báo cáo doanh thu
    đều thành số liệu của hiện tại, không phải của kỳ đã qua.
    """
    package = _sell(client, setup)

    updated = client.patch(
        f"/package-types/{setup['package_type'].id}",
        headers=setup["staff_headers"],
        json={"price": "9990000.00", "credits": 99, "name": "Gói đã đổi tên"},
    )
    assert updated.status_code == 200

    stored = db.get(StudentPackage, package["id"])
    db.refresh(stored)
    assert stored.price_snapshot == Decimal("2500000.00")
    assert stored.credits_snapshot == 10
    assert stored.name_snapshot == "Group 10 buổi"


def test_stopping_sales_keeps_the_package_type(
    client: TestClient, db: Session, setup: dict
) -> None:
    client.patch(
        f"/package-types/{setup['package_type'].id}",
        headers=setup["staff_headers"],
        json={"is_selling": False},
    )
    assert db.get(PackageType, setup["package_type"].id) is not None
    assert client.get("/public/packages").json() == []


def test_renewal_keeps_the_old_history(
    client: TestClient, db: Session, setup: dict
) -> None:
    package = _sell(client, setup)
    original_end = package["end_date"]

    response = client.post(
        f"/packages/{package['id']}/renew",
        headers=setup["staff_headers"],
        json={"extra_days": 30, "extra_credits": 5},
    )
    assert response.status_code == 200
    assert response.json()["balance_cached"] == 15
    assert response.json()["end_date"] > original_end

    entries = db.scalars(
        select(CreditLedger)
        .where(CreditLedger.student_package_id == package["id"])
        .order_by(CreditLedger.id)
    ).all()
    assert [entry.reason_code for entry in entries] == [
        LedgerReason.PACKAGE_SOLD,
        LedgerReason.PACKAGE_RENEWED,
    ]
    assert_ledger_is_sound(db)


# --- Sổ buổi -----------------------------------------------------------------


def test_ledger_shows_a_running_balance_that_adds_up(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Đọc xuôi xuống, cộng dồn thay đổi thì ra đúng dòng đóng sổ.

    Đó là toàn bộ lý do màn hình này tồn tại.
    """
    package = _sell(client, setup)
    client.post(
        f"/packages/{package['id']}/adjust",
        headers=setup["admin_headers"],
        json={"delta": -3, "reason": "Thu lại buổi cộng nhầm."},
    )

    body = client.get(
        f"/packages/{package['id']}/ledger", headers=setup["staff_headers"]
    ).json()

    assert [entry["delta"] for entry in body["entries"]] == [10, -3]
    assert [entry["balance_after"] for entry in body["entries"]] == [10, 7]
    assert body["closing_balance"] == 7
    assert sum(entry["delta"] for entry in body["entries"]) == body["closing_balance"]


def test_manual_adjustment_requires_admin(
    client: TestClient, db: Session, setup: dict
) -> None:
    package = _sell(client, setup)
    response = client.post(
        f"/packages/{package['id']}/adjust",
        headers=setup["staff_headers"],
        json={"delta": 5, "reason": "Nhân viên tự cộng."},
    )
    assert response.status_code == 403


def test_manual_adjustment_requires_a_reason(
    client: TestClient, db: Session, setup: dict
) -> None:
    package = _sell(client, setup)
    response = client.post(
        f"/packages/{package['id']}/adjust",
        headers=setup["admin_headers"],
        json={"delta": 5, "reason": "  "},
    )
    assert response.status_code == 422


def test_adjustment_cannot_push_balance_below_zero(
    client: TestClient, db: Session, setup: dict
) -> None:
    package = _sell(client, setup)
    response = client.post(
        f"/packages/{package['id']}/adjust",
        headers=setup["admin_headers"],
        json={"delta": -50, "reason": "Thử đẩy số dư xuống âm."},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "INSUFFICIENT_CREDITS"


def test_student_reads_own_ledger_and_not_anyone_elses(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Cả hai vế: đọc được sổ của mình, **và** không đọc được sổ người khác.

    Gói của người khác trả 404 giống hệt gói không tồn tại — hai mã khác nhau
    là một bộ đếm số gói của studio.
    """
    someone_elses = _sell(client, setup)

    mine = Student(full_name="Học viên Demo 02", phone="0900000002")
    db.add(mine)
    db.flush()
    user = make_user(db, Role.STUDENT, email="hv2@example.com")
    mine.user_id = user.id
    db.commit()

    my_package = client.post(
        "/packages/sell",
        headers=setup["staff_headers"],
        json={"student_id": mine.id, "package_type_id": setup["package_type"].id},
    ).json()
    headers = _headers(client, user)

    own = client.get(f"/packages/{my_package['id']}/ledger", headers=headers)
    assert own.status_code == 200
    assert own.json()["closing_balance"] == 10

    assert (
        client.get(
            f"/packages/{someone_elses['id']}/ledger", headers=headers
        ).status_code
        == 404
    )
    assert client.get("/packages/999999/ledger", headers=headers).status_code == 404


# --- Thanh toán --------------------------------------------------------------


def test_payment_records_actor_and_time_for_every_transition(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Ba chuyển trạng thái, ba cặp người + thời điểm.

    Một bản ghi tiền mà không truy được ai đổi nó thì không phải bản ghi.
    """
    package = _sell(client, setup)
    payment = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={
            "student_package_id": package["id"],
            "amount": "2500000.00",
            "method": "CASH",
        },
    ).json()

    assert payment["status"] == "PENDING"
    assert payment["recorded_by"] == setup["staff"].id
    assert payment["recorded_at"] is not None

    confirmed = client.post(
        f"/payments/{payment['id']}/confirm", headers=setup["admin_headers"]
    ).json()
    assert confirmed["status"] == "CONFIRMED"
    assert confirmed["confirmed_by"] == setup["admin"].id
    assert confirmed["confirmed_at"] is not None


def test_void_is_blocked_once_the_package_has_consumed_credits(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Kịch bản quy tắc này tồn tại để ngăn.

    Học viên tập 6 buổi; ba tuần sau đối soát ngân hàng cho thấy tiền không về;
    nhân viên bấm `VOID`. Không có quy tắc này thì doanh thu giảm, số buổi
    không đổi, và không ai phát hiện.
    """
    package = _sell(client, setup)
    payment = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={
            "student_package_id": package["id"],
            "amount": "2500000.00",
            "method": "TRANSFER",
        },
    ).json()
    client.post(f"/payments/{payment['id']}/confirm", headers=setup["staff_headers"])

    # Mô phỏng việc gói đã tiêu buổi (F07 sẽ làm việc này qua booking service).
    from app.domain.rules import now
    from app.models.people import Trainer
    from app.models.scheduling import Booking, ClassSession
    from app.services import credit_ledger

    trainer = Trainer(full_name="HLV Demo 01")
    db.add(trainer)
    db.flush()
    starts = now() + timedelta(days=1)
    class_session = ClassSession(
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        created_by=setup["admin"].id,
    )
    db.add(class_session)
    db.flush()
    booking = Booking(
        class_session_id=class_session.id,
        student_id=setup["student"].id,
        student_package_id=package["id"],
        booked_by_user_id=setup["admin"].id,
    )
    db.add(booking)
    db.flush()
    credit_ledger.record(
        db,
        student_package_id=package["id"],
        delta=-1,
        reason=LedgerReason.BOOKING_DEDUCT,
        actor_user_id=setup["admin"].id,
        booking_id=booking.id,
    )
    db.commit()

    response = client.post(
        f"/payments/{payment['id']}/void",
        headers=setup["staff_headers"],
        json={"reason": "Đối soát ngân hàng không thấy tiền về."},
    )
    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "PACKAGE_HAS_CONSUMED_CREDITS"
    # Thông báo phải nêu rõ đã tiêu bao nhiêu buổi, để nhân viên biết phải dùng
    # điều chỉnh thủ công chứ không phải thử lại.
    assert "1 buổi" in detail["message"]
    assert_ledger_is_sound(db)


def test_void_on_an_untouched_package_reverses_the_credits(
    client: TestClient, db: Session, setup: dict
) -> None:
    package = _sell(client, setup)
    payment = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={
            "student_package_id": package["id"],
            "amount": "2500000.00",
            "method": "CASH",
        },
    ).json()

    response = client.post(
        f"/payments/{payment['id']}/void",
        headers=setup["staff_headers"],
        json={"reason": "Khách đổi ý, chưa tập buổi nào."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "VOID"
    assert response.json()["voided_by"] == setup["staff"].id
    assert response.json()["void_reason"]

    stored = db.get(StudentPackage, package["id"])
    db.refresh(stored)
    assert stored.balance_cached == 0
    assert stored.status is PackageStatus.CANCELLED

    void_entries = db.scalar(
        select(func.count())
        .select_from(CreditLedger)
        .where(
            CreditLedger.student_package_id == package["id"],
            CreditLedger.reason_code == LedgerReason.PAYMENT_VOID,
        )
    )
    assert void_entries == 1
    assert_ledger_is_sound(db)


def test_void_requires_a_reason(client: TestClient, db: Session, setup: dict) -> None:
    """Lý do rỗng bị chặn ở **cả hai tầng**.

    `min_length` của Pydantic bắt chuỗi quá ngắn; nhưng `"   a"` qua được nó
    rồi bị `sanitize` cắt về gần rỗng, nên nhánh kiểm ở service phải tồn tại và
    phải được chạm tới.
    """
    package = _sell(client, setup)
    payment = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={"student_package_id": package["id"], "amount": "1", "method": "CASH"},
    ).json()
    path = f"/payments/{payment['id']}/void"

    assert (
        client.post(path, headers=setup["staff_headers"], json={"reason": "  "}).status_code
        == 422
    )

    # Nhánh service: gọi thẳng để chắc chắn nó tồn tại và từ chối.
    from app.core.errors import BusinessError
    from app.services import payments as payment_service

    try:
        payment_service.void_payment(
            db, payment_id=payment["id"], actor_user_id=setup["staff"].id, reason="   "
        )
        raise AssertionError("Service phải từ chối lý do rỗng")
    except BusinessError as exc:
        assert exc.code == "VOID_NEEDS_REASON"


def test_voided_payment_cannot_be_confirmed(
    client: TestClient, db: Session, setup: dict
) -> None:
    """`VOID` là trạng thái cuối."""
    package = _sell(client, setup)
    payment = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={"student_package_id": package["id"], "amount": "1", "method": "CASH"},
    ).json()
    client.post(
        f"/payments/{payment['id']}/void",
        headers=setup["staff_headers"],
        json={"reason": "Khách huỷ."},
    )

    response = client.post(
        f"/payments/{payment['id']}/confirm", headers=setup["staff_headers"]
    )
    assert response.status_code == 409


def test_void_refuses_when_the_package_has_other_live_payments(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Số buổi không gắn với từng khoản tiền.

    Gói có hai giao dịch thì "thu hồi buổi của đúng khoản này" là câu hỏi không
    có đáp án trong dữ liệu — từ chối và buộc con người quyết định.
    """
    package = _sell(client, setup)
    first = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={
            "student_package_id": package["id"],
            "amount": "1000000.00",
            "method": "CASH",
        },
    ).json()
    client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={
            "student_package_id": package["id"],
            "amount": "1500000.00",
            "method": "TRANSFER",
        },
    )

    response = client.post(
        f"/payments/{first['id']}/void",
        headers=setup["staff_headers"],
        json={"reason": "Ghi nhầm phương thức."},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PACKAGE_HAS_OTHER_PAYMENTS"


def test_students_cannot_reach_payment_endpoints(
    client: TestClient, db: Session, setup: dict
) -> None:
    user = make_user(db, Role.STUDENT, email="hv1@example.com")
    assert client.get("/payments", headers=_headers(client, user)).status_code == 403
    assert client.get("/package-types", headers=_headers(client, user)).status_code == 403


def test_package_dates_follow_studio_timezone(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Gói bán hôm nay bắt đầu từ **hôm nay theo giờ studio**."""
    package = _sell(client, setup)
    assert package["start_date"] == today().isoformat()
    assert package["end_date"] == (today() + timedelta(days=90)).isoformat()


# --- Lỗ hổng phát hiện khi review M3 -----------------------------------------


def test_void_refuses_when_credits_came_from_a_renewal(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Huỷ một khoản tiền không được thu hồi buổi của lần gia hạn.

    Gia hạn không tạo dòng `payment` nào, nên guard "còn giao dịch khác" mù với
    nó. Không chặn thì huỷ khoản tiền của lần bán đầu sẽ xoá luôn số buổi
    studio vừa gia hạn — mất tài sản của học viên, không cảnh báo, và **phép
    đối soát vẫn báo sạch** vì sổ vẫn cân.
    """
    package = _sell(client, setup)
    client.post(
        f"/packages/{package['id']}/renew",
        headers=setup["staff_headers"],
        json={"extra_days": 30, "extra_credits": 7},
    )
    payment = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={
            "student_package_id": package["id"],
            "amount": "2500000.00",
            "method": "CASH",
        },
    ).json()

    response = client.post(
        f"/payments/{payment['id']}/void",
        headers=setup["staff_headers"],
        json={"reason": "Đối soát: tiền lần bán đầu không về."},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PACKAGE_HAS_CREDITS_FROM_OTHER_SOURCES"

    stored = db.get(StudentPackage, package["id"])
    db.refresh(stored)
    assert stored.balance_cached == 17
    assert stored.status is PackageStatus.ACTIVE


def test_void_refuses_when_credits_came_from_a_manual_adjustment(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Cùng lý lẽ, cho số buổi studio tự bù cho học viên."""
    package = _sell(client, setup)
    client.post(
        f"/packages/{package['id']}/adjust",
        headers=setup["admin_headers"],
        json={"delta": 3, "reason": "Bù buổi vì studio đổi lịch."},
    )
    payment = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={"student_package_id": package["id"], "amount": "1", "method": "CASH"},
    ).json()

    response = client.post(
        f"/payments/{payment['id']}/void",
        headers=setup["staff_headers"],
        json={"reason": "Ghi nhầm."},
    )
    assert response.status_code == 409
    assert db.get(StudentPackage, package["id"]).balance_cached == 13


# --- Chi tiết một giao dịch --------------------------------------------------


def test_payment_detail_carries_the_full_audit_trail(
    client: TestClient, setup: dict
) -> None:
    """Màn chi tiết phải trả đủ **ba cặp người/thời điểm**.

    Ghi nhận, xác nhận và huỷ là ba lần một khoản tiền đổi trạng thái, và mỗi
    lần đều phải truy được ai làm. Một màn chi tiết chỉ hiện trạng thái cuối
    biến câu hỏi "ai đã huỷ khoản này" thành một câu không trả lời được.
    """
    package = _sell(client, setup)
    payment = client.post(
        "/payments",
        headers=setup["staff_headers"],
        json={"student_package_id": package["id"], "amount": "2500000.00", "method": "CASH"},
    ).json()

    fresh = client.get(f"/payments/{payment['id']}", headers=setup["staff_headers"])
    assert fresh.status_code == 200
    body = fresh.json()
    assert body["status"] == "PENDING"
    assert body["recorded_by"] == setup["staff"].id
    assert body["recorded_at"] is not None
    assert body["confirmed_by"] is None and body["voided_by"] is None

    client.post(f"/payments/{payment['id']}/confirm", headers=setup["admin_headers"])
    confirmed = client.get(f"/payments/{payment['id']}", headers=setup["staff_headers"]).json()
    assert confirmed["status"] == "CONFIRMED"
    assert confirmed["confirmed_by"] == setup["admin"].id
    assert confirmed["confirmed_at"] is not None
    # Người ghi nhận ban đầu không bị người xác nhận ghi đè.
    assert confirmed["recorded_by"] == setup["staff"].id


def test_reading_an_unknown_payment_is_a_404(client: TestClient, setup: dict) -> None:
    assert (
        client.get("/payments/999999", headers=setup["staff_headers"]).status_code == 404
    )
