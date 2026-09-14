"""Lớp nền cho mọi model và các kiểu cột dùng chung."""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def enum_column(py_enum: type[enum.Enum], name: str) -> Enum:
    """Cột enum dạng VARCHAR + CHECK.

    Không dùng kiểu ENUM gốc của PostgreSQL: thêm một giá trị vào kiểu gốc là
    một migration phải ALTER TYPE ngoài transaction, trong khi CHECK sửa được
    bằng một migration bình thường. Mức cưỡng chế ở CSDL là như nhau.
    """
    return Enum(
        py_enum,
        name=name,
        native_enum=False,
        values_callable=lambda e: [m.value for m in e],
        length=32,
        create_constraint=True,
    )


#: Mọi mốc thời gian là timestamptz. Không cột thời gian nào được phép naive.
TimestampTz = DateTime(timezone=True)

#: SQL kiểm một chuỗi có ít nhất một ký tự **thật**, không phải khoảng trắng.
#:
#: `btrim()` mặc định chỉ cắt dấu cách, và `[[:space:]]` chỉ phủ khoảng trắng
#: ASCII — nên `note = U+00A0` (khoảng trắng không ngắt) trông rỗng hệt nhưng
#: vẫn qua được. Lớp ký tự dưới đây phủ thêm các khoảng trắng Unicode hay gặp,
#: để "bắt buộc có lý do" không vòng qua được bằng một ký tự vô hình.
MEANINGFUL_TEXT_SQL = r"E'[^[:space:]\u00a0\u2000-\u200b\u202f\u205f\u3000\ufeff]'"


def requires_meaningful_text(column: str) -> str:
    """Mệnh đề SQL: `column` khác NULL và có ký tự thật.

    Phép kiểm NULL là bắt buộc — `NULL ~ regex` cho ra NULL, mà CHECK coi NULL
    là **qua**, nên bỏ trống hẳn sẽ lọt trong khi gõ một dấu cách thì bị chặn.
    """
    return f"{column} IS NOT NULL AND {column} ~ {MEANINGFUL_TEXT_SQL}"


class CreatedAtMixin:
    created_at: Mapped[datetime] = mapped_column(
        TimestampTz, nullable=False, server_default=func.now()
    )
