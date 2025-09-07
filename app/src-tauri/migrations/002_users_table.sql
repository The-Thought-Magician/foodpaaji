-- Migration for users/employees table
-- Following CLAUDE.md: under 300 lines, descriptive naming

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CASHIER' CHECK (role IN (
        'SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 
        'CASHIER', 'KITCHEN_STAFF', 'WAITER'
    )),
    permissions TEXT DEFAULT '[]',
    salary DECIMAL(10,2),
    hire_date DATE,
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
);

CREATE INDEX idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Insert default admin user for development
INSERT INTO users (
    restaurant_id,
    email,
    phone,
    password_hash,
    first_name,
    last_name,
    role,
    permissions
) VALUES (
    1,
    'admin@foodpaaji.com',
    '+919876543211',
    '$2b$12$dummy.hash.for.development.use',
    'Admin',
    'User',
    'RESTAURANT_OWNER',
    '["all"]'
);