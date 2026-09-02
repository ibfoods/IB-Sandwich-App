# IB Sandwich App — Master Handoff (Total Project State)
*This is the living status + reference doc for the whole project. Last updated: **Wednesday, September 2, 2026** (Eastern)*

---

## ⚙️ Process rule (for Claude, every session)

1. **Session start:** clone the repo and read this file FIRST, before doing any work. This doc is the source of truth for total project state — it supersedes the spec files in project knowledge.
2. **Session end:** update this file — refresh Part 1 (status) and any Part 2 (reference) sections that changed, add a Session Log entry — then commit and push with the session's changes.
3. Never paste live credentials into this file (secrets policy, July 22, 2026).

---

# PART 1 — STATUS

## 📍 Current state (one-paragraph version)

Demo/pre-launch at **deliorder.ibfoods.com**. Three URLs live: `/` (customer kiosk), `/admin` (management), `/counter` (employee ordering station). Customer kiosk: full BYO + Signature Sandwiches flow, multi-sandwich carts, label printing. Counter: PIN entry → In-Store or Phone Order → Quick Build or Signature → review with Duplicate/Remove → confirm & print. Admin: Orders tab (live feed, reprint), Reports, SMS Opt-Ins, Users, **Settings tab** (staff PINs, app toggles, instore label text). ZPL label generator built and approved on labelary.com. RLS enabled. `/deli` order screen not yet built.

## 🔜 Next up (in rough order)

1. **`/deli` screen** — open orders feed (pending + in-progress), "Confirm & Print" → in_progress, "Order Complete" → complete + customer notification. iPad-optimized, locked to location, optional staff PIN.
2. **Relay server** — Node.js Windows Service (NSSM) + Cloudflare Tunnel for Zebra auto-print. Front desk PC at trial location. Code not yet written.
3. **Vercel API endpoint** — `/api/print-label` receives ZPL, forwards to tunnel.
4. **Deli number field** on customer kiosk — toggle-gated (setting exists in DB, UI not wired yet).
5. **Kiosk polish** — background, feel, "Powered by OrderHQ" footer logo. Direction TBD — will revisit after workflow is complete.
6. **Signature sandwich upload** in admin — add/edit signatures through UI, no code deploys.
7. **Order-ready notifications** — Twilio SMS. `sms.js` built, not activated. No Twilio account yet.
8. **Logo upload** in admin Settings — Supabase Storage + ZPL ~DG conversion.

## 🔐 Security punch list (remaining, pre-production)

1. **Rotate the GitHub PAT + Supabase anon key** (both exposed in plaintext in old spec versions; PAT shared with Butcher App)
2. **Constrain anon insert on `sandwich_orders`** (currently `with check (true)`)
3. **Test kiosk device lock on real hardware** (migrated July 22, never exercised)
4. **Move Supabase creds to env vars** (hardcoded in `src/lib/supabase.js`)
5. **Butcher App security review** (same PAT, plaintext auth)

## 🕐 Product backlog (not built)

- Pickup time + location selection · kiosk-vs-home mode
- Customer-facing SMS (opt-in captured, no provider wired)
- Owner-notification SMS (`sms.js` built, NOT activated — needs `VITE_SMS_ENABLED=true` + Twilio env vars)
- Menu editor (SaaS prereq) · config.js extraction for multi-tenant
- PWA install prompt · App Store submission (Mike has Apple Developer account)
- CSV export on Reports tab
- Signature modifiers on customer kiosk (deferred)
- Real signature photos (Mike will send; drop into `public/signature-photos/`, no code changes)
- Test-order cleanup in Supabase

## 💡 Future SaaS / OrderHQ vision

Sell turnkey to other delis: app + WiFi Zebra + setup fee + subscription (~$79–99/mo + $299 setup). SMS notifications = core value prop. Menu editor required before selling. Each customer: own Supabase project, Vercel deployment, domain. "Powered by OrderHQ" branding planned for kiosk footer.

---

# PART 2 — TECHNICAL REFERENCE

## Live URLs & infrastructure

- **Customer kiosk:** https://deliorder.ibfoods.com
- **Admin:** https://deliorder.ibfoods.com/admin (Supabase Auth — `mike@ibfoods.com`)
- **Counter:** https://deliorder.ibfoods.com/counter (staff PIN — 7929 / Iavarone Bros / IB)
- **Deli:** https://deliorder.ibfoods.com/deli (NOT YET BUILT)
- **Vercel:** https://ib-sandwich-app.vercel.app · **Repo:** github.com/ibfoods/IB-Sandwich-App
- **Stack:** React 18 + Vite · Supabase (`jrdylryrawprhvefzfid`) · Cloudflare CNAME → cname.vercel-dns.com · Cloudflare account: `mike@ibfoods.com`
- **Fonts:** Playfair Display (headers) + DM Sans (body)
- **Routing:** `main.jsx` — `/admin` → Admin, `/counter` → Counter, `/deli` → Deli (not built), else → App. `vercel.json` catch-all rewrite.
- **All store desktops are Windows.** Relay will be Windows Service via NSSM.

## URL / device map

| URL | Device | Auth | Purpose |
|-----|--------|------|---------|
| `/` | Customer kiosk iPad | None (anon) | Customer self-serve ordering |
| `/counter` | Employee iPad/tablet | Staff PIN | Employee ordering (in-store + phone) |
| `/deli` | Deli counter iPad | TBD | Open orders, confirm & print, order complete |
| `/admin` | Manager laptop/iPad | Supabase Auth | Reports, settings, order management |

## Database tables

**`sandwich_orders`** — one row per sandwich
Key columns: `order_number`, `cart_id`, `item_index`, `item_count`, `first_name`, `last_name`, `phone`, `email`, `bread` (nullable for sig), `proteins[]`, `cheeses[]`, `paid_toppings[]`, `free_toppings[]`, `dressings[]`, `notes`, `double_meat`, `label_name`, `sms_opt_in`, `location`, `total`, `item_type` (byo/signature), `signature_id`, `signature_name`, `signature_upc`, `remove_items[]`, `add_items[]`, `status` (pending/in_progress/complete), `made_by` (staff initials), `deli_number`, `order_source` (kiosk/counter_instore/counter_phone)

**`staff_pins`** — global, one PIN per employee
`id`, `name`, `initials`, `pin` (4-digit, unique), `active`
Current: Iavarone Bros / IB / 7929

**`app_settings`** — key/value, `location_id` null = global
Current keys: `deli_number_enabled`, `auto_print_enabled`, `staff_pin_enabled`, `instore_label_text`, `phone_required`, `email_required`, `sms_optin_shown`, `notifications_enabled`

**RLS:** enabled on all tables. anon INSERT on `sandwich_orders`. anon SELECT on `staff_pins`, `app_settings`. authenticated full access everywhere.

**Migrations run:** `add-cart-columns` · `add-order-features-and-admin` · `add-location` · `add-signature-columns` · `add-signature-modifiers-and-order-status` · `add-staff-pins-and-app-settings` · `seed-first-staff-pin` · `refresh-sandwich-orders-insert-policy` · `grant-anon-insert-sandwich-orders`

**Important:** `grant insert on sandwich_orders to anon` must be run in the Supabase SQL Editor directly — `apply_migration` MCP tool cannot apply grants (insufficient permissions). This was done on Sep 2. If RLS errors return, check grants first with `select has_table_privilege('anon', 'sandwich_orders', 'INSERT')`.

## File structure

```
src/
├── App.jsx        # customer kiosk — all screens
├── Admin.jsx      # /admin — Orders, Reports, SMS, Users, Settings tabs
├── Counter.jsx    # /counter — PIN, order type, quick build, sig, review
├── main.jsx       # routes /admin → Admin, /counter → Counter, /deli → Deli (NYB), / → App
├── index.css
└── lib/
    ├── menu.js        # BYO menu — NOTE: ALL_BREADS, CHEESES, FREE_TOPPINGS, DRESSINGS
    │                  # are plain STRING arrays. PROTEINS, PAID_TOPPINGS are objects.
    ├── signatures.js  # 27 active signature items + helpers
    ├── labels.js      # calcTotal, fmtMoney, buildLabelHtml, printLabels,
    │                  # rowsToPrintable, buildZpl, buildCartZpl, ZPL_LOGO_GRF
    ├── locations.js   # 5 storefronts
    ├── supabase.js    # client (creds hardcoded — punch-list #4)
    └── sms.js         # Twilio owner-notification (built, NOT activated)
api/
└── print-label.js     # NOT YET BUILT — Vercel serverless ZPL forwarder
relay/
└── zebra-server.cjs   # NOT YET BUILT — Node relay → TCP 9100 → Zebra
public/
├── logo.jpg           # Black IB crest
├── monogram.svg       # Red IB monogram (also converted to ZPL ~DG in labels.js)
├── app-icon.png
└── signature-photos/  # Placeholder photos — swap files, no code changes
```

## Counter flow

```
PIN entry (4-digit numpad) → Order Type (In-Store | Phone Order)
  Phone → Customer Info (name/phone/email) → Build Type
  In-Store → Build Type
Build Type → Quick Build (BYO: bread+proteins one screen) | Signature menu
Quick Build → Cheese & Toppings (combined) → Notes → Review
Signature → Detail (ingredients prominent, Remove/Add chips) → Review
Review → Duplicate / Remove per sandwich → Confirm & Print → Confirmation
New Order resets to Order Type (staff stays logged in)
```

**Key Counter details:**
- `order_source`: `counter_instore` or `counter_phone`
- `made_by`: staff initials (e.g. "IB") — prints small on ZPL label footer
- In-store orders use `instore_label_text` setting as the customer name on the label
- L&T quick button in toppings section — selects Lettuce + Tomatoes in one tap, doesn't double-highlight individual chips
- Menu data gotcha: ALL_BREADS/CHEESES/FREE_TOPPINGS/DRESSINGS are strings; use `b` not `b.name`

## Admin Settings tab

- **Toggles:** deli_number_enabled, auto_print_enabled, staff_pin_enabled, notifications_enabled
- **Text field:** instore_label_text (default: "Sandwich Order")
- **Staff PINs:** list, add (auto-derives initials from name), activate/deactivate, remove
- **Admin Users:** links to Supabase Auth dashboard

## ZPL label (approved Sep 2, 2026)

4" × 2.5" / 812×508 dots @ 203 DPI. IB monogram ~DG embedded in `labels.js`.
Layout: Logo + ibfoods.com | Customer name + For: X | ORDER box / separator / items comma-joined / separator / phone + total + location / full-width UPC-A barcode.
`Made by: XX` prints small below footer when `madeBy` param passed.
`buildCartZpl(orderNum, customer, cart, location, madeBy)` — prepends ~DG once per job.

## Printer architecture (planned, not built)

```
iPad → Vercel /api/print-label → Cloudflare Tunnel (named, permanent)
     → Node relay (Windows Service, NSSM) on front desk PC
     → Zebra GK420t or ZD421 TCP port 9100
```

Test printer: GK420t at front desk PC (currently USB — needs ethernet + Zebra Setup Utilities to get network IP before relay can reach it). Don't reconfigure without downtime window.
Production: ZD421 WiFi (~$605-681, posguys.com) — buy when first store ready.

## Key gotchas & learnings

- **Menu data types:** ALL_BREADS, CHEESES, FREE_TOPPINGS, DRESSINGS = plain strings. PROTEINS, PAID_TOPPINGS = objects with `.name`, `.roll`, `.hero`.
- **Grant vs RLS:** Supabase RLS and table grants are separate. 42501 = permissions error (grant missing), not RLS. Run grants in SQL Editor directly — MCP `apply_migration` can't apply grants.
- **Session bleed:** Admin Supabase Auth session persists in localStorage. Testing counter/kiosk on same browser as admin will cause 42501 insert errors. Not a production issue (dedicated devices).
- **ZPL ~DG inside ^XA** — labelary needs ~DG inside ^XA; real Zebra printers accept it either way.
- **GK420t currently USB** — don't reconfigure without a downtime window.
- **iOS Home Screen icons cache aggressively** — delete/re-add to force fresh build.
- **Multi-line source edits** — `python3 - <<'PYEOF'` heredocs beat fragile str_replace for complex patches.
- **Supabase MCP `execute_sql`** is read-only — use `apply_migration` for DDL, SQL Editor for grants.

---

# 📓 SESSION LOG

### Sep 2, 2026 — Counter screen, Settings tab, ZPL generator, modifiers

**ZPL label generator:**
- Built `buildZpl()` + `buildCartZpl()` in `labels.js`. 4"×2.5", 203 DPI, IB monogram SVG converted to ~DG graphic (88×88 dots). Layout designed and approved on labelary.com. Full location names in footer.

**Signature sandwich modifiers:**
- Remove chips (Lettuce/Tomato/Onion/Hot Peppers/Dressing/Sauce) + Add chips (Extra Cheese/Extra Meat/Bacon/Avocado/Fresh Mozzarella) on both customer kiosk and counter signature detail screens.
- Print as `NO:` and `ADD:` lines on ZPL and HTML labels.
- DB: `remove_items[]`, `add_items[]` columns added.
- Fixed "Continue to Bread →" → "Continue →" in signature flow.

**Counter screen (`/counter`):**
- Full employee ordering station built as `Counter.jsx`.
- PIN entry (numpad, no lockout) → In-Store or Phone Order → Quick Build or Signature → Review → Confirm & Print.
- Quick Build: bread + proteins one screen. Cheese & Toppings: combined screen. L&T quick button.
- Duplicate + Remove per sandwich in review.
- `made_by` (initials), `order_source`, `status` saved to DB.
- Staff PIN seeded: Iavarone Bros / IB / 7929.
- Fixed: ALL_BREADS/CHEESES/FREE_TOPPINGS/DRESSINGS are strings not objects.
- Fixed: toppings not showing in review. Fixed: L&T double-highlight on Tomatoes chip.

**Admin Settings tab:**
- Toggle switches: deli number, auto-print, staff PIN, notifications.
- Instore label text field.
- Staff PIN management: list, add (auto-initials), activate/deactivate, remove.
- Admin Users section links to Supabase Auth dashboard.

**DB migrations this session:**
`add-signature-modifiers-and-order-status` · `add-staff-pins-and-app-settings` · `seed-first-staff-pin` · `refresh-sandwich-orders-insert-policy` · `grant-anon-insert-sandwich-orders`

**Architecture decisions:**
- 4 URLs/apps: `/` kiosk, `/counter` employee, `/deli` deli (NYB), `/admin` management.
- All store desktops Windows. Relay = NSSM Windows Service + Cloudflare Tunnel.
- GK420t currently USB, can't reconfigure without disrupting existing use. Test against ZD421 when purchased.
- "Powered by OrderHQ" logo planned for kiosk footer — polish deferred.

**Commits:** `2f33c98`, `bbab9c6`, `0cebd64`, `a1d3ddc`, `ae13381`, `c573b13`, `1f6e02e`, `b7a34fb`, `665e7f6`, `b0bd0a1`, + this HANDOFF.

### Aug 27, 2026 — Signature Sandwiches + Orders tab + HANDOFF process
Built Signature Sandwiches (27 items, 3 screens, mixed-cart). Admin Orders tab (live feed, filters, search, reprint). Refactored labels into `lib/labels.js`. Established HANDOFF.md process.

### July 22, 2026 — Security pass
RLS enabled, Supabase Auth migration, kiosk lock migrated, creds scrubbed.

### July 13, 2026 — Locations
`location` column, locations.js, location screen, kiosk lock.

### July 8, 2026 — Admin panel + order features
`/admin` reporting, Double Meat, Duplicate sandwich, label-name tags, SMS opt-in, review scroll fix.

### June 16, 2026 — Multi-sandwich carts
`cart_id` / `item_index` / `item_count` migration.
