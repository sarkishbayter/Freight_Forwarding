# My Calculators

A small static website for the calculations I use often. First section: a currency converter.

## How the rates stay current

- `scripts/update_rates.py` downloads the official **European Central Bank** daily reference rates.
- `.github/workflows/update-rates.yml` runs it every weekday at 17:30 UTC and commits `data/rates.json` if it changed.
- The page reads `data/rates.json`. No server, no API key.
- The ECB publishes about 30 currencies and **not** the Lebanese pound. LBP comes from `data/manual-rates.json`
  (units per 1 USD). Edit that number when the Banque du Liban rate changes.

## Publish on GitHub

1. Create a new repository on GitHub (for example `calculators`).
2. Upload everything in this folder (or `git init`, `git add .`, `git commit`, `git push`).
3. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
4. Repo **Actions** tab → *Update exchange rates* → **Run workflow** once, so live rates replace the sample data.
5. Your site is at `https://<your-username>.github.io/<repo-name>/`.

## Adding another calculator

Add a link in the `<nav>` and a new `<section class="card">` in `index.html`, then put its code in a new JS file.
