CREATE TABLE expusers (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    email VARCHAR(255),
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES expusers(id) ON DELETE CASCADE, -- NULL for default system categories
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    type VARCHAR(20) DEFAULT 'expense',
    UNIQUE (user_id, name) -- User cannot have duplicate category names
);

-- Note: For the existing single-user setup, we will need to handle data migration carefully.
-- Ideally, create a default user or wipe data.

CREATE TABLE transactions(
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES expusers(id) ON DELETE CASCADE,
    text VARCHAR(255),
    amount NUMERIC(10, 2),
    category VARCHAR(50),
    date DATE DEFAULT CURRENT_DATE
);

-- Migration command for existing databases (Run these manually if you have data you want to keep):
-- 1. CREATE TABLE expusers...
-- 2. ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES expusers(id) ON DELETE CASCADE;
-- 3. ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES expusers(id) ON DELETE CASCADE;
-- 4. ALTER TABLE categories DROP CONSTRAINT categories_name_key; -- Remove global unique constraint if exists
-- 5. ALTER TABLE categories ADD CONSTRAINT unique_user_category UNIQUE (user_id, name);

-- Session table for connect-pg-simple
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- Seed defaults
INSERT INTO categories (name, color, type) VALUES 
('Food', '#e74c3c', 'expense'),
('Income', '#27ae60', 'income'),
('Borrow From', '#8e44ad', 'income'),
('EMI', '#f1c40f', 'expense'),
('Daily Expenses', '#9b59b6', 'expense'),
('Savings', '#2ecc71', 'expense'),
('Grocery', '#e67e22', 'expense'),
('Snacks', '#d35400', 'expense'),
('School Fee', '#3498db', 'expense'),
('Medical', '#1abc9c', 'expense'),
('Petrol', '#34495e', 'expense'),
('Loan', '#7f8c8d', 'expense'),
('Other', '#ecf0f1', 'expense')
ON CONFLICT (name) DO NOTHING;
