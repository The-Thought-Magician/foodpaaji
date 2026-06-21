# FoodPaaji

A desktop restaurant management system built with Tauri v2, Next.js 15, and Rust. Runs as a native app on Linux, macOS, and Windows with a local SQLite database — no internet or server required.

---

## Features

### Point of Sale (POS)
- Browse menu items by category and add to cart with one click
- Manual cart entry with item name, quantity, and price
- Table picker dropdown (populated from your configured tables) or free-text for custom entries
- Attach a customer to the order for loyalty tracking
- Apply coupon codes (percent or flat discount) with live validation
- Apply promo codes with validation against order amount
- UPI QR code auto-displayed at checkout when payment method is UPI
- Loyalty points redemption — if the attached customer has points, a checkbox appears to redeem them as a rupee discount (1 point = ₹1)
- Loyalty points auto-earned after bill generation (1 point per ₹10 spent)
- Stock availability check before placing order — warns if any menu item linked to inventory is short
- Active orders panel showing all pending/preparing/ready orders with elapsed time
- One-click status updates on orders (pending → preparing → ready → served)
- Convert any order to a bill with configurable discount %, tax %, and payment method
- Receipt auto-generated on bill conversion with restaurant name, GSTIN, address, itemised amounts, GST, and configurable footer

### Billing Management
- Full bill history with search by bill number, table, or customer name
- Filter by status (open, paid, cancelled, refunded) and date range
- Summary row: total revenue, GST collected, taxable value — all auto-computed from visible filtered bills
- Payment method split view (cash / UPI / card collected today)
- Mark bills as refunded directly from bill detail dialog
- CSV export of filtered bills with all fields
- Bill detail dialog showing line items, payment method, and amounts

### Kitchen Display System (KDS)
- Live order board for kitchen staff — auto-refreshes every 15 seconds
- Color-coded cards by status: yellow (pending), blue (preparing), green (ready)
- Elapsed time shown on each card so kitchen knows order age
- Table number and all items with per-item notes visible at a glance
- "Start Cooking" button moves order from pending → preparing
- "Ready" button moves order from preparing → ready
- Filter tabs with counts per status

### Menu Management
- Categories with hierarchy support (parent/child), sort order, image upload
- Toggle category active/inactive directly from the category card
- Menu items with full details: name, description, price, cost price, preparation time, calories, dietary flags (vegetarian, vegan, gluten-free, spicy, spice level), availability, featured flag
- Image upload per item with automatic compression
- Variants and modifiers (size, add-ons) per item
- Ingredient linking to inventory items for recipe-based cost calculation
- Bulk price update with preview and impact analysis across all items in a category
- Multiple pricing strategies (markup %, fixed margin, competitive)
- Price history auto-logged on every price change
- Popular items report showing order count and revenue per item

### Inventory Management
- Items with category, supplier, unit type, base unit, conversion factor, stock levels (current, minimum, maximum, reorder point), cost/selling price, expiry and batch tracking flags
- Create and manage inventory categories and suppliers
- Stock movements log (IN, OUT, ADJUSTMENT, TRANSFER, WASTE, RETURN) with full history
- Manual stock adjustment with reason tracking
- Low stock alerts — auto-triggered by DB trigger when stock falls below reorder point; three severity levels (LOW, CRITICAL, OUT_OF_STOCK)
- Acknowledge alerts individually or in bulk; clear acknowledged alerts
- Unit conversion system — define conversions between any units, convert on the fly
- Inventory valuation with three methods: FIFO, LIFO, Weighted Average
- Inventory transfers between locations with approve/complete workflow
- Auto stock deduction when an order is completed (deducts ingredients based on recipe)
- Stock availability validation before placing POS orders
- Analytics: top moving items, slow moving items, movement report, low stock report

### Customer Management
- Customer profiles with name, phone, email, address
- Automatic visit count and total spent tracking
- Loyalty points: earn on every bill, redeem at POS checkout
- Manual loyalty point adjustment (add or redeem) from the customer detail view
- Customer segmentation: VIP (total spent ≥ ₹5000), Regular (visits ≥ 5), Loyal (points ≥ 100), New (everyone else)
- Customer search and sort by name, total spent, visit count, or loyalty points
- Bill history per customer shown in detail view
- Stats: total customers, total revenue, average spend, total loyalty points in circulation

### Employee Management
- Full CRUD with fields: name, email, phone, role, department, address, emergency contact, salary, joining date, status
- Role-based system: SUPER_ADMIN, RESTAURANT_OWNER, MANAGER, CHEF, SOUS_CHEF, WAITER, CASHIER, BARTENDER, CLEANER, DELIVERY
- Employee photo upload
- Clock in / clock out with timestamps
- Break management (start/end break with break type)
- Attendance report with employee picker, date range filter, and CSV export
- Monthly salary estimate card based on attendance days
- Profile completion percentage tracking
- Employee login portal with PIN/password authentication
- Password change flow
- Permissions system per role

### Reservations & Tables
- Table management: create tables with number, capacity, location
- QR code per table — downloadable as PNG, scannable for table identification
- Reservation booking: customer name, phone, party size, date, time, duration, special requests
- Table availability checker — pick a date and time to see which tables are free
- Reservation status management: pending → confirmed → seated → completed / cancelled / no-show
- CSV export of reservations

### Promotions & Announcements
- Promo codes: percent, fixed, or BOGO discount with minimum order amount, max discount cap, usage limits, start/end dates
- Promo code testing tool — enter any code and order amount to preview the discount before activating
- Enable/disable promotions with one click
- Coupons: percent or flat discount, max uses, validity window
- Toggle coupon active/inactive
- Announcements: title, body, target audience (all / staff / customers), priority (low / normal / high / urgent), optional expiry
- Active announcements shown as banners on the main dashboard
- Dismiss individual announcements from dashboard

### Sales Reports
- Date-range picker (defaults to last 30 days)
- Summary cards: total revenue, bill count, average bill value, GST collected
- Daily revenue bar chart with date labels
- Daily breakdown table (reversed chronological) with per-day bills, revenue, GST, discounts
- Top 10 menu items by order count with revenue
- Peak hours chart — 24-bar histogram highlighting the busiest hour
- Discount summary banner showing total discounts given in the period
- CSV export of daily breakdown

### Dashboard
- Today's bills count and total billed amount
- Today's collected amount (payments received, not just billed)
- Active pending orders count (live badge in sidebar too)
- Total customer count
- Low stock alert count (red badge in sidebar on inventory nav item)
- Today's reservations count
- Payment method split: cash, UPI, card collected today
- 7-day revenue bar chart
- Recent 5 bills with status badges
- Top 5 selling menu items with order count and revenue
- Active announcements with dismiss button

### Settings
- Restaurant name, address, phone
- UPI ID for QR generation at POS
- GSTIN shown on receipts
- Default tax % and service charge % applied at POS checkout
- Receipt footer message (e.g. "Thank you! Visit again")
- Database backup to a file path
- Database restore from a file path
- Seed sample data button for testing

---

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| Frontend | Next.js 15, React 19, TypeScript strict, Tailwind CSS 4 |
| Backend | Rust (Axum-style Tauri commands), zero warnings |
| Database | SQLite via SQLx, auto-migrated on first run |
| Package manager | pnpm |

---

## Prerequisites

- [Rust](https://rustup.rs/) stable (1.70+)
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`

**Linux:**
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

**macOS:** Xcode command line tools

**Windows:** Visual Studio Build Tools with C++ workload

---

## Running in Development

```bash
cd app
pnpm install
pnpm dev
```

Starts Next.js on port 3001 and opens the Tauri window. The SQLite database is created automatically on first launch at:
- Linux: `~/.local/share/FoodPaaji/foodpaaji.db`
- macOS: `~/Library/Application Support/FoodPaaji/foodpaaji.db`
- Windows: `%APPDATA%\FoodPaaji\foodpaaji.db`

All 9 DB migrations run automatically — no manual setup needed.

---

## Building for Production

```bash
cd app
pnpm build
```

Output in `src-tauri/target/release/bundle/`:
- `.deb` — Debian/Ubuntu
- `.rpm` — Fedora/RHEL
- `.AppImage` — portable Linux
- `.dmg` — macOS
- `.msi` / `.exe` — Windows

---

## Project Structure

```
app/
  src/
    app/              Next.js App Router pages
    components/       Reusable UI components (per domain)
    views/            Page-level view components
    lib/              Settings, utilities
    types/            TypeScript interfaces
  src-tauri/
    src/
      modules/        Rust backend (one file per domain)
      database/       SQLx pool and migration runner
      types/          Shared Rust types
      lib.rs          All Tauri command registrations
    migrations/       9 SQL migration files (auto-run on startup)
docs/
  idea.md             Original product spec
  plan.md             Development plan and phases
```

---

## Loyalty Points

| Action | Points |
|---|---|
| Spend ₹10 | Earn 1 point |
| Redeem 1 point | ₹1 discount at checkout |

Points are credited automatically after each paid bill. Redemption is optional at POS checkout when a customer is attached to the order.
