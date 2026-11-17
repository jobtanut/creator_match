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


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(cors());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'sec1_gr11_fe_src', 'public', 'creators'));
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

// Sends the login page back with an error message under the form.
// <base> makes the page's CSS, images and links load from the frontend server.
const showLoginError = (res, message) => {
    let html = fs.readFileSync(LOGIN_HTML, 'utf8');
    html = html.replace('<head>', `<head><base href="${FE_URL}/">`);
    html = html.replace('<!--ERROR-->', `<p class="error">${message}</p>`);
    res.status(401).send(html);
};

// login check
const loginAuth = (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;

    const sql = `SELECT * FROM Admin_account WHERE username = ? AND password = ?`;

    conn.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error(err);
            return showLoginError(res, 'Server error, please try again');
        }

        if (results.length === 0) {
            return showLoginError(res, 'Incorrect username or password');
        }

        req.user = results[0];
        console.log('Logging in');
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
    const sql = 'SELECT * FROM Admin_account WHERE username = ?';

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

// login
router.post('/login', loginAuth, (req, res) => {
    const payload = {
        sub: req.user.username,
        role: req.user.Permission,
        iat: Math.floor(Date.now() / 1000),
    };
    const token = jwt.encode(payload, SECRET);

    const logSql = `INSERT INTO Login_log (Login_log_ID, login_datetime, login_status, AdminID)
                    VALUES (?, ?, 'Success', ?)`;
    const logId = 'L' + Date.now();   // e.g. L1763290000000, fits VARCHAR(20)

    conn.query(logSql, [logId, new Date(), req.user.AdminID], (err) => {
        if (err) console.error('Failed to log login:', err.message);
    });

    res.cookie('token', token, { httpOnly: true });
    res.redirect(`${FE_URL}/`);
});

app.listen(port, () => {
    console.log(`Listening at port: ${port}`)
})