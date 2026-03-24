"""Find patients seen in a date range who have no future appointments.

Usage:
    python tools/find_non_returning_patients.py --from 2026-01-01 --to 2026-02-28
    python tools/find_non_returning_patients.py --from 2026-01-01 --to 2026-02-28 --limit 50
"""

import argparse
import json
from datetime import datetime
from db import get_connection


def find_non_returning(date_from: str, date_to: str, limit: int = 100) -> list[dict]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    u.id,
                    u."firstName",
                    u."lastName",
                    u.email,
                    u.phone,
                    MAX(a."startsAt") AS last_visit,
                    t.name AS last_treatment
                FROM "User" u
                INNER JOIN "Appointment" a ON a."clientId" = u.id
                INNER JOIN "Treatment" t ON t.id = a."treatmentId"
                WHERE u.role = 'CLIENT'
                  AND u."archivedAt" IS NULL
                  AND a.status = 'COMPLETED'
                  AND a."startsAt" BETWEEN %s AND %s
                  AND NOT EXISTS (
                      SELECT 1 FROM "Appointment" future
                      WHERE future."clientId" = u.id
                        AND future."startsAt" > NOW()
                        AND future.status IN ('CONFIRMED', 'PENDING')
                  )
                GROUP BY u.id, u."firstName", u."lastName", u.email, u.phone, t.name
                ORDER BY MAX(a."startsAt") DESC
                LIMIT %s
            """, (date_from, date_to, limit))

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
    finally:
        conn.close()

    results = []
    for row in rows:
        record = dict(zip(columns, row))
        last_visit = record["last_visit"]
        results.append({
            "id": record["id"],
            "name": f"{record['firstName']} {record['lastName']}",
            "email": record["email"],
            "phone": record["phone"],
            "lastVisit": last_visit.isoformat() if last_visit else None,
            "daysSince": (datetime.now() - last_visit).days if last_visit else None,
            "lastTreatment": record["last_treatment"],
        })

    return results


def main():
    parser = argparse.ArgumentParser(description="Find non-returning patients")
    parser.add_argument("--from", dest="date_from", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--to", dest="date_to", required=True, help="End date (YYYY-MM-DD)")
    parser.add_argument("--limit", type=int, default=100, help="Max results (default: 100)")
    args = parser.parse_args()

    patients = find_non_returning(args.date_from, args.date_to, args.limit)
    print(json.dumps(patients, indent=2, default=str))
    print(f"\n--- {len(patients)} non-returning patients (seen {args.date_from} to {args.date_to}, no future booking) ---")


if __name__ == "__main__":
    main()
