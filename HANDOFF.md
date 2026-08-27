# IB Sandwich App — Master Handoff
*This is the living status doc. Last updated: **Wednesday, August 27, 2026** (Eastern)*

---

## ⚙️ Process rule (for Claude, every session)

1. **Session start:** clone the repo and read this file FIRST, before doing any work. This doc supersedes the spec files in project knowledge for "where are we / what's next."
2. **Session end:** update this file — refresh Current State, add a Session Log entry, reprune Next Up — then commit and push with the session's changes.
3. Never paste live credentials into this file (secrets policy, July 22, 2026).

---

## 📍 Current state (one-paragraph version)

Demo/pre-launch at **deliorder.ibfoods.com** (Vercel auto-deploy from `main`). Customer flow complete: Build Your Own + **Signature Sandwiches (NEW Aug 27)** with mixed carts, label printing with per-item UPC barcodes, Supabase Auth on `/admin`. Admin has **Orders tab (NEW Aug 27)** — live feed, search, location filter, label reprint — plus Reports (incl. signature best-sellers), SMS Opt-Ins w/ CSV, Users. RLS enabled. Production store rollout pending business decision.

## 🗄️ Key facts

- **Repo:** github.com/ibfoods/IB-Sandwich-App · **Stack:** React 18 + Vite, Supabase, Vercel
- **Supabase project (Sandwich):** `jrdylryrawprhvefzfid` · Admin auth user: mike@ibfoods.com
- **Supabase MCP connector works** — Claude can run migrations/SQL directly (confirmed Aug 27; the advisor tool is the only one with permission issues)
- **Signature menu data:** `src/lib/signatures.js` (27 active + 3 deactivated --DELI dupes; photos in `public/signature-photos/{code}.jpg` are PDF placeholders, swap when real photography arrives; **modifiers intentionally not built yet**)
- **Shared label lib:** `src/lib/labels.js` — `printLabels()`, `rowsToPrintable()`; future ZPL generator goes here
- **Migrations run through:** `2026-08-27-add-signature-columns.sql` (applied via MCP `add_signature_columns`)

## 🔜 Next up (in rough order)

1. **Operations build — Zebra auto-print.** Buy WiFi Zebra ZD421. Decide job path: **Zebra Browser Print** on the deli-side tablet (simplest — the Orders-tab tablet becomes the print station) vs. a small dedicated print box polling Supabase. Then build ZPL generation in `labels.js` + auto-print on new-order arrival, routed by store location.
2. **Deli-side table hardware** — tablet at the deli counter left on `/admin` Orders tab (backup when a label is lost; already built).
3. **Signature label barcode verification** — print a signature label and scan it at the LOC POS to confirm the UPC-A rings up correctly.
4. **Signature modifiers** — deliberately deferred by Mike; build when he green-lights.
5. **Real signature photos** — Mike will send; drop into `public/signature-photos/`, no code changes.

## 🔐 Security punch list (remaining, pre-production)

1. **Rotate the GitHub PAT + Supabase anon key** (both exposed in plaintext in old spec versions; PAT shared with Butcher App → coordinate both repos)
2. **Constrain anon insert on `sandwich_orders`** (currently `with check (true)` — fake-order/data-integrity risk)
3. **Test kiosk device lock on real hardware** (migrated to Supabase Auth July 22, never exercised)
4. **Move Supabase creds to env vars** (still hardcoded in `supabase.js`)
5. **Butcher App security review** (still on plaintext `users` table; shares the PAT; no spec/repo provided yet)

## 🕐 Also pending (product backlog)

Pickup time + location selection (home ordering) · kiosk-vs-home mode · customer-facing SMS (provider undecided: Twilio/Telnyx/Plivo) · menu editor (SaaS prereq) · PWA install prompt · App Store submission · config.js extraction for multi-tenant · CSV export on Reports tab · test-order cleanup in Supabase · fix stale Vercel env var URL

---

## 📓 Session log

### Aug 27, 2026 — Signature Sandwiches + Orders tab
- Built **Signature Sandwiches** from Mike's GC report PDF: `signatures.js` data (names cleaned, descriptions rewritten appetizingly but ingredient-accurate, "(contains nuts)" kept on Godfather), preset prices, per-item UPCs. **Marco Polo split into Grilled + Fried** (two active items, same UPC per Mike). 3 --DELI dupes included but `active:false` (deli vs prepack report artifacts). Greatest American Hero kept active (no non-deli twin).
- Extracted 11 product photos from the PDF as placeholders → `public/signature-photos/`.
- New screens: signature menu (grouped Heroes / Wraps / Pitas & Specialty Breads), item detail w/ special-requests + label-name fields, Add-Another chooser (BYO vs Signature — mixed carts supported). Home button activated.
- **Labels:** signature labels barcode the **item UPC** (padStart 11, JsBarcode computes check digit — matches sample labels); BYO labels unchanged.
- **DB migration applied via Supabase MCP:** `item_type`, `signature_id/name/upc` columns; `bread` now nullable.
- **Admin:** stubbed Signature report now live (ranked best-sellers). Built **Orders tab** (default tab): today/7d, 15s auto-refresh, "JUST IN" badge, location filter, name/phone/order# search, full order detail, **Reprint Labels** using stored totals. Refactored label printing into shared `src/lib/labels.js` with `rowsToPrintable()`.
- Established this HANDOFF.md process.
- Commits: `6623fc7`, `5a76919`, plus this doc.

### July 22, 2026 — Security pass
Supabase critical alerts → RLS enabled, Supabase Auth migration, kiosk lock migration (unverified on hardware), plaintext creds scrubbed from spec, dead auth objects later dropped. Deployed `ad2a502`.

### July 8, 2026 — Admin panel + order features
`/admin` reporting panel, Double Meat, per-sandwich Duplicate, label-name tags, SMS opt-in capture, review scroll fix.

*(Full detail for July sessions lives in the spec files in project knowledge.)*
