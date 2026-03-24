"""Find patients with birthdays in a given month.

Usage:
    python tools/find_birthday_patients.py --month 4
    python tools/find_birthday_patients.py --month 3 --limit 50
"""

import argparse
import json
from db import get_connection


def find_birthday_patients(month: int, limit: int = 200) -> list[dict]:
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
                    u."dateOfBirth"
                FROM "User" u
                WHERE u.role = 'CLIENT'
                  AND u."archivedAt" IS NULL
                  AND u."dateOfBirth" IS NOT NULL
                  AND EXTRACT(MONTH FROM u."dateOfBirth") = %s
                ORDER BY EXTRACT(DAY FROM u."dateOfBirth") ASC
                LIMIT %s
            """, (month, limit))

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
    finally:
        conn.close()

    results = []
    for row in rows:
        record = dict(zip(columns, row))
        results.append({
            "id": record["id"],
            "name": f"{record['firstName']} {record['lastName']}",
            "email": record["email"],
            "phone": record["phone"],
            "dateOfBirth": record["dateOfBirth"].isoformat() if record["dateOfBirth"] else None,
        })

    return results


def main():
    parser = argparse.ArgumentParser(description="Find patients with birthdays in a month")
    parser.add_argument("--month", type=int, required=True, help="Month number (1-12)")
    parser.add_argument("--limit", type=int, default=200, help="Max results (default: 200)")
    args = parser.parse_args()

    if not 1 <= args.month <= 12:
        print("ERROR: Month must be between 1 and 12")
        return

    month_names = ["", "January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"]

    patients = find_birthday_patients(args.month, args.limit)
    print(json.dumps(patients, indent=2, default=str))
    print(f"\n--- {len(patients)} patients with birthdays in {month_names[args.month]} ---")


if __name__ == "__main__":
    main()
