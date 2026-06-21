CREATE TABLE IF NOT EXISTS walkin_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL DEFAULT 1,
    customer_name TEXT NOT NULL,
    phone TEXT,
    party_size INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'seated', 'cancelled', 'no_show')),
    notes TEXT,
    table_number TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    seated_at DATETIME,
    estimated_wait INTEGER
);
CREATE INDEX IF NOT EXISTS idx_walkin_status ON walkin_queue(status, added_at);
