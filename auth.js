const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
    async function (accessToken, refreshToken, profile, cb) {
        try {
            // Check if user exists
            const res = await pool.query('SELECT * FROM expusers WHERE google_id = $1', [profile.id]);

            if (res.rows.length > 0) {
                // User exists
                return cb(null, res.rows[0]);
            } else {
                // Create new user
                const newUser = await pool.query(
                    'INSERT INTO expusers (google_id, display_name, email, avatar) VALUES ($1, $2, $3, $4) RETURNING *',
                    [profile.id, profile.displayName, profile.emails[0].value, profile.photos[0].value]
                );
                return cb(null, newUser.rows[0]);
            }
        } catch (err) {
            return cb(err);
        }
    }
));

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const res = await pool.query('SELECT * FROM expusers WHERE id = $1', [id]);
        if (res.rows.length === 0) {
            return done(null, false);
        }
        done(null, res.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
