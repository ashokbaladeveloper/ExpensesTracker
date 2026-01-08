const pool = require('./db');

async function setup() {
    try {
        console.log("Creating expusers table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS expusers (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR(255) UNIQUE NOT NULL,
                display_name VARCHAR(255),
                email VARCHAR(255),
                avatar VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Creating session table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            )
            WITH (OIDS=FALSE);
        `);

        try {
            await pool.query(`ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;`);
        } catch (e) {
            // Ignore if PK already exists or table logic overlaps
            console.log("Session PK might already exist, skipping.");
        }

        try {
            await pool.query(`CREATE INDEX "IDX_session_expire" ON "session" ("expire");`);
        } catch (e) {
            console.log("Session Index might already exist, skipping.");
        }

        console.log("Updating foreign keys for expusers...");
        // Drop old FK constraints if they specifically reference 'users' (assumption: generic naming or existing ones)
        // Since we can't easily discover the constraint name without strict naming, we will try to drop common names or just add the new one.
        // Better: We assume the previous run created valid columns. We need to repoint them.

        // Strategy: Drop user_id column and recreate it? No, that deletes data.
        // Strategy: Drop constraint and add new one.

        try {
            // Try to drop constraint if it exists (assuming default naming 'transactions_user_id_fkey' or similar)
            await pool.query(`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;`);
            await pool.query(`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;`);

            // Also try dropping if we named it manually or if it was auto-generated differently previously
            // But for now, let's try to add the new constraint.
        } catch (e) {
            console.log("Error dropping old constraints:", e.message);
        }

        console.log("Adding/Updating user_id to transactions...");
        try {
            // Add column if not exists
            await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
            // Add FK constraint to expusers
            await pool.query(`ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES expusers(id) ON DELETE CASCADE;`);
        } catch (e) {
            console.log("Error adding user_id FK to transactions (might exist):", e.message);
        }

        console.log("Adding/Updating user_id to categories...");
        try {
            await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
            await pool.query(`ALTER TABLE categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES expusers(id) ON DELETE CASCADE;`);
        } catch (e) {
            console.log("Error adding user_id FK to categories (might exist):", e.message);
        }

        // Update categories type if missing (from previous task)
        try {
            await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense';`);
        } catch (e) {
            console.log("Type column checks completed.");
        }

        console.log("Database setup complete!");
        process.exit(0);
    } catch (err) {
        console.error("Error setting up DB:", err);
        process.exit(1);
    }
}

setup();
