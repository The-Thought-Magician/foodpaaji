CREATE TABLE IF NOT EXISTS bill_refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    refund_amount REAL NOT NULL,
    reason TEXT NOT NULL,
    refund_method TEXT,
    performed_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bill_refunds_bill ON bill_refunds(bill_id);
