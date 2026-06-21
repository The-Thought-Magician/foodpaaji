CREATE TABLE IF NOT EXISTS customer_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_customer ON customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON customer_feedback(created_at);
