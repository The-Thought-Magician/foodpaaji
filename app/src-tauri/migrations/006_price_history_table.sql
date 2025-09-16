-- Price History Table for tracking menu item price changes
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    reason TEXT,
    changed_by_user_id INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_price_history_menu_item ON price_history(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at);

-- Create trigger to automatically log price changes
CREATE TRIGGER IF NOT EXISTS log_price_change
AFTER UPDATE OF price ON menu_items
WHEN OLD.price != NEW.price
BEGIN
    INSERT INTO price_history (menu_item_id, old_price, new_price, reason, changed_at)
    VALUES (NEW.id, OLD.price, NEW.price, 'System update', CURRENT_TIMESTAMP);
END;