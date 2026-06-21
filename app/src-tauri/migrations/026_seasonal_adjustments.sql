CREATE TABLE IF NOT EXISTS seasonal_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id INTEGER NOT NULL,
    season_name TEXT NOT NULL,
    start_month INTEGER NOT NULL,
    end_month INTEGER NOT NULL,
    demand_multiplier REAL NOT NULL DEFAULT 1.0,
    reorder_point_override REAL,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seasonal_item ON seasonal_adjustments(inventory_item_id);
