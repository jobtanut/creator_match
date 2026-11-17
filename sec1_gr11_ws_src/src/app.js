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
const convertHeic = require('heic-convert');   // npm install heic-convert
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

fs.mkdirSync(path.join(__dirname, '..', '..', 'sec1_gr11_fe_src', 'public', 'creators'), { recursive: true });
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'sec1_gr11_fe_src', 'public', 'creators'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({storage: storage});

// Convert HEIC
const isHeic = (file) =>
    /\.(heic|heif)$/i.test(file.originalname) || /image\/hei[cf]/i.test(file.mimetype);

const fixHeic = async (req, res, next) => {
    if (!req.file || !isHeic(req.file)) return next();

    try {
        const input = await fs.promises.readFile(req.file.path);
        const output = await convertHeic({ buffer: input, format: 'JPEG', quality: 0.85 });

        const jpgName = path.parse(req.file.filename).name + '.jpg';
        const jpgPath = path.join(path.dirname(req.file.path), jpgName);
        await fs.promises.writeFile(jpgPath, Buffer.from(output));
        await fs.promises.unlink(req.file.path);   // delete the original .heic

        req.file.filename = jpgName;
        req.file.path = jpgPath;
        req.file.mimetype = 'image/jpeg';
        console.log('Converted HEIC to', jpgName);
        next();
    } catch (err) {
        console.error('HEIC conversion failed:', err.message);
        await fs.promises.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: true, message: 'Could not read this HEIC photo, please use JPG or PNG' });
    }
};

// DB connection
const conn = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBDATABASE
});

const db = conn.promise();

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
    return showPageError(res, SIGNUP_HTML, 'Password must be at least 8 characters');
}
    if (password !== confirm_password) {
        return showPageError(res, SIGNUP_HTML, 'Passwords do not match');
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
                return showPageError(res, SIGNUP_HTML, msg, 409);
            }
            console.error('Signup insert error:', err.message);
            return showPageError(res, SIGNUP_HTML, 'Server error, please try again', 500);
        }

        console.log('Result: Success, created user', userId);
        res.redirect(`${FE_URL}/auth/login`)
    })
})

//Creator Management
//Check Fields
const readCreatorForm = (body) => {
    const creator_name = (body.creator_name || "").trim();
    const category = (body.category || '').trim();
    const status = body.Status || 'Active';
    const followers = Number(body.followers || 0);

    if (!creator_name) return { error: 'Creator name is required' };
    if (!category) return { error: 'Category is required '};
    if (!['Active', 'Inactive'].includes(status)) return { error: 'Status must be Active or Inactive' };
    if (!Number.isInteger(followers) || followers < 0) return { error: 'Followers must be a whole number, 0 or more' };

    const platforms = [...new Set(
        (body.platforms || '').split(',').map((p) => p.trim()).filter((p) => p)
    )];

    return {
        data: {
            creator_name,
            category,
            status,
            followers,
            c_first_name: (body.c_first_name || '').trim() || null,
            c_last_name: (body.c_last_name || '').trim() || null,
            Description: (body.Description || '').trim() || null,
            platforms,
        },
    };
};

const logEdit = (adminId, creatorId, type) => {
    const sql = 'INSERT INTO Edition (AdminID, CreatorID, edit_logID, edit_timestamp, edit_type) VALUES (?, ?, ?, ?, ?)';
    return db.query(sql, [adminId,creatorId, 'M' + Date.now(), new Date(), type]);
};

// Replaces a creator's platforms with a new list
const savePlatforms = async (creatorId, platforms) => {
    await db.query('DELETE FROM Creator_Platform WHERE creatorID = ?', [creatorId]);
    for (const platform of platforms) {
        await db.query('INSERT INTO Creator_Platform (Platform, creatorID) VALUES (?, ?)', [platform, creatorId]);
    }
};

//Get Creators
router.get('/creators', async (req, res) => {
    try {
        const params = [];
        let where = '';
        if (req.query.status) {
            where = 'WHERE c.Status = ?';
            params.push(req.query.status);
        }

        const [rows] = await db.query(
            `SELECT c.*, GROUP_CONCAT(cp.Platform ORDER BY cp.Platform SEPARATOR ', ') AS platforms
             FROM Creator c
             LEFT JOIN Creator_Platform cp ON c.creatorID = cp.creatorID
             ${where}
             GROUP BY c.creatorID
             ORDER BY c.creator_name`,
            params
        );

        res.json({ error: false, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load creators' });
    }
});

// Home Page Creators
router.get('/creators/featured', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.creatorID, c.creator_name, c.category, c.followers, c.creator_picture_Link,
                    GROUP_CONCAT(cp.Platform ORDER BY cp.Platform SEPARATOR ', ') AS platforms
             FROM Creator c
             LEFT JOIN Creator_Platform cp ON c.creatorID = cp.creatorID
             WHERE c.Status = 'Active'
             GROUP BY c.creatorID
             ORDER BY RAND()
             LIMIT 6`
        );
        res.json({ error: false, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load featured creators' });
    }
});

// Follower range of active creators, for the search page slider
router.get('/creators/follower-range', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT COALESCE(MIN(followers), 0) AS min, COALESCE(MAX(followers), 0) AS max
             FROM Creator WHERE Status = 'Active'`
        );
        res.json({ error: false, min: Number(rows[0].min), max: Number(rows[0].max) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load follower range' });
    }
});

// Search creators (public): only Active creators
router.get('/creators/search', async (req, res) => {
    try {
        const name = (req.query.name || '').trim();
        const category = (req.query.category || '').trim();
        // ?platform=A&platform=B arrives as an array, a single one as a string
        const platforms = [].concat(req.query.platform || []).filter((p) => p);
        const minFollowers = req.query.min_followers ? Number(req.query.min_followers) : null;
        const maxFollowers = req.query.max_followers ? Number(req.query.max_followers) : null;

        if ([minFollowers, maxFollowers].some((n) => n !== null && (!Number.isInteger(n) || n < 0))) {
            return res.status(400).json({ error: true, message: 'Follower range must be whole numbers, 0 or more' });
        }
        if (minFollowers !== null && maxFollowers !== null && minFollowers > maxFollowers) {
            return res.status(400).json({ error: true, message: 'Minimum followers cannot be more than maximum' });
        }

        const conditions = ["c.Status = 'Active'"];
        const params = [];

        if (name) {
            conditions.push('c.creator_name LIKE ?');
            params.push(`%${name}%`);
        }
        if (category) {
            conditions.push('c.category = ?');
            params.push(category);
        }
        if (platforms.length > 0) {
            // creator is on ANY of the ticked platforms
            conditions.push('c.creatorID IN (SELECT creatorID FROM Creator_Platform WHERE Platform IN (?))');
            params.push(platforms);
        }
        if (minFollowers !== null) {
            conditions.push('c.followers >= ?');
            params.push(minFollowers);
        }
        if (maxFollowers !== null) {
            conditions.push('c.followers <= ?');
            params.push(maxFollowers);
        }

        const [rows] = await db.query(
            `SELECT c.creatorID, c.creator_name, c.category, c.followers, c.creator_picture_Link,
                    GROUP_CONCAT(cp.Platform ORDER BY cp.Platform SEPARATOR ', ') AS platforms
             FROM Creator c
             LEFT JOIN Creator_Platform cp ON c.creatorID = cp.creatorID
             WHERE ${conditions.join(' AND ')}
             GROUP BY c.creatorID
             ORDER BY c.creator_name`,
            params
        );

        res.json({ error: false, count: rows.length, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Search failed' });
    }
});

//One Creator
router.get('/creators/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*, GROUP_CONCAT(cp.Platform ORDER BY cp.Platform SEPARATOR ', ') AS platforms
             FROM Creator c
             LEFT JOIN Creator_Platform cp ON c.creatorID = cp.creatorID
             WHERE c.creatorID = ?
             GROUP BY c.creatorID`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: true, message: 'Creator not found' });
        }
        res.json({ error: false, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load creator' });
    }
});

// Add Creators
router.post('/creators', requireJWTAuth, requireAdmin, upload.single('picture'), fixHeic, async (req, res) => {
    const { data, error } = readCreatorForm(req.body);
    if (error) return res.status(400).json({ error: true, message: error });

    const creatorId = 'C' + String(Date.now()).slice(-9);   // fits VARCHAR(10)
    const picture = req.file ? `/creators/${req.file.filename}` : null;

    try {
        await db.beginTransaction();

        await db.query(
            `INSERT INTO Creator (creatorID, category, c_first_name, c_last_name, creator_name,
                                  followers, creator_picture_Link, Description, Status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [creatorId, data.category, data.c_first_name, data.c_last_name, data.creator_name,
             data.followers, picture, data.Description, data.status]
        );
        await savePlatforms(creatorId, data.platforms);
        await logEdit(req.user.UserID, creatorId, 'Create');

        await db.commit();
        console.log(`Creator ${creatorId} created by ${req.user.username}`);
        res.json({ error: false, message: 'Creator added', creatorID: creatorId });
    } catch (err) {
        await db.rollback();
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not add creator' });
    }
});


//Edit Creators
router.put('/creators/:id', requireJWTAuth, requireAdmin, upload.single('picture'), fixHeic, async (req, res) => {
    const creatorId = req.params.id;
    const { data, error } = readCreatorForm(req.body);
    if (error) return res.status(400).json({ error: true, message: error });

    try {
        const [found] = await db.query('SELECT creatorID FROM Creator WHERE creatorID = ?', [creatorId]);
        if (found.length === 0) {
            return res.status(404).json({ error: true, message: 'Creator not found' });
        }

        await db.beginTransaction();

        await db.query(
            `UPDATE Creator
             SET category = ?, c_first_name = ?, c_last_name = ?, creator_name = ?,
                 followers = ?, Description = ?, Status = ?
             WHERE creatorID = ?`,
            [data.category, data.c_first_name, data.c_last_name, data.creator_name,
             data.followers, data.Description, data.status, creatorId]
        );

        if (req.file) {
            await db.query('UPDATE Creator SET creator_picture_Link = ? WHERE creatorID = ?',
                [`/creators/${req.file.filename}`, creatorId]);
        }

        await savePlatforms(creatorId, data.platforms);
        await logEdit(req.user.UserID, creatorId, 'Update');

        await db.commit();
        console.log(`Creator ${creatorId} updated by ${req.user.username}`);
        res.json({ error: false, message: 'Creator updated' });
    } catch (err) {
        await db.rollback();
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not update creator' });
    }
});

/*
  Delete creator (admin): removes the creator for good.
  Their platforms, edit history (Edition rows) and picture file are removed too.
  DELETE http://localhost:3030/creators/C000000001
*/
router.delete('/creators/:id', requireJWTAuth, requireAdmin, async (req, res) => {
    const creatorId = req.params.id;

    try {
        const [found] = await db.query(
            'SELECT creator_name, creator_picture_Link FROM Creator WHERE creatorID = ?', [creatorId]
        );
        if (found.length === 0) {
            return res.status(404).json({ error: true, message: 'Creator not found' });
        }

        await db.beginTransaction();

        // children first, because their foreign keys point at Creator
        await db.query('DELETE FROM Edition WHERE creatorID = ?', [creatorId]);
        await db.query('DELETE FROM Creator_Platform WHERE creatorID = ?', [creatorId]);
        await db.query('DELETE FROM Creator WHERE creatorID = ?', [creatorId]);

        await db.commit();

        // remove the picture file from the FE public folder (if there was one)
        const picture = found[0].creator_picture_Link;   // e.g. /creators/1763350000000.jpg
        if (picture) {
            const picturePath = path.join(__dirname, '..', '..', 'sec1_gr11_fe_src', 'public', picture);
            fs.promises.unlink(picturePath).catch(() => {});
        }

        console.log(`Creator ${creatorId} (${found[0].creator_name}) deleted by ${req.user.username}`);
        res.json({ error: false, message: 'Creator deleted' });
    } catch (err) {
        await db.rollback();
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not delete creator' });
    }
});

// ------------------ ERRORS ------------------
// Catches upload errors (file too big, not an image) and anything else unexpected
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(400).json({ error: true, message: err.message });
});


app.listen(port, () => {
    console.log(`Listening at port: ${port}`)
})