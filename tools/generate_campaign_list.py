"""Generate a CSV campaign list from patient finder tools.

Usage:
    python tools/generate_campaign_list.py --type overdue --days 90 --output .tmp/campaign.csv
    python tools/generate_campaign_list.py --type non-returning --from 2026-01-01 --to 2026-02-28 --output .tmp/campaign.csv
    python tools/generate_campaign_list.py --type birthday --month 4 --output .tmp/campaign.csv
    python tools/generate_campaign_list.py --type absent --since 2025-12-01 --output .tmp/campaign.csv
"""

import argparse
import csv
import os
import sys

from find_overdue_patients import find_overdue_patients
from find_non_returning_patients import find_non_returning
from find_birthday_patients import find_birthday_patients
from find_absent_patients import find_absent_patients


def generate_list(args) -> list[dict]:
    if args.type == "overdue":
        if not args.days:
            print("ERROR: --days required for overdue type")
            sys.exit(1)
        patients = find_overdue_patients(args.days, args.limit)
        for p in patients:
            p["segment"] = f"overdue_{args.days}d"

    elif args.type == "non-returning":
        if not args.date_from or not args.date_to:
            print("ERROR: --from and --to required for non-returning type")
            sys.exit(1)
        patients = find_non_returning(args.date_from, args.date_to, args.limit)
        for p in patients:
            p["segment"] = "non_returning"

    elif args.type == "birthday":
        if not args.month:
            print("ERROR: --month required for birthday type")
            sys.exit(1)
        patients = find_birthday_patients(args.month, args.limit)
        for p in patients:
            p["segment"] = f"birthday_month_{args.month}"
            p["lastVisit"] = None

    elif args.type == "absent":
        if not args.since:
            print("ERROR: --since required for absent type")
            sys.exit(1)
        patients = find_absent_patients(args.since, args.limit)
        for p in patients:
            p["segment"] = "absent"

    else:
        print(f"ERROR: Unknown type '{args.type}'")
        sys.exit(1)

    return patients


def write_csv(patients: list[dict], output_path: str):
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    fieldnames = ["id", "name", "email", "phone", "segment", "lastVisit"]
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(patients)

    print(f"Wrote {len(patients)} patients to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate campaign CSV from patient finders")
    parser.add_argument("--type", required=True, choices=["overdue", "non-returning", "birthday", "absent"])
    parser.add_argument("--output", required=True, help="Output CSV path (e.g., .tmp/campaign.csv)")
    parser.add_argument("--limit", type=int, default=200, help="Max results (default: 200)")

    # Type-specific args
    parser.add_argument("--days", type=int, help="Days threshold (overdue)")
    parser.add_argument("--from", dest="date_from", help="Start date (non-returning)")
    parser.add_argument("--to", dest="date_to", help="End date (non-returning)")
    parser.add_argument("--month", type=int, help="Birth month 1-12 (birthday)")
    parser.add_argument("--since", help="Cutoff date (absent)")

    args = parser.parse_args()

    patients = generate_list(args)

    if not patients:
        print("No patients found matching criteria.")
        return

    write_csv(patients, args.output)


if __name__ == "__main__":
    main()
