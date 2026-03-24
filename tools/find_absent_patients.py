"""Find patients with no appointments after a cutoff date.

Usage:
    python tools/find_absent_patients.py --since 2025-12-01
    python tools/find_absent_patients.py --since 2026-01-01 --limit 50
"""

import argparse
import json
from datetime import datetime
from db import get_connection


def find_absent_patients(since: str, limit: int = 100) -> list[dict]:
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
                    MAX(a."startsAt") AS last_visit
                FROM "User" u
                INNER JOIN "Appointment" a ON a."clientId" = u.id
                WHERE u.role = 'CLIENT'
                  AND u."archivedAt" IS NULL
                  AND a.status = 'COMPLETED'
                GROUP BY u.id, u."firstName", u."lastName", u.email, u.phone
                HAVING MAX(a."startsAt") < %s
                  AND NOT EXISTS (
                      SELECT 1 FROM "Appointment" recent
                      WHERE recent."clientId" = u.id
                        AND recent."startsAt" >= %s
                  )
                ORDER BY MAX(a."startsAt") DESC
                LIMIT %s
            """, (since, since, limit))

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
        })

    return results


def main():
    parser = argparse.ArgumentParser(description="Find patients absent since a date")
    parser.add_argument("--since", required=True, help="Cutoff date (YYYY-MM-DD)")
    parser.add_argument("--limit", type=int, default=100, help="Max results (default: 100)")
    args = parser.parse_args()

    patients = find_absent_patients(args.since, args.limit)
    print(json.dumps(patients, indent=2, default=str))
    print(f"\n--- {len(patients)} patients absent since {args.since} ---")


if __name__ == "__main__":
    main()
