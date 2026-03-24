"""Shared database connection for all tools."""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def get_connection():
    """Return a psycopg2 connection using DATABASE_URL from .env."""
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL not set. Add it to .env in the project root.")
        sys.exit(1)
    return psycopg2.connect(url)
