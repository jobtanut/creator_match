const express = require('express');
const app = express();
const router = express.Router();
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const jwt = require('jwt-simple');
const passport = require('passport');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv').config()
const port = process.env.PORT;
const { ExtractJwt, Strategy: JwtStrategy } = require("passport-jwt");

// Frontend address
const FE_URL = 'http://localhost:8081';
const FE_HTML = path.join(__dirname, '..', '..', 'sec1_gr11_fe_src', 'html');
const LOGIN_HTML = path.join(FE_HTML, 'login.html');
const SIGNUP_HTML = path.join(FE_HTML, 'signup.html');

// Roles (match the Role table)
const ROLE_ADMIN = 1;
const ROLE_USER = 2;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(cors());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'sec1_gr11_fe_src', 'public', 'creators'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({storage: storage});

// DB connection
const conn = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBDATABASE
});

conn.connect((err) => {
    if (err) return console.error('DB connection failed:', err.message);
    console.log('Connected to MySQL');
});

app.use(router);

// Sends an FE page back with a message in its <p class="error"></p>.
// <base> makes the page's CSS, images and links load from the frontend server.
const showPageError = (res, file, message, status = 400) => {
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('<head>', `<head><base href="${FE_URL}/">`);
    html = html.replace('<p class="error"></p>', `<p class="error">${message}</p>`);
    res.status(status).send(html);
};

// ------------------ LOGIN ------------------

// login check (admins and regular users use the same login)
const loginAuth = (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;

    console.log('--- Login attempt ---');
    console.log('Username:', username);
    console.log('Password received:', password ? 'yes' : 'no');
    console.log('Time:', new Date().toLocaleString());

    const sql = `SELECT * FROM User_account WHERE username = ? AND password = ?`;

    conn.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error('Login DB error:', err.message);
            return showPageError(res, LOGIN_HTML, 'Server error, please try again', 500);
        }

        if (results.length === 0) {
            console.log('Result: FAILED, wrong username or password');
            return showPageError(res, LOGIN_HTML, 'Incorrect username or password', 401);
        }

        req.user = results[0];
        console.log('Result: SUCCESS');
        next();
    });
};

// SECRET
const SECRET = process.env.JWT_SECRET;

// Json Web Token Strategy
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: SECRET,
};

const jwtAuth = new JwtStrategy(jwtOptions, (payload, done) => {
    const sql = 'SELECT * FROM User_account WHERE username = ?';

    conn.query(sql, [payload.sub], (err, results) => {
        if (err) return done(err, false);
        if (results.length === 0) return done(null, false);

        const user = results[0];

        return done(null, user);
    });
});

passport.use(jwtAuth);

// Check JWT
const requireJWTAuth = passport.authenticate('jwt', {session: false});

// Only admins (Role 1) get past this. Use after requireJWTAuth on admin-only routes:
// router.delete('/creator', requireJWTAuth, requireAdmin, (req, res) => { ... })
const requireAdmin = (req, res, next) => {
    if (req.user.Role_ID !== ROLE_ADMIN) {
        return res.status(403).json({ error: true, message: 'Admins only' });
    }
    next();
};

// login
router.post('/login', loginAuth, (req, res) => {
    const payload = {
        sub: req.user.username,
        role: req.user.Role_ID,
        iat: Math.floor(Date.now() / 1000),
    };
    const token = jwt.encode(payload, SECRET);

    // Test Case
    const logSql = `INSERT INTO Login_log (Login_log_ID, login_datetime, login_status, UserID)
                    VALUES (?, ?, 'Success', ?)`;
    const logId = 'L' + Date.now();   // e.g. L1763290000000, fits VARCHAR(20)

    conn.query(logSql, [logId, new Date(), req.user.UserID], (err) => {
        if (err) console.error('Failed to log login:', err.message);
    });

    console.log('Logged in as:', {
        UserID: req.user.UserID,
        username: req.user.username,
        name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.Role_ID === ROLE_ADMIN ? 'Admin (1)' : 'User (2)',
        logId: logId,
    });

    res.cookie('token', token);

    // admins go to the admin page, regular users go home
    if (req.user.Role_ID === ROLE_ADMIN) {
        return res.redirect(`${FE_URL}/admin`);
    }
    res.redirect(`${FE_URL}/`);
});

// Sign up
router.post('/signup', (req, res) => {
    const {first_name, last_name, email, username, password, confirm_password} = req.body;

    console.log('--- Sign up attempt ---');
    console.log('Email:', email,'| Username', username);

    // Checks
    if (!first_name || !last_name || !email || !username || !password) {
        return showPageError (res, SIGNUP_HTML, 'Please fill in every field');
    }
    if (password.length < 8) {
        return showPageError (res, SIGNUP_HTML, 'Passwords do not match');
    }

    // Create Account
    const userId = 'U' + String(Date.now()).slice(-9);

    const sql = `INSERT INTO User_account (UserID, username, email, password, first_name, last_name, Role_ID) VALUES (?, ?, ?, ?, ?, ?, ?)`

    conn.query(sql, [userId, username, email, password, first_name, last_name, ROLE_USER], (err) => {
        if (err) {
            // Username or Email Already in sql
            if (err.code === 'ER_DUP_ENTRY') {
                const msg = err.message.includes('uq_user_username')?'Username is already taken':'Email is already used'
                console.log('Result: FAILED', msg);
                return showPageError(res, SIGNUP_HTML, 409);
            }
            console.error('Signup insert error:', err.message);
            return showPageError(res, SIGNUP_HTML, 'Server error, please try again', 500);
        }

        console.log('Result: Success, created user', userId);
        res.redirect(`${FE_URL}/auth/login`)
    })
})

app.listen(port, () => {
    console.log(`Listening at port: ${port}`)
})