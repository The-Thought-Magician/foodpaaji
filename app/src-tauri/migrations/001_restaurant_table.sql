-- Initial migration for restaurant table
-- Following CLAUDE.md: under 300 lines, descriptive naming

CREATE TABLE restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    settings TEXT DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'STARTER' CHECK (subscription_tier IN ('STARTER', 'PROFESSIONAL', 'ENTERPRISE')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_email ON restaurants(email);
CREATE INDEX idx_restaurants_active ON restaurants(is_active);

-- Insert default restaurant for development
INSERT INTO restaurants (
    name, 
    slug, 
    email, 
    phone, 
    address,
    settings
) VALUES (
    'FoodPaaji Demo Restaurant',
    'foodpaaji-demo',
    'demo@foodpaaji.com',
    '+919876543210',
    '{"street":"123 Demo Street","city":"Kolkata","state":"West Bengal","pincode":"700001","country":"India"}',
    '{"currency":"INR","timezone":"Asia/Kolkata","language":"en"}'
);