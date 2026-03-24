"""Send SMS campaign to a list of patients from a CSV file.

Usage:
    python tools/send_sms_campaign.py --csv .tmp/campaign.csv --message "Hi {name}, we miss you! Book now: https://clinic.com/book"
    python tools/send_sms_campaign.py --csv .tmp/campaign.csv --message "Hi {name}, happy birthday! Enjoy 15% off this month." --dry-run

Requires in .env:
    TWILIO_SID=your_account_sid
    TWILIO_AUTH_TOKEN=your_auth_token
    TWILIO_FROM=+44xxxxxxxxxx
"""

import argparse
import csv
import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def load_recipients(csv_path: str) -> list[dict]:
    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        return [row for row in reader if row.get("phone")]


def personalise(message: str, patient: dict) -> str:
    return message.replace("{name}", patient.get("name", "").split()[0])


def send_sms(to: str, body: str, client) -> dict:
    message = client.messages.create(
        body=body,
        from_=os.getenv("TWILIO_FROM"),
        to=to,
    )
    return {"sid": message.sid, "status": message.status}


def main():
    parser = argparse.ArgumentParser(description="Send SMS campaign from CSV")
    parser.add_argument("--csv", required=True, help="Path to campaign CSV")
    parser.add_argument("--message", required=True, help="Message template (use {name} for personalisation)")
    parser.add_argument("--dry-run", action="store_true", help="Preview messages without sending")
    args = parser.parse_args()

    recipients = load_recipients(args.csv)

    if not recipients:
        print("No recipients with phone numbers found in CSV.")
        return

    print(f"Campaign: {len(recipients)} recipients")
    print(f"Message template: {args.message}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print("---")

    if args.dry_run:
        for r in recipients[:5]:
            msg = personalise(args.message, r)
            print(f"  [{r['phone']}] {msg}")
        if len(recipients) > 5:
            print(f"  ... and {len(recipients) - 5} more")
        print(f"\n--- DRY RUN: {len(recipients)} messages would be sent ---")
        return

    # Live mode — import Twilio
    sid = os.getenv("TWILIO_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM")

    if not all([sid, token, from_number]):
        print("ERROR: Set TWILIO_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM in .env")
        sys.exit(1)

    from twilio.rest import Client
    client = Client(sid, token)

    sent = 0
    failed = 0

    for r in recipients:
        msg = personalise(args.message, r)
        try:
            result = send_sms(r["phone"], msg, client)
            print(f"  SENT [{r['phone']}] {r['name']} — SID: {result['sid']}")
            sent += 1
        except Exception as e:
            print(f"  FAIL [{r['phone']}] {r['name']} — {e}")
            failed += 1

    print(f"\n--- Campaign complete: {sent} sent, {failed} failed ---")


if __name__ == "__main__":
    main()
