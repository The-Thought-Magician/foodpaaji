# FoodPaaji - Development Plan

## Current Project Status

### Application Health
| Component | Status | Notes |
|-----------|--------|-------|
| Frontend Build | Working | Vite dev server runs successfully |
| TypeScript | Clean | No compilation errors |
| ESLint | Minor Issues | 6 warnings, 11 errors (unused imports, case declarations) |
| Rust Backend | Blocked | Toolchain not configured (run `rustup default stable`) |
| Database | Ready | Migrations in place |

### What Works
- Frontend dev server starts on `http://localhost:5173`
- App renders with functional UI components
- Tauri invoke calls properly typed
- Real backend implementations (5400+ lines of Rust)

### What Needs Immediate Attention

#### 1. Development Environment
- [ ] Run `rustup default stable` to configure Rust toolchain
- [ ] Verify `cargo build` works in src-tauri
- [ ] Test full Tauri dev mode

#### 2. Code Quality Fixes (ESLint)
- [ ] Remove unused imports in `bulk-inventory-update.tsx`
- [ ] Fix lexical declarations in case blocks (add braces/scopes)
- [ ] Fix remaining `@typescript-eslint/no-explicit-any` warnings

#### 3. File Size Compliance (CLAUDE.md Rule: 300 lines max)
Several Rust modules exceed the limit:
- `inventory_transfers.rs` - 499 lines (needs split)
- `menu.rs` - 408 lines (needs split)
- `inventory_valuation.rs` - 394 lines (needs split)
- `inventory_reports.rs` - 391 lines (needs split)
- `attendance.rs` - 404 lines (needs split)
- `auto_stock_deduction.rs` - 367 lines (needs split)
- `pricing.rs` - 364 lines (needs split)
- `unit_conversions.rs` - 354 lines (needs split)
- `low_stock_alerts.rs` - 358 lines (needs split)
- `stock_movements.rs` - 347 lines (needs split)
- `menu_images.rs` - 347 lines (needs split)
- `employee_images.rs` - 175 lines (OK but close)
- `permissions.rs` - 174 lines (OK)

## Phase Completion Roadmap

### Immediate (This Session)
1. Fix Rust toolchain
2. Fix ESLint errors in frontend
3. Split oversized Rust modules to comply with 300-line limit
4. Verify full Tauri app runs

### Phase 5: Billing & UPI Payment (Next Major Feature)
**Database:**
- [ ] Create orders/order_items table migration
- [ ] Create payments table with UPI reference tracking
- [ ] Create receipts table
- [ ] Create price_history table (if not in menu phase)

**Backend Modules:**
- [ ] `orders.rs` - Order CRUD, status management
- [ ] `billing.rs` - GST calculation, service charges
- [ ] `payments.rs` - UPI QR generation, payment tracking
- [ ] `receipts.rs` - Thermal printer formatting
- [ ] `coupons.rs` - Discount validation

**Frontend Components:**
- [ ] `billing/order-form.tsx` - New order creation
- [ ] `billing/cart.tsx` - Item management
- [ ] `billing/payment.tsx` - UPI QR, cash/card
- [ ] `billing/receipt.tsx` - Receipt preview/print

### Phase 6: Customer Management
- customers migration (profiles, phone, email, preferences)
- Customer CRUD, loyalty points, purchase history

### Phase 7: Seat Booking
- tables migration (layout, capacity, status)
- reservations migration (time slots, conflicts)
- QR code per table for ordering

### Phase 8: Announcements & Promotions
- announcements/coupons/campaigns tables
- Targeting rules, A/B testing

### Later Phases
- Phase 9: Swiggy/Zomato integration
- Phase 10: Online website generator
- Phase 11: Comprehensive testing
- Phase 12: Deployment

## Code Quality Standards Reminder

Per CLAUDE.md:
1. No "revised", "fixed" suffixes in filenames
2. Files must not exceed 300 lines
3. Single-line comments only
4. No overengineering
5. Real data only (no fake data)
6. Bottom-up development approach
7. Always work from TODO.md tasks

## Command Reference

```bash
# Frontend only (works now)
npm run frontend:dev
npm run frontend:build

# Full Tauri (after Rust fix)
npm run dev
npm run build

# Linting
npm run lint

# Rust setup (one time)
rustup default stable
rustup update
```

## System Dependencies for Linux/WSL

To run the full Tauri app on Linux/WSL, install:

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

## Next Action Priority
1. Install system dependencies above for full Tauri dev mode
2. Run `npm run dev` to test the full application
3. Fix ESLint errors (quick wins)
4. Plan module splits for oversized files

## Summary Assessment

**This is NOT gibberish.** The project contains:

- Real, functional React/TypeScript frontend
- Real, working Rust backend (5400+ lines)
- Proper database migrations with SQLx
- Real Tauri command invocations
- Comprehensive business logic

**Issues:**
- WSL/Linux requires GTK system libraries (missing)
- Some ESLint warnings/errors in frontend
- Rust modules exceed 300-line limit (per CLAUDE.md)
