CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    label TEXT NOT NULL DEFAULT 'Home',
    address_line TEXT NOT NULL,
    locality TEXT,
    city TEXT,
    pincode TEXT,
    landmark TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
