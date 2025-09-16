-- Inventory Categories Table
CREATE TABLE IF NOT EXISTS inventory_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES inventory_categories(id) ON DELETE SET NULL
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    gstin VARCHAR(15),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    category_id INTEGER,
    supplier_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    unit_type VARCHAR(50) NOT NULL DEFAULT 'piece',
    base_unit VARCHAR(20) NOT NULL DEFAULT 'unit',
    conversion_factor DECIMAL(10,4) DEFAULT 1.0,
    current_stock DECIMAL(10,4) DEFAULT 0.0,
    minimum_stock DECIMAL(10,4) DEFAULT 0.0,
    maximum_stock DECIMAL(10,4) DEFAULT 0.0,
    reorder_point DECIMAL(10,4) DEFAULT 0.0,
    cost_price DECIMAL(10,2) DEFAULT 0.0,
    selling_price DECIMAL(10,2) DEFAULT 0.0,
    tax_rate DECIMAL(5,2) DEFAULT 0.0,
    expiry_tracking BOOLEAN DEFAULT 0,
    batch_tracking BOOLEAN DEFAULT 0,
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    inventory_item_id INTEGER NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'WASTE', 'RETURN')),
    quantity DECIMAL(10,4) NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reference_type VARCHAR(20),
    reference_id INTEGER,
    batch_number VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    user_id INTEGER,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Unit Conversions Table
CREATE TABLE IF NOT EXISTS unit_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    from_unit VARCHAR(20) NOT NULL,
    to_unit VARCHAR(20) NOT NULL,
    conversion_factor DECIMAL(10,4) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Low Stock Alerts Table
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    inventory_item_id INTEGER NOT NULL,
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('LOW', 'CRITICAL', 'OUT_OF_STOCK')),
    current_stock DECIMAL(10,4) NOT NULL,
    threshold_stock DECIMAL(10,4) NOT NULL,
    is_acknowledged BOOLEAN DEFAULT 0,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_inventory_categories_restaurant ON inventory_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_parent ON inventory_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant ON suppliers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_restaurant ON inventory_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_movements_restaurant ON stock_movements(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_unit_conversions_restaurant ON unit_conversions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_restaurant ON low_stock_alerts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item ON low_stock_alerts(inventory_item_id);

-- Create Triggers for Stock Updates
CREATE TRIGGER IF NOT EXISTS update_inventory_stock_in 
AFTER INSERT ON stock_movements
WHEN NEW.movement_type IN ('IN', 'RETURN', 'ADJUSTMENT')
BEGIN
    UPDATE inventory_items 
    SET current_stock = current_stock + NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.inventory_item_id;
END;

CREATE TRIGGER IF NOT EXISTS update_inventory_stock_out 
AFTER INSERT ON stock_movements
WHEN NEW.movement_type IN ('OUT', 'WASTE', 'TRANSFER')
BEGIN
    UPDATE inventory_items 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.inventory_item_id;
END;

-- Create Low Stock Alert Trigger
CREATE TRIGGER IF NOT EXISTS check_low_stock_alert 
AFTER UPDATE ON inventory_items
WHEN NEW.current_stock <= NEW.reorder_point AND NEW.is_active = 1
BEGIN
    INSERT OR REPLACE INTO low_stock_alerts (
        restaurant_id, inventory_item_id, alert_level, 
        current_stock, threshold_stock
    ) VALUES (
        NEW.restaurant_id, NEW.id,
        CASE 
            WHEN NEW.current_stock <= 0 THEN 'OUT_OF_STOCK'
            WHEN NEW.current_stock <= NEW.minimum_stock THEN 'CRITICAL'
            ELSE 'LOW'
        END,
        NEW.current_stock, NEW.reorder_point
    );
END;