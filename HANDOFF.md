# IB Sandwich App — Master Handoff (Total Project State)
*This is the living status + reference doc for the whole project. Last updated: **Wednesday, August 27, 2026** (Eastern)*

---

## ⚙️ Process rule (for Claude, every session)

1. **Session start:** clone the repo and read this file FIRST, before doing any work. This doc is the source of truth for total project state — it supersedes the spec files in project knowledge.
2. **Session end:** update this file — refresh Part 1 (status) and any Part 2 (reference) sections that changed, add a Session Log entry — then commit and push with the session's changes.
3. Never paste live credentials into this file (secrets policy, July 22, 2026).

---

# PART 1 — STATUS

## 📍 Current state (one-paragraph version)

Demo/pre-launch at **deliorder.ibfoods.com** (Vercel auto-deploy from `main`). Customer flow complete: Build Your Own + **Signature Sandwiches (Aug 27)** with mixed carts, label printing with per-item UPC barcodes, Supabase Auth on `/admin`. Admin has **Orders tab (Aug 27)** — live feed, search, location filter, label reprint — plus Reports (incl. signature best-sellers), SMS Opt-Ins w/ CSV, Users. RLS enabled. Production store rollout pending business decision.

## 🔜 Next up (in rough order)

1. **Operations build — Zebra auto-print.** Buy WiFi Zebra ZD421. Decide job path: **Zebra Browser Print** on the deli-side tablet (simplest — the Orders-tab tablet becomes the print station) vs. a small dedicated print box polling Supabase. Then build ZPL generation in `labels.js` + auto-print on new-order arrival, routed by store location.
2. **Deli-side table hardware** — tablet at the deli counter left on `/admin` Orders tab (backup when a label is lost; software already built).
3. **Signature label barcode verification** — print a signature label and scan it at the LOC POS to confirm the UPC-A rings up correctly.
4. **Signature modifiers** — deliberately deferred by Mike; build when he green-lights.
5. **Real signature photos** — Mike will send; drop into `public/signature-photos/`, no code changes.

## 🔐 Security punch list (remaining, pre-production)

1. **Rotate the GitHub PAT + Supabase anon key** (both exposed in plaintext in old spec versions; PAT shared with Butcher App → coordinate both repos)
2. **Constrain anon insert on `sandwich_orders`** (currently `with check (true)` — fake-order/data-integrity risk once reports drive decisions)
3. **Test kiosk device lock on real hardware** (migrated to Supabase Auth July 22, never exercised on a demo iPad)
4. **Move Supabase creds to env vars** (still hardcoded in `src/lib/supabase.js`)
5. **Butcher App security review** (still on plaintext `users` table pattern; shares the PAT; no spec/repo provided yet)

## 🕐 Product backlog (not built)

- Pickup time + location selection (needed for home ordering) · kiosk-vs-home mode
- Customer-facing SMS (opt-in captured, no provider wired; Twilio/Telnyx/Plivo undecided — see OrderHQ notes)
- Owner-notification SMS exists in `src/lib/sms.js` but NOT activated (needs `VITE_SMS_ENABLED=true` + Twilio env vars in Vercel)
- Menu editor (SaaS prereq) · config.js extraction for multi-tenant (IB-specific values scattered in App.jsx)
- PWA install prompt · App Store submission (Mike has Apple Developer account)
- CSV export on Reports tab (SMS tab already has the pattern to port)
- Test-order cleanup in Supabase · Vercel env vars still hold an old incorrect Supabase URL (hardcoded value in code is the correct one)
- Label printing inconsistent across machines via browser dialog (goes away with Zebra/ZPL)
- No customer-facing error if a Supabase order save fails silently

## 💡 Future SaaS vision

Sell turnkey to other delis: app + WiFi Zebra + setup fee + subscription (~$79–99/mo + $299 setup). SMS notifications = core value prop for a no-hardware basic tier. Menu editor required before selling. Each customer: own Supabase project, Vercel deployment, domain. First beta target: Mike's uncle's brother-in-law.

---

# PART 2 — TECHNICAL REFERENCE

## Live URLs & infrastructure

- **Customer app:** https://deliorder.ibfoods.com · **Admin:** https://deliorder.ibfoods.com/admin
- **Vercel:** https://ib-sandwich-app.vercel.app (auto-deploys `main`, ~1 min) · **Repo:** github.com/ibfoods/IB-Sandwich-App
- **Stack:** React 18 + Vite · Supabase (project `jrdylryrawprhvefzfid`, separate from Butcher App) · Cloudflare CNAME → cname.vercel-dns.com
- **Fonts:** Playfair Display (headers) + DM Sans (body). Routing: no router lib — `main.jsx` renders `<Admin/>` at `/admin` else `<App/>`; `vercel.json` catch-all rewrite prevents `/admin` 404 on refresh.
- **Auth:** Supabase Auth. Admin user: `mike@ibfoods.com`. Add/remove admins + password resets in Supabase dashboard → Authentication → Users (Auto Confirm User on create). Browser can't manage auth users (no service role key client-side) — admin Users tab just links to the dashboard.
- **Supabase MCP connector works** — Claude can run migrations/SQL directly (confirmed Aug 27: `apply_migration`, `execute_sql`). Only the advisor tool has permission issues; use the dashboard for security advisors.
- **Secrets policy:** GitHub PAT + anon key were once in plaintext spec files — treat as compromised (rotation is punch-list #1). PAT is in the clone URL pattern from project context; never write credentials into this doc.

## Storefront locations (`src/lib/locations.js`)

New Hyde Park · Wantagh · Maspeth · Woodbury · Garden City (5 stores, each with address + phone). Used by the customer Location screen and the kiosk lock.

## Database — `sandwich_orders` (one row per sandwich, grouped by `cart_id`)

Columns: `id` uuid PK · `created_at` · `order_number` text · `cart_id` text · `item_index` int · `item_count` int · `first_name`/`last_name`/`phone` (required) · `email` · `bread` text **(nullable as of Aug 27 — null for signature rows)** · `proteins`/`cheeses`/`paid_toppings`/`free_toppings`/`dressings` text[] · `notes` · `double_meat` bool · `label_name` text · `sms_opt_in` bool · `location` text · `total` numeric(8,2) · **`item_type` text default 'byo' · `signature_id` · `signature_name` · `signature_upc` (all Aug 27)**

**RLS enabled.** Policies: anon INSERT `with check (true)` (kiosk writes — tightening is punch-list #2) · authenticated SELECT (admin reads). Reason RLS matters: the anon key ships in the client bundle, so without RLS anyone could read all orders (this was Supabase's July 20 critical flag).

**Migrations (run in order):** `2026-06-16-add-cart-columns` · `2026-07-08-add-order-features-and-admin` · `2026-07-13-add-location` · `2026-08-27-add-signature-columns` (applied via MCP). The July 8 `sandwich_admin_users` table + `verify_admin()` fn were later dropped (security-definer fn was an RLS bypass — lesson learned).

## File structure

```
src/
├── App.jsx        # customer flow — all screens + logic
├── Admin.jsx      # /admin — Orders, Reports, SMS Opt-Ins, Users tabs
├── main.jsx       # routes "/" vs "/admin"
├── index.css
└── lib/
    ├── menu.js        # BYO menu data (breads, proteins, cheeses, toppings, dressings)
    ├── signatures.js  # Signature menu data (see below)
    ├── labels.js      # SHARED: calcTotal, fmtMoney, buildLabelHtml, printLabels, rowsToPrintable (future ZPL home)
    ├── locations.js   # 5 storefronts + kiosk-lock lookup
    ├── supabase.js    # client (creds hardcoded — punch-list #4)
    └── sms.js         # Twilio owner-notification module (built, NOT activated)
public/signature-photos/{code}.jpg   # 11 placeholder photos from GC report PDF
migrations/*.sql
vercel.json
```

## Customer flow

**Home** → Build Your Own | **Signature Sandwiches** (both live) → Location picker (skipped if kiosk-locked) → Customer Info (name/phone required, email optional, SMS opt-in checkbox) → then branches:

- **BYO:** Bread (rolls/hero/wraps) → Protein (≤4, Double Meat toggle = +50% of highest-priced protein) → Cheese (≤2) → Toppings (paid unlimited / free ≤2 / dressings ≤2) → Notes + "Name For This Sandwich" → Review
- **Signature:** menu grouped **Heroes / Wraps / Pitas & Specialty Breads** (photo, description, preset price) → detail screen (photo, description, special-requests box with register-upcharge note, label-name field) → Review

**Review:** per-sandwich Edit / Duplicate / Remove, Edit Info link, **Add Another Sandwich → chooser (BYO vs Signature) — mixed carts supported**. Editing a signature item reopens its detail screen; back from there allows swapping the item while keeping notes. → **Confirmation:** order #, Print Label(s), Duplicate This Order (whole-cart clone for a new customer — distinct from per-sandwich Duplicate), New Order.

**Kiosk device lock:** hidden Device Settings via 5 taps on Home footer; Supabase Auth login then **immediate signOut** (no admin JWT left on shared iPad — unverified on hardware, punch-list #3). One-time URL setup also works: `?lockLocation=Maspeth` / `?unlockLocation=1`.

## Pricing logic (BYO)

Highest-priced protein only (not sum) · Double Meat +50% of that base · cheese $1.50 roll / $2.00 hero · paid toppings individual roll/hero upcharges · free toppings + dressings $0. **Signature items: flat preset price, no computation.**

## Signature Sandwiches (`src/lib/signatures.js`)

- **27 active items** + **3 deactivated** `--DELI` dupes (deli vs prepack report artifacts — flip `active:true` to restore). Greatest American Hero kept active (no non-deli twin).
- **Marco Polo split into Grilled + Fried** — two active items, same price/UPC (per Mike: not dupes, distinct items).
- Fields per item: `id`, `code` (store PLU, keys photo filename), `upc`, `active`, `category`, `name`, `price`, `description` (appetizing but ingredient-accurate; "(contains nuts)" kept on Godfather/mortadella), `ingredients`, `photo`.
- **Modifiers intentionally NOT built yet.** Special requests go through the notes field, flagged "subject to upcharge at the register."
- Photos are low-res PDF extractions (placeholders); real photos = file swap, zero code changes. Items without photos show a monogram placeholder.

## Label printing (`src/lib/labels.js`)

- Browser flow: new window, print-ready HTML, 4.25×2.75in landscape, JsBarcode UPC-A, auto-opens print dialog. Manual today — prints on whatever printer the tapping device is set up with; the saved `location` column plays no printing role yet.
- **Barcodes:** BYO = order number (multi-sandwich: `orderNum + index`) padded to 12. **Signature = the item's UPC padded to 11 digits, JsBarcode computes the check digit** (matches the store's sample labels; POS scan verification pending).
- Layout: logo + ibfoods.com | customer name (ALWAYS present — bagging rule; never replaced by label name) + optional gold "X's Sandwich" tag | boxed order # + DOUBLE MEAT flag | item block (signature: item name + "Signature Sandwich") | notes | phone / total / barcode.
- `rowsToPrintable(rows)` converts DB rows → printable order for admin reprints; reprints use the **stored** total (price-drift-proof) and fall back to stored `signature_name`/`upc` if an item is ever removed from signatures.js.
- **Zebra plan:** ZPL generator will live in this file, sharing `rowsToPrintable()` with browser printing.

## Admin panel (`/admin`)

Supabase Auth gated; session persists via `getSession()`; Log out calls `signOut()`.

- **Orders (default tab, Aug 27):** Today / Last 7 Days, 15s auto-refresh, "JUST IN" badge (<2 min), location dropdown, search by name/phone/order#, grouped order cards (items, notes highlighted, per-item + order totals), **Reprint Labels**. This is the deli-side lost-label view.
- **Reports:** date range + 7/30/90d presets; stat boxes (orders, sandwiches, revenue, double meat, SMS opt-ins); ranked proteins, cheeses, protein+cheese combos (top 15), orders by location, **Most Popular Signature Sandwiches (live as of Aug 27)**.
- **SMS Opt-Ins:** de-duped by phone, CSV export.
- **Users:** instructions + link to Supabase dashboard (no client-side user management by design).
- Not built: roles (all admins identical), Reports CSV export.

## SMS — two separate concepts, don't conflate

1. **Owner notification** (`sms.js`): Twilio text to the deli owner on order confirm. Built, dormant (env vars needed).
2. **Customer opt-in** (Customer Info checkbox → `sms_opt_in` column): data capture only; no customer-facing sender wired; provider undecided.

## Key learnings

- Supabase `security definer` functions granted to `anon` bypass RLS — hidden exposure even with RLS on.
- The anon key ships in the client bundle: "internal tool, no public API surface" is never true for a deployed SPA.
- iOS Home Screen icons cache aggressively — delete/re-add the icon to test a fresh deploy; plain Safari tabs are more reliable for debugging.
- Flex bug pattern: `overflow:hidden` on a flex child with implicit `min-height:0` silently clips; `flexShrink:0` fixes. iPad touch-scroll inside `position:fixed` needs `-webkit-overflow-scrolling:touch` + `min-height:0`.
- Multi-line source edits: inline `python3 - <<'EOF'` scripts beat fragile str_replace.

---

# 📓 SESSION LOG

### Aug 27, 2026 — Signature Sandwiches + Orders tab + this doc
- Built Signature Sandwiches from Mike's GC report PDF (data file, 3 new screens, mixed-cart chooser, Home button live). Marco Polo split Grilled/Fried; --DELI dupes deactivated. Extracted 11 placeholder photos.
- Signature labels barcode the item UPC. DB migration applied **via Supabase MCP** (`add_signature_columns`).
- Admin: Signature best-sellers report live; **Orders tab** built (live feed, filters, search, reprint). Label code refactored into shared `lib/labels.js`.
- Established HANDOFF.md as total-state master doc + session workflow rule (also saved to Claude memory).
- Commits: `6623fc7`, `5a76919`, `b4bc55a`, + this update.

### July 22, 2026 — Security pass
Supabase critical alerts (RLS disabled, sensitive columns exposed) → RLS enabled + policies, admin auth migrated to Supabase Auth (interim `verify_admin()` fn abandoned as an RLS bypass), kiosk lock migrated (unverified on hardware), Users tab → dashboard links, plaintext creds scrubbed from spec. Dead auth objects dropped in a later session. Deployed `ad2a502`.

### July 13, 2026 — Locations
Added `location` column + locations.js, location screen, kiosk lock groundwork. *(Reconstructed from migration file + code.)*

### July 8, 2026 — Admin panel + order features
`/admin` reporting panel (then plaintext-table auth), Double Meat, per-sandwich Duplicate, "Name For This Sandwich" label tags (account name always kept — bagging rule), SMS opt-in capture, review scroll fix, vercel.json SPA rewrite.

### June 16, 2026 — Multi-sandwich carts
`cart_id` / `item_index` / `item_count` migration; cart support.
