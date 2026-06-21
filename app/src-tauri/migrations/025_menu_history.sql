CREATE TABLE IF NOT EXISTS menu_item_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_history_item ON menu_item_history(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_history_created ON menu_item_history(created_at);
