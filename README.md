# Freight toolbox

A static website of freight forwarding calculators, converters and quick references. No server and no build step.

## Tools

- **Tracking:** sea freight (booking, bill of lading or container number) and air freight (air waybill), with a saved shipments list
- **Cargo:** chargeable weight, CBM and volume, container capacity, pallet calculator, freight cost
- **Time and dates:** world clock, time zone converter, date calculator, ETA calculator, transit time, free time (demurrage and detention)
- **Converters:** weight, length, temperature, CBM and CFT, currency
- **Reference:** dangerous goods, airport / port / country codes, Incoterms 2020, freight glossary

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell and home page |
| `style.css` | All styling |
| `core.js` | Helpers, navigation and routing |
| `tracking.js`, `cargo.js`, `time.js`, `convert.js`, `reference.js` | The tools |
| `app.js` | Currency converter |
| `data/rates.json` | Exchange rates, rewritten daily by the workflow |
| `data/manual-rates.json` | Currencies the ECB does not publish (LBP) |
| `scripts/update_rates.py` | Downloads the ECB rates |
| `.github/workflows/update-rates.yml` | Runs the update every weekday |

## Exchange rates

The workflow downloads the official European Central Bank rates every weekday at 17:30 UTC and commits `data/rates.json`.
The Lebanese pound is not an ECB currency, so edit `data/manual-rates.json` (units per 1 USD) when the official rate changes.

## Publish on GitHub Pages

Settings, Pages, Deploy from a branch, `main`, `/ (root)`.

## Adding a tool

Create a file with `FF.register({ id, group, title, desc, render })`, add a `<script>` tag for it in `index.html` before `FF.start()`.
It appears in the menu and on the home page automatically.

## Data to review now and then

Container sizes and payloads (`cargo.js`), the UN number list and lithium battery rules (`reference.js`) and the code lists are quick references.
Check them against current carrier, IATA, IMDG and ADR publications before relying on them.
