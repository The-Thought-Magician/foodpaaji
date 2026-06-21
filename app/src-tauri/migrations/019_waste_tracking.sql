CREATE TABLE IF NOT EXISTS waste_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL DEFAULT 1,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('expired', 'spoiled', 'overproduction', 'dropped', 'other')),
    cost_per_unit REAL,
    notes TEXT,
    recorded_by TEXT,
    wasted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_waste_restaurant ON waste_entries(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waste_date ON waste_entries(wasted_at);
