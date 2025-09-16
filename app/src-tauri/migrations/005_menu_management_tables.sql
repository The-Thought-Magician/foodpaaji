-- Menu Categories Table with Hierarchy Support
CREATE TABLE IF NOT EXISTS menu_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER,
    slug VARCHAR(100) NOT NULL,
    image_path VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    display_in_menu BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES menu_categories(id) ON DELETE SET NULL,
    UNIQUE(restaurant_id, slug)
);

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    preparation_time INTEGER DEFAULT 0,
    calories INTEGER DEFAULT 0,
    image_path VARCHAR(255),
    slug VARCHAR(150) NOT NULL,
    sku VARCHAR(50),
    is_vegetarian BOOLEAN DEFAULT 0,
    is_vegan BOOLEAN DEFAULT 0,
    is_gluten_free BOOLEAN DEFAULT 0,
    is_spicy BOOLEAN DEFAULT 0,
    spice_level INTEGER DEFAULT 0 CHECK (spice_level >= 0 AND spice_level <= 5),
    is_available BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    is_featured BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT,
    UNIQUE(restaurant_id, slug)
);

-- Menu Item Variants Table
CREATE TABLE IF NOT EXISTS menu_item_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_modifier DECIMAL(10,2) DEFAULT 0.00,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Menu Item Modifiers Table
CREATE TABLE IF NOT EXISTS menu_item_modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('REQUIRED', 'OPTIONAL', 'MULTI_SELECT')),
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Menu Item Modifier Options Table
CREATE TABLE IF NOT EXISTS menu_item_modifier_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modifier_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (modifier_id) REFERENCES menu_item_modifiers(id) ON DELETE CASCADE
);

-- Menu Item Ingredients Table (for recipe management and cost calculation)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    inventory_item_id INTEGER NOT NULL,
    quantity_required DECIMAL(10,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    cost_per_unit DECIMAL(10,2),
    is_optional BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT
);

-- Menu Item Allergens Table
CREATE TABLE IF NOT EXISTS menu_item_allergens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    allergen_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'SEVERE')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Menu Item Nutritional Information Table
CREATE TABLE IF NOT EXISTS menu_item_nutrition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    serving_size VARCHAR(50),
    calories INTEGER DEFAULT 0,
    protein DECIMAL(5,2) DEFAULT 0,
    carbohydrates DECIMAL(5,2) DEFAULT 0,
    fat DECIMAL(5,2) DEFAULT 0,
    fiber DECIMAL(5,2) DEFAULT 0,
    sugar DECIMAL(5,2) DEFAULT 0,
    sodium DECIMAL(7,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    UNIQUE(menu_item_id)
);

-- Menu Item Availability Schedule Table
CREATE TABLE IF NOT EXISTS menu_item_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Menu Item Tags Table
CREATE TABLE IF NOT EXISTS menu_item_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    tag_color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_parent ON menu_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_slug ON menu_categories(restaurant_id, slug);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_slug ON menu_items(restaurant_id, slug);
CREATE INDEX IF NOT EXISTS idx_menu_items_availability ON menu_items(is_available, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON menu_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON menu_item_variants(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_modifiers_item ON menu_item_modifiers(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_options_modifier ON menu_item_modifier_options(modifier_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_item ON menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_inventory ON menu_item_ingredients(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_allergens_item ON menu_item_allergens(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_availability_item ON menu_item_availability(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_availability_day ON menu_item_availability(day_of_week);

-- Create Triggers for Updated Timestamps
CREATE TRIGGER IF NOT EXISTS update_menu_categories_timestamp 
AFTER UPDATE ON menu_categories
BEGIN
    UPDATE menu_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_menu_items_timestamp 
AFTER UPDATE ON menu_items
BEGIN
    UPDATE menu_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_menu_item_ingredients_timestamp 
AFTER UPDATE ON menu_item_ingredients
BEGIN
    UPDATE menu_item_ingredients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_menu_item_nutrition_timestamp 
AFTER UPDATE ON menu_item_nutrition
BEGIN
    UPDATE menu_item_nutrition SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create Trigger to Update Menu Item Cost Based on Ingredients
CREATE TRIGGER IF NOT EXISTS update_menu_item_cost_on_ingredient_change
AFTER INSERT ON menu_item_ingredients
BEGIN
    UPDATE menu_items 
    SET cost_price = (
        SELECT COALESCE(SUM(quantity_required * COALESCE(cost_per_unit, 0)), 0)
        FROM menu_item_ingredients 
        WHERE menu_item_id = NEW.menu_item_id
    )
    WHERE id = NEW.menu_item_id;
END;

CREATE TRIGGER IF NOT EXISTS update_menu_item_cost_on_ingredient_update
AFTER UPDATE ON menu_item_ingredients
BEGIN
    UPDATE menu_items 
    SET cost_price = (
        SELECT COALESCE(SUM(quantity_required * COALESCE(cost_per_unit, 0)), 0)
        FROM menu_item_ingredients 
        WHERE menu_item_id = NEW.menu_item_id
    )
    WHERE id = NEW.menu_item_id;
END;