"""Prepare time-dependent states only in the disposable browser-test database."""

from __future__ import annotations

import argparse
from datetime import timedelta

from sqlalchemy import select, text

from app.config import get_settings
from app.db import SessionLocal, engine
from app.domain.rules import now
from app.models.money import StudentPackage
from app.models.people import Trainer
from app.models.scheduling import ClassSession
from app.models.user import PasswordReset
from app.services.ledger_invariants import assert_ledger_is_sound


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=["reset", "reconcile", "ended", "closed", "expire-reset", "expired-package"],
    )
    parser.add_argument("--id", type=int)
    args = parser.parse_args()
    settings = get_settings()
    if settings.environment != "test" or settings.database_url.path != "/pilates_fe_test":
        raise SystemExit("Refusing to touch anything except ENVIRONMENT=test /pilates_fe_test")
    if args.action == "reset":
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
        return
    with SessionLocal.begin() as db:
        if args.action == "reconcile":
            assert_ledger_is_sound(db)
        elif args.action == "expired-package":
            row = db.get(StudentPackage, args.id)
            if row is None or not row.name_snapshot.startswith("Gói E2E "):
                raise SystemExit("Refusing to alter a package not owned by an E2E fixture")
            row.start_date = now().date() - timedelta(days=91)
            row.end_date = now().date() - timedelta(days=1)
        elif args.action == "expire-reset":
            row = db.scalar(
                select(PasswordReset)
                .where(PasswordReset.user_id == args.id)
                .order_by(PasswordReset.id.desc())
            )
            if row is None:
                raise SystemExit("Missing test reset token")
            row.expires_at = now() - timedelta(minutes=1)
        else:
            row = db.get(ClassSession, args.id)
            trainer = db.get(Trainer, row.trainer_id) if row else None
            if row is None or trainer is None or not trainer.full_name.startswith("E2E "):
                raise SystemExit("Refusing to alter a session not owned by an E2E fixture")
            start = (
                now() - timedelta(hours=3)
                if args.action == "ended"
                else now() + timedelta(minutes=20)
            )
            row.starts_at = start
            row.ends_at = start + timedelta(minutes=50)


if __name__ == "__main__":
    main()
