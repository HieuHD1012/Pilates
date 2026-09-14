"""Gom mọi model để Alembic autogenerate và metadata nhìn thấy đủ bảng."""

from app.models.base import Base
from app.models.money import CreditLedger, PackageType, Payment, StudentPackage
from app.models.people import (
    Announcement,
    Lead,
    ProgressPhoto,
    RenewalContact,
    Student,
    Trainer,
)
from app.models.scheduling import Booking, ClassSession, ImportRun, WaitlistEntry
from app.models.user import PasswordReset, RefreshToken, User

__all__ = [
    "Announcement",
    "Base",
    "Booking",
    "ClassSession",
    "CreditLedger",
    "ImportRun",
    "Lead",
    "PackageType",
    "PasswordReset",
    "Payment",
    "ProgressPhoto",
    "RefreshToken",
    "RenewalContact",
    "Student",
    "StudentPackage",
    "Trainer",
    "User",
    "WaitlistEntry",
]
