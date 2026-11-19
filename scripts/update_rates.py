#!/usr/bin/env python3
"""Fetch official ECB daily reference rates and write data/rates.json.

The ECB does not publish every currency (for example the Lebanese pound).
Those are added from data/manual-rates.json, where you set the official
rate yourself (expressed as units of that currency per 1 USD).

Usage:
    python3 scripts/update_rates.py                 # fetch from the ECB
    python3 scripts/update_rates.py --input f.xml   # use a local XML file (testing)
"""
import argparse
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = ROOT / "data" / "rates.json"
MANUAL_FILE = ROOT / "data" / "manual-rates.json"


def fetch_xml(path):
    if path:
        return Path(path).read_bytes()
    req = urllib.request.Request(ECB_URL, headers={"User-Agent": "calculators-site/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def parse_ecb(xml_bytes):
    root = ET.fromstring(xml_bytes)
    date = None
    rates = {}
    for el in root.iter():
        if not el.tag.endswith("Cube"):
            continue
        if "time" in el.attrib:
            date = el.attrib["time"]
        if "currency" in el.attrib and "rate" in el.attrib:
            rates[el.attrib["currency"]] = float(el.attrib["rate"])
    if not date or not rates:
        raise ValueError("ECB response had no dated rates")
    if "USD" not in rates:
        raise ValueError("ECB response had no USD rate")
    return date, rates


def apply_manual(rates):
    """Add currencies the ECB does not publish, derived via USD."""
    notes = {}
    if not MANUAL_FILE.exists():
        return notes
    manual = json.loads(MANUAL_FILE.read_text(encoding="utf-8"))
    for code, info in manual.items():
        if code.startswith("_"):
            continue
        per_usd = float(info["per_usd"])
        # rates["USD"] is USD per 1 EUR, so EUR->code = per_usd * USD-per-EUR
        rates[code] = per_usd * rates["USD"]
        notes[code] = "{:,.0f} per USD ({}, set manually)".format(per_usd, info.get("source", "manual"))
    return notes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", help="local ECB XML file instead of downloading")
    args = parser.parse_args()

    try:
        date, rates = parse_ecb(fetch_xml(args.input))
    except Exception as exc:  # keep the old file if anything goes wrong
        print("Update failed, keeping existing rates.json: {}".format(exc), file=sys.stderr)
        return 1

    notes = apply_manual(rates)
    payload = {
        "base": "EUR",
        "date": date,
        "source": "European Central Bank",
        "sample": False,
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "rates": {k: round(v, 6) for k, v in sorted(rates.items())},
        "notes": notes,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Only rewrite when the rates themselves changed, so the repo stays quiet on weekends.
    if OUT_FILE.exists():
        old = json.loads(OUT_FILE.read_text(encoding="utf-8"))
        if (old.get("date"), old.get("rates"), old.get("notes"), old.get("sample")) == (
            payload["date"], payload["rates"], payload["notes"], payload["sample"]
        ):
            print("Rates unchanged ({}).".format(date))
            return 0
    OUT_FILE.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("Wrote {} currencies for {}.".format(len(payload["rates"]), date))
    return 0


if __name__ == "__main__":
    sys.exit(main())
