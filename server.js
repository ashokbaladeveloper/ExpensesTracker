require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('./auth');

const app = express();

// Middleware
app.use(cors({
    origin: true, // Reflect request origin (allows localhost, 192.168.x.x, etc.)
    credentials: true
}));
app.use(express.json());

// Session Config
app.use(session({
    store: new pgSession({
        pool: pool,                // Connection pool
        tableName: 'session'   // Use another table-name than the default "session" one
    }),
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// Passport Config
app.use(passport.initialize());
app.use(passport.session());

// Serve Static Files (Frontend)
app.use(express.static('public'));
// Note: Adjust path if needed. Assuming current dir is root of backend, and frontend files are here too.
// Since we are running from c:\Development\Antigravity\ExpenseTracker, '.' is fine.
app.use(express.static('.'));


// --- Auth Routes ---
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    });

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ msg: 'Not requested' });
    }
});

// Middleware to protect routes
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ msg: 'Not authorized' });
}

// --- API Routes (Protected) ---

// Get all transactions
app.get('/api/transactions', ensureAuthenticated, async (req, res) => {
    try {
        const allTransactions = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, id DESC', [req.user.id]);
        res.json(allTransactions.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Add a transaction
app.post('/api/transactions', ensureAuthenticated, async (req, res) => {
    try {
        const { text, amount, category, date } = req.body;
        const newTransaction = await pool.query(
            'INSERT INTO transactions (user_id, text, amount, category, date) VALUES($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, text, amount, category, date]
        );
        res.json(newTransaction.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update a transaction
app.put('/api/transactions/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { text, amount, category, date } = req.body;
        // Ensure user owns transaction
        const updateTransaction = await pool.query(
            'UPDATE transactions SET text = $1, amount = $2, category = $3, date = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
            [text, amount, category, date, id, req.user.id]
        );
        if (updateTransaction.rows.length === 0) {
            return res.status(404).json('Transaction not found or not authorized');
        }
        res.json(updateTransaction.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Delete a transaction
app.delete('/api/transactions/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const delOp = await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (delOp.rowCount === 0) {
            return res.status(404).json('Transaction not found or not authorized');
        }
        res.json('Transaction was deleted!');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Clear all transactions
app.delete('/api/transactions', ensureAuthenticated, async (req, res) => {
    try {
        await pool.query('DELETE FROM transactions WHERE user_id = $1', [req.user.id]);
        res.json('All transactions deleted!');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Category Routes ---

app.get('/api/categories', ensureAuthenticated, async (req, res) => {
    try {
        const categories = await pool.query('SELECT * FROM categories WHERE user_id = $1 OR user_id IS NULL', [req.user.id]);
        res.json(categories.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.post('/api/categories', ensureAuthenticated, async (req, res) => {
    try {
        const { name, type } = req.body;
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16);

        const newCategory = await pool.query(
            'INSERT INTO categories (user_id, name, color, type) VALUES($1, $2, $3, $4) RETURNING *',
            [req.user.id, name, color, type || 'expense']
        );
        res.json(newCategory.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server has started on port ${PORT}`);
});
