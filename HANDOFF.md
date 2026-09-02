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

Demo/pre-launch at **deliorder.ibfoods.com** (Vercel auto-deploy from `main`). Customer flow complete: Build Your Own + Signature Sandwiches with mixed carts, label printing with per-item UPC barcodes, Supabase Auth on `/admin`. Admin has Orders tab (live feed, search, location filter, label reprint), Reports, SMS Opt-Ins w/ CSV, Users. RLS enabled. **ZPL label generator built (Sep 2, 2026)** — `buildZpl()` and `buildCartZpl()` in `src/lib/labels.js`, IB monogram SVG embedded as ~DG graphic, layout approved on labelary.com. Production store rollout pending business decision.

## 🔜 Next up (in rough order)

1. **Relay server** — Node.js script that receives HTTP POST with ZPL and sends to Zebra on TCP port 9100. Install as Windows Service via NSSM (no CMD windows). For testing: front desk PC at trial location (TeamViewer access). Final deployment: Windows Service + Cloudflare Tunnel (named, permanent URL, same pattern as Butcher App at Woodbury).
2. **Vercel API endpoint** — `/api/print-label` receives ZPL from browser, forwards to Cloudflare Tunnel URL.
3. **Deli UI at `/deli`** — separate URL, iPad-friendly, shows pending + in-progress orders, 5s auto-refresh, "Confirm & Print" and "Order Complete" buttons. Optional staff PIN login (4-digit, toggleable).
4. **Order status flow** — add `status` column to `sandwich_orders` (pending → in_progress → complete). Requires Supabase migration.
5. **Admin Settings tab** — per-location printer IP, auto-print toggle, staff PIN toggle, notifications toggle (greyed until Twilio active).
6. **Order-ready notifications** — Twilio SMS to customer on "Order Complete". `sms.js` already built, needs activation + env vars. No Twilio account yet — activate when rolling out to additional locations.
7. **Logo upload in admin Settings** — upload PNG/JPG/SVG → Supabase Storage → auto-convert to ZPL ~DG → replace embedded hex in label generator. For now IB monogram SVG is hardcoded in `labels.js`.
8. **Deli staff logins** — `deli_staff` table (name, 4-digit PIN, location). Optional/toggleable in admin Settings.

## 🔐 Security punch list (remaining, pre-production)

1. **Rotate the GitHub PAT + Supabase anon key** (both exposed in plaintext in old spec versions; PAT shared with Butcher App → coordinate both repos)
2. **Constrain anon insert on `sandwich_orders`** (currently `with check (true)` — fake-order/data-integrity risk once reports drive decisions)
3. **Test kiosk device lock on real hardware** (migrated to Supabase Auth July 22, never exercised on a demo iPad)
4. **Move Supabase creds to env vars** (still hardcoded in `src/lib/supabase.js`)
5. **Butcher App security review** (still on plaintext `users` table pattern; shares the PAT; no spec/repo provided yet)

## 🕐 Product backlog (not built)

- Pickup time + location selection (needed for home ordering) · kiosk-vs-home mode
- Customer-facing SMS (opt-in captured, no provider wired; Twilio/Telnyx/Plivo undecided)
- Owner-notification SMS exists in `src/lib/sms.js` but NOT activated (needs `VITE_SMS_ENABLED=true` + Twilio env vars in Vercel)
- Menu editor (SaaS prereq) · config.js extraction for multi-tenant
- PWA install prompt · App Store submission (Mike has Apple Developer account)
- CSV export on Reports tab (SMS tab already has the pattern to port)
- Signature modifiers (deliberately deferred by Mike)
- Real signature photos (Mike will send; drop into `public/signature-photos/`, no code changes)
- Test-order cleanup in Supabase · Vercel env vars still hold an old incorrect Supabase URL (hardcoded value in code is correct)
- No customer-facing error if a Supabase order save fails silently

## 💡 Future SaaS vision

Sell turnkey to other delis: app + WiFi Zebra + setup fee + subscription (~$79–99/mo + $299 setup). SMS notifications = core value prop for a no-hardware basic tier. Menu editor required before selling. Each customer: own Supabase project, Vercel deployment, domain. First beta target: Mike's uncle's brother-in-law.

---

# PART 2 — TECHNICAL REFERENCE

## Live URLs & infrastructure

- **Customer app:** https://deliorder.ibfoods.com · **Admin:** https://deliorder.ibfoods.com/admin
- **Vercel:** https://ib-sandwich-app.vercel.app (auto-deploys `main`, ~1 min) · **Repo:** github.com/ibfoods/IB-Sandwich-App
- **Stack:** React 18 + Vite · Supabase (project `jrdylryrawprhvefzfid`, separate from Butcher App) · Cloudflare CNAME → cname.vercel-dns.com
- **Fonts:** Playfair Display (headers) + DM Sans (body). Routing: no router lib — `main.jsx` renders `<Admin/>` at `/admin`, `<Deli/>` at `/deli` (not yet built), else `<App/>`; `vercel.json` catch-all rewrite.
- **Auth:** Supabase Auth. Admin user: `mike@ibfoods.com`. Add/remove admins in Supabase dashboard → Authentication → Users.
- **Supabase MCP connector works** — Claude can run migrations/SQL directly (`apply_migration`, `execute_sql`). Advisor tool has permission issues; use dashboard for security advisors.
- **Cloudflare account:** `mike@ibfoods.com` — same account as Butcher App. Zone: ibfoods.com.
- **All store desktops are Windows.** Relay will be a Windows Service via NSSM.

## Storefront locations (`src/lib/locations.js`)

New Hyde Park · Wantagh · Maspeth · Woodbury · Garden City (5 stores). Used by the customer Location screen and kiosk lock.

## Printer architecture (planned)

```
iPad/browser → Vercel /api/print-label → Cloudflare Tunnel (named, permanent)
             → Node relay (Windows Service, NSSM, front desk PC)
             → Zebra GK420t or ZD421 TCP port 9100
```

- **Test printer:** Zebra GK420t at front desk PC (currently USB — needs ethernet connected and network mode enabled via Zebra Setup Utilities to get an IP)
- **Production printer:** Zebra ZD421 WiFi (~$605-681 new from posguys.com or barcodeprintersupply.com). Don't buy until ready to deploy first store.
- **Label stock:** 4" × 2.5" direct thermal
- **ZPL spec:** 812 × 508 dots @ 203 DPI. `^PW812 ^LL508`

## ZPL label layout (approved Sep 2, 2026)

```
┌─────────────────────────────────────────────┐
│ [IB LOGO]           CUSTOMER      │ ORDER │  │
│ ibfoods.com         John Smith    │  42   │  │
│                     For: Brian    │       │  │
├─────────────────────────────────────────────┤
│ Italian Hero                                │
│ Turkey, Ham, Roast Beef                     │
│ American, Provolone                         │
│ LTO, Hot Peppers, Onion                     │
│ Oil & Vinegar, Mayo                         │
│ Note: extra crispy                          │
├─────────────────────────────────────────────┤
│ (516) 555-1234    $18.50    Woodbury        │
├─────────────────────────────────────────────┤
│  ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌   │
│           0  12345  67890  5                │
└─────────────────────────────────────────────┘
```

- Logo: IB monogram SVG embedded as ZPL ~DG graphic (88×88 dots), hardcoded in `labels.js`. Admin logo upload will replace this later.
- "For: Brian" only prints if `labelName` is set — blank = nothing printed
- BYO: bread / proteins / cheeses / toppings / dressings comma-joined per category line
- Signature: item name + "Signature Sandwich" + notes
- Barcode: UPC-A, 80 dot height (scannable). BYO = order number padded to 11. Signature = item UPC padded to 11.
- Location: full name (Woodbury, New Hyde Park, etc.)
- ~DG prepended once per job in `buildCartZpl()` — printer stores in RAM for all labels in the job

## Database — `sandwich_orders` (one row per sandwich, grouped by `cart_id`)

Columns: `id` uuid PK · `created_at` · `order_number` text · `cart_id` text · `item_index` int · `item_count` int · `first_name`/`last_name`/`phone` (required) · `email` · `bread` text **(nullable — null for signature rows)** · `proteins`/`cheeses`/`paid_toppings`/`free_toppings`/`dressings` text[] · `notes` · `double_meat` bool · `label_name` text · `sms_opt_in` bool · `location` text · `total` numeric(8,2) · `item_type` text default 'byo' · `signature_id` · `signature_name` · `signature_upc`

**Pending migration:** add `status` text default 'pending' (values: pending / in_progress / complete)

**RLS enabled.** anon INSERT (kiosk) · authenticated SELECT (admin).

**Migrations run:** `2026-06-16-add-cart-columns` · `2026-07-08-add-order-features-and-admin` · `2026-07-13-add-location` · `2026-08-27-add-signature-columns`

## File structure

```
src/
├── App.jsx        # customer flow — all screens + logic
├── Admin.jsx      # /admin — Orders, Reports, SMS Opt-Ins, Users tabs
├── main.jsx       # routes "/" vs "/admin" vs "/deli" (deli not yet built)
├── index.css
└── lib/
    ├── menu.js        # BYO menu data
    ├── signatures.js  # Signature menu (27 active items)
    ├── labels.js      # SHARED: calcTotal, fmtMoney, buildLabelHtml, printLabels,
    │                  # rowsToPrintable, buildZpl, buildCartZpl, ZPL_LOGO_GRF
    ├── locations.js   # 5 storefronts + kiosk-lock lookup
    ├── supabase.js    # client (creds hardcoded — punch-list #4)
    └── sms.js         # Twilio owner-notification (built, NOT activated)
api/
└── print-label.js     # (NOT YET BUILT) Vercel serverless — receives ZPL, forwards to tunnel
relay/
└── zebra-server.cjs   # (NOT YET BUILT) Node relay — HTTP POST → TCP 9100 → Zebra
public/signature-photos/{code}.jpg
migrations/*.sql
vercel.json
```

## Order flow (current + planned)

**Current:** customer orders → saved to Supabase → admin Orders tab shows it → staff manually reprints label if lost.

**Planned with deli UI:**
1. Order placed → status: `pending` → auto-print triggers (if toggle on) OR shows in deli UI
2. Staff taps **Confirm & Print** → label prints → status: `in_progress`
3. Staff taps **Order Complete** → Twilio SMS to customer → status: `complete`

## Deli UI (`/deli`) — planned

- Separate URL, no admin access
- iPad-optimized, large tap targets
- Shows pending + in_progress orders only, 5s auto-refresh
- Optional 4-digit staff PIN login (toggleable in admin Settings)
- Locked to a location (same pattern as kiosk lock)
- No settings, no tabs — just the order feed + two buttons per order

## Admin Settings tab — planned

Toggles: auto-print on/off · staff PIN on/off · notifications on/off (greyed until Twilio configured)
Config: per-location printer IP (stored in new `printer_settings` Supabase table)
Logo upload: PNG/JPG/SVG → Supabase Storage → ZPL ~DG conversion → replaces hardcoded logo

## Key learnings

- Supabase `security definer` functions granted to `anon` bypass RLS — hidden exposure.
- The anon key ships in the client bundle: "internal tool, no public API surface" is never true for a deployed SPA.
- iOS Home Screen icons cache aggressively — delete/re-add the icon to force fresh build.
- Multi-line source edits: inline `python3 - <<'EOF'` scripts beat fragile str_replace.
- ZPL ~DG inside ^XA works in labelary; outside ^XA causes rendering issues.
- GK420t currently USB-only at front desk PC — needs Zebra Setup Utilities to switch to network mode before relay can reach it.
- All store desktops are Windows. Use NSSM for Windows Services (no CMD windows).
- Zebra GK420t label stock: 4" × 2.5". Access program was incorrectly set to 2.75" — trust the physical measurement.

---

# 📓 SESSION LOG

### Sep 2, 2026 — ZPL label generator + layout design
- Confirmed printer architecture: relay (Windows Service + Cloudflare Tunnel) on front desk PC → Zebra GK420t/ZD421 on store network. Same pattern as Butcher App at Woodbury.
- Confirmed all store desktops are Windows. NSSM for services, no CMD windows.
- GK420t currently USB-only — can't reconfigure without disrupting existing use. Will test relay against ZD421 when purchased for first store deployment.
- Designed ZPL label layout collaboratively: logo + ibfoods.com | customer + For: X | ORDER box / separator / item lines comma-joined / separator / phone+total+location footer / full-width barcode.
- Converted IB monogram SVG to ZPL ~DG graphic (88×88 dots, 203 DPI) using cairosvg + Pillow. Embedded in `labels.js` as `ZPL_LOGO_GRF` constant.
- Built `buildZpl()` and `buildCartZpl()` in `src/lib/labels.js`. Layout approved on labelary.com.
- Full location names in footer (not abbreviations) — enough room.
- Discussed full scope: deli UI, order status flow, relay, admin Settings, staff PINs, notifications. All planned, none built yet.
- Discussed ZD421 purchase (~$605-681 new) — defer until first store ready.
- Commits: `0b3693b`, `d419ca9`, `e15ea0a`, + this HANDOFF update.

### Aug 27, 2026 — Signature Sandwiches + Orders tab + HANDOFF process
- Built Signature Sandwiches (27 items, 3 screens, mixed-cart chooser). DB migration via Supabase MCP.
- Built Orders tab (default admin view, live feed, filters, search, reprint). Refactored labels into `lib/labels.js`.
- Established HANDOFF.md process.

### July 22, 2026 — Security pass
RLS enabled, Supabase Auth migration, kiosk lock migrated, creds scrubbed. Dead auth objects dropped later.

### July 13, 2026 — Locations
`location` column, locations.js, location screen, kiosk lock.

### July 8, 2026 — Admin panel + order features
`/admin` reporting, Double Meat, Duplicate sandwich, label-name tags, SMS opt-in, review scroll fix.

### June 16, 2026 — Multi-sandwich carts
`cart_id` / `item_index` / `item_count` migration.
