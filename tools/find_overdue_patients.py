"""Find patients whose last completed appointment was more than N days ago.

Usage:
    python tools/find_overdue_patients.py --days 90
    python tools/find_overdue_patients.py --days 60 --limit 50
"""

import argparse
import json
from datetime import datetime, timedelta
from db import get_connection


def find_overdue_patients(days: int, limit: int = 100) -> list[dict]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cutoff = datetime.now() - timedelta(days=days)
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
                GROUP BY u.id, u."firstName", u."lastName", u.email, u.phone, t.name
                HAVING MAX(a."startsAt") < %s
                ORDER BY MAX(a."startsAt") ASC
                LIMIT %s
            """, (cutoff, limit))

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
    parser = argparse.ArgumentParser(description="Find overdue patients")
    parser.add_argument("--days", type=int, default=90, help="Days since last visit (default: 90)")
    parser.add_argument("--limit", type=int, default=100, help="Max results (default: 100)")
    args = parser.parse_args()

    patients = find_overdue_patients(args.days, args.limit)
    print(json.dumps(patients, indent=2, default=str))
    print(f"\n--- {len(patients)} overdue patients (>{args.days} days) ---")


if __name__ == "__main__":
    main()
