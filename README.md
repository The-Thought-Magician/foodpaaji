# FoodPaaji

A desktop restaurant management system built with Tauri, Next.js, and Rust. Runs as a native app on Linux, macOS, and Windows with a local SQLite database — no server required.

## Features

- **Point of Sale** — cart with menu picker, table selector, coupon/promo validation, UPI QR at checkout, loyalty points earn/redeem
- **Billing Management** — bill history, date/customer/status filters, GST summary, refund marking, receipt generation, CSV export
- **Kitchen Display** — live order board for kitchen staff, status updates (pending → preparing → ready)
- **Menu Management** — categories, items, variants, modifiers, image upload, pricing strategies, bulk price updates
- **Inventory** — stock tracking, low-stock alerts, unit conversions, FIFO/LIFO valuation, transfers, auto-deduction on order completion
- **Customer Management** — profiles, visit history, loyalty points, segment tagging (VIP/Regular/Loyal/New)
- **Employee Management** — CRUD, clock-in/out, break tracking, attendance reports, salary estimation, role-based access
- **Reservations** — table booking, availability checker, table QR codes
- **Promotions** — promo codes, coupons, announcements with priority/targeting
- **Sales Reports** — date-range revenue, daily breakdown, peak hours, top items, CSV export
- **Dashboard** — daily revenue, active orders, payment method split, 7-day chart, top selling items, announcements
- **Settings** — restaurant profile, UPI ID, GSTIN, tax/service charge defaults, receipt footer, database backup/restore

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| Frontend | Next.js 15, React 19, TypeScript (strict), Tailwind CSS 4 |
| Backend | Rust, Axum-style Tauri commands |
| Database | SQLite via SQLx (auto-migrated on first run) |
| Package manager | pnpm |

## Prerequisites

- [Rust](https://rustup.rs/) (stable, 1.70+)
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- Linux: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`
- macOS: Xcode command line tools
- Windows: Visual Studio Build Tools with C++ workload

## Running in Development

```bash
cd app
pnpm install
pnpm dev
```

This starts the Next.js frontend on port 3000 and launches the Tauri window. The SQLite database is created automatically at first launch inside the app data directory (`~/.local/share/com.foodpaaji.restaurant/` on Linux).

## Building for Production

```bash
cd app
pnpm build
```

Output bundles are placed in `src-tauri/target/release/bundle/`:
- `.deb` — Debian/Ubuntu
- `.rpm` — Fedora/RHEL
- `.AppImage` — portable Linux
- `.dmg` — macOS
- `.msi` / `.exe` — Windows

## Project Structure

```
app/
  src/                  Next.js frontend
    app/                Pages (App Router)
    components/         Reusable UI components
    views/              Page-level view components
    lib/                Utilities and settings
    types/              TypeScript interfaces
  src-tauri/
    src/
      modules/          Rust backend modules (one per domain)
      database/         SQLx pool setup and migrations
      lib.rs            Tauri command registration
    migrations/         SQL migration files (auto-run on startup)
docs/
  idea.md               Original product spec
  plan.md               Development plan and phase breakdown
```

## Configuration

All settings are stored locally via the Settings page in the app. No `.env` file needed for runtime — the database path is resolved automatically per platform.

For development, `src-tauri/.env` sets `DATABASE_URL` for SQLx tooling:

```
DATABASE_URL=sqlite:./foodpaaji.db
```

## Loyalty Points

- Earn: 1 point per ₹10 spent
- Redeem: 1 point = ₹1 discount (applied at POS checkout)
