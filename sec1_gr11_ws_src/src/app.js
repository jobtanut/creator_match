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
const convertHeic = require('heic-convert');
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

// iPhone photos are HEIC, which browsers can't display.
// After multer saves the file, convert HEIC/HEIF to JPG and use the JPG instead.
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


// Login (admins and regular users)
// Test 1 (admin, correct password):
// method: POST
// URL: http://localhost:3030/login
// body: x-www-form-urlencoded
//     username: admin
//     password: admin1234
// expected: 302 redirect to http://localhost:8081/admin, cookie "token" is set,
//         new 'Success' row in Login_log

//

//test1 not pass the preview page not showing


// Test 2 (wrong password):
// method: POST
// URL: http://localhost:3030/login
// body: x-www-form-urlencoded
//     username: admin
//     password: wrongpass
// expected: 401, login page HTML with "Incorrect username or password"


//test2 pass


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
    const logId = 'L' + Date.now();

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

// Testing Sign up
// Test 1 (new user):
//   method: POST
//   URL: http://localhost:3030/signup
//   body: x-www-form-urlencoded
//     first_name: Pakorn
//     last_name: Srisawat
//     email: pakorn@example.com
//     username: pakorn
//     password: pakorn123
//     confirm_password: pakorn123
//   expected: 302 redirect to http://localhost:8081/auth/login


//test1 pass


// Test 2 (username already taken):
//   method: POST
//   URL: http://localhost:3030/signup
//   body: x-www-form-urlencoded
//     first_name: Test
//     last_name: Duplicate
//     email: someone-new@example.com
//     username: user1
//     password: password123
//     confirm_password: password123
//   expected: 409, sign up page HTML with "Username is already taken"

//test2 
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

// Testing Search for creators
// Test 1 (no criteria = every creator):
//   method: GET
//   URL: http://localhost:3030/creators
//   expected: 200, { "error": false, "count": 14, "data": [ ... ] }
// Test 2 (search with criteria):
//   method: GET
//   URL: http://localhost:3030/creators?category=Lifestyle&status=Inactive&platform=YouTube
//   expected: 200, one result: MintFitLife

router.get('/creators', async (req, res) => {
    try {
        const name = (req.query.name || '').trim();
        const category = (req.query.category || '').trim();
        const status = (req.query.status || '').trim();
        const platforms = [].concat(req.query.platform || []).filter((p) => p);

        const conditions = [];
        const params = [];

        if (name) {
            conditions.push('c.creator_name LIKE ?');
            params.push(`%${name}%`);
        }
        if (category) {
            conditions.push('c.category = ?');
            params.push(category);
        }
        if (status) {
            conditions.push('c.Status = ?');
            params.push(status);
        }
        if (platforms.length > 0) {
            conditions.push('c.creatorID IN (SELECT creatorID FROM Creator_Platform WHERE Platform IN (?))');
            params.push(platforms);
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

        const [rows] = await db.query(
            `SELECT c.*, GROUP_CONCAT(cp.Platform ORDER BY cp.Platform SEPARATOR ', ') AS platforms
             FROM Creator c
             LEFT JOIN Creator_Platform cp ON c.creatorID = cp.creatorID
             ${where}
             GROUP BY c.creatorID
             ORDER BY c.creator_name`,
            params
        );

        res.json({ error: false, count: rows.length, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load creators' });
    }
});

// Testing Featured creators for the home page (6 random Active creators)
// Test 1:
//   method: GET
//   URL: http://localhost:3030/creators/featured
//   expected: 200, "data" has 6 creators, all with Status Active
// Test 2 (send again):
//   method: GET
//   URL: http://localhost:3030/creators/featured
//   expected: 200, 6 creators in a different random order / selection

// Home Page Creators (must stay above /creators/:id)
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
             LIMIT 8`
        );
        res.json({ error: false, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load featured creators' });
    }
});


// Testing Lowest and highest follower counts of Active creators (search page slider)
// Test 1:
//   method: GET
//   URL: http://localhost:3030/creators/follower-range
//   expected: 200, { "error": false, "min": 0, "max": 1200000 }
// Test 2 (after deactivating the biggest creator):
//   first edit FahDaily (C000000103) to Status Inactive with PUT /creators/C000000103, then
//   method: GET
//   URL: http://localhost:3030/creators/follower-range
//   expected: 200, "max" drops to 880000

// Follower range of active creators, for the search page slider (must stay above /creators/:id)
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

// Testing Advanced search (public)
// Test 1 (name + category + platform):
//   method: GET
//   URL: http://localhost:3030/creators/search?name=eats&category=Food&platform=TikTok
//   expected: 200, one result: PloyEats
// Test 2 (follower range + two platforms):
//   method: GET
//   URL: http://localhost:3030/creators/search?platform=Facebook&platform=YouTube&min_followers=100000&max_followers=900000
//   expected: 200, three results: BankFits, JayDessert, TechTom
// Test 3 (bad range):
//   method: GET
//   URL: http://localhost:3030/creators/search?min_followers=500000&max_followers=100000
//   expected: 400, "Minimum followers cannot be more than maximum"

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

// Testing Search One creator (public)
// Test 1:
//   method: GET
//   URL: http://localhost:3030/creators/C000000101
//   expected: 200, PloyEats with platforms "Instagram, TikTok"
// Test 2 (does not exist):
//   method: GET
//   URL: http://localhost:3030/creators/C999999999
//   expected: 404, { "error": true, "message": "Creator not found" }

// Search One Creator
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


// Testing Add creator (admin only)
// Test 1 (with picture):
//   method: POST
//   URL: http://localhost:3030/creators
//   header: Authorization: <admin token>
//   body: form-data
//     creator_name: CafeHopperTH
//     category: Lifestyle
//     c_first_name: Nam
//     c_last_name: Prasertsuk
//     followers: 75000
//     platforms: Instagram, TikTok
//     Description: Cafe reviews around Bangkok
//     Status: Active
//     picture: (type File) choose a .jpg / .png / .heic
//   expected: 200, { "error": false, "message": "Creator added", "creatorID": "C..." }
// Test 2 (no token):
//   method: POST
//   URL: http://localhost:3030/creators
//   body: form-data
//     creator_name: NoTokenTest
//     category: Food
//   expected: 401 Unauthorized
// Test 3 (logged in as a regular user, token from user1 / user1pass):
//   same as Test 1 with header Authorization: <user1 token>
//   expected: 403, "Admins only"

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

// Testing Edit creator (admin only). Picture is only replaced if a new file is sent.
// Test 1 (change followers and status):
//   method: PUT
//   URL: http://localhost:3030/creators/C000000107
//   header: Authorization: <admin token>
//   body: form-data
//     creator_name: TechTom
//     category: Technology
//     c_first_name: Tom
//     c_last_name: Kittipong
//     followers: 350000
//     platforms: YouTube, Facebook
//     Description: Gadget reviews and phone comparisons in Thai
//     Status: Inactive
//   expected: 200, "Creator updated"
// Test 2 (invalid followers):
//   method: PUT
//   URL: http://localhost:3030/creators/C000000107
//   header: Authorization: <admin token>
//   body: form-data
//     creator_name: TechTom
//     category: Technology
//     followers: -10
//   expected: 400, "Followers must be a whole number, 0 or more"

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

// Testing Delete creator (admin only)
// Test 1:
//   method: DELETE
//   URL: http://localhost:3030/creators/C000000104
//   header: Authorization: <admin token>
//   expected: 200, "Creator deleted"
// Test 2 (already deleted / does not exist):
//   method: DELETE
//   URL: http://localhost:3030/creators/C000000104
//   header: Authorization: <admin token>
//   expected: 404, "Creator not found"

// Delete Creators
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


// ------------------ TEAM (About Us page) ------------------
// Testing Team members (public)
// Test 1:
//   method: GET
//   URL: http://localhost:3030/team
//   expected: 200, 5 team members
// Test 2 (check the fields):
//   method: GET
//   URL: http://localhost:3030/team
//   expected: every item has t_first_name, t_last_name, position, email,
//             member_picture_link and social_link

//List Team
// const TEAM_FIELDS = `TeamMemberID, t_first_name, t_last_name, position, role, email,
//                      member_picture_link, social_link`;

// router.get('/team', async (req, res) => {
//     try {
//         const [rows] = await db.query(`SELECT ${TEAM_FIELDS} FROM Team_Member ORDER BY TeamMemberID`);
//         res.json({ error: false, data: rows });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: true, message: 'Could not load team' });
//     }
// });

// Testing One team member (public)
// Test 1:
//   method: GET
//   URL: http://localhost:3030/team/T000000001
//   expected: 200, Tanut Noumanong with social_link https://github.com/jobtanut
// Test 2 (does not exist):
//   method: GET
//   URL: http://localhost:3030/team/T999999999
//   expected: 404, "Team member not found"
router.get('/team/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT ${TEAM_FIELDS} FROM Team_Member WHERE TeamMemberID = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: true, message: 'Team member not found' });
        res.json({ error: false, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load team member' });
    }
});

// ------------------ ADMIN ACCOUNTS (admin only) ------------------
 
// Admin accounts are rows in User_account with Role_ID = 1. Passwords are never sent back.
const ADMIN_FIELDS = `UserID, username, email, first_name, last_name, Position, TeamMemberID, created_at`;

// Records "superAdmin changed admin" in the Management table (one row per pair, time updated)
const logManagement = (superAdminId, adminId) => db.query(
    `INSERT INTO Management (superAdminID, AdminID, manage_timestamp) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE manage_timestamp = NOW()`,
    [superAdminId, adminId]
);

// Reads and checks the admin form. passwordRequired = true when adding, false when editing.
const readAdminForm = (body, passwordRequired) => {
    const data = {
        username: (body.username || '').trim(),
        email: (body.email || '').trim(),
        password: body.password || '',
        first_name: (body.first_name || '').trim(),
        last_name: (body.last_name || '').trim(),
        Position: (body.Position || '').trim() || null,
        TeamMemberID: (body.TeamMemberID || '').trim() || null,
    };

    if (!data.username || !data.email || !data.first_name || !data.last_name) {
        return { error: 'Username, email, first name and last name are required' };
    }
    if (passwordRequired && !data.password) return { error: 'Password is required' };
    if (data.password && data.password.length < 8) return { error: 'Password must be at least 8 characters' };

    return { data };
};

// Turns MySQL errors into messages an admin can act on
const adminDbError = (err) => {
    if (err.code === 'ER_DUP_ENTRY') {
        if (err.message.includes('uq_user_username')) return 'That username is already taken';
        if (err.message.includes('uq_user_email')) return 'That email is already used';
        if (err.message.includes('uq_user_team_member')) return 'That team member already has an account';
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return 'That team member does not exist';
    return null;
};

// Testing Search / list admin accounts (admin only). No criteria = every admin.
// Test 1 (all admins):
//   method: GET
//   URL: http://localhost:3030/admins
//   header: Authorization: <admin token>
//   expected: 200, "count": 3, no password field in any result
// Test 2 (search with criteria):
//   method: GET
//   URL: http://localhost:3030/admins?name=tanut&email=creatormatch&position=Developer
//   header: Authorization: <admin token>
//   expected: 200, one result: admin (Tanut Noumanong)

// Search admin account
router.get('/admins', requireJWTAuth, requireAdmin, async (req, res) => {
    try {
        const name = (req.query.name || '').trim();
        const email = (req.query.email || '').trim();
        const position = (req.query.position || '').trim();

        const conditions = ['Role_ID = ?'];
        const params = [ROLE_ADMIN];

        if (name) {
            conditions.push("(first_name LIKE ? OR last_name LIKE ? OR username LIKE ?)");
            params.push(`%${name}%`, `%${name}%`, `%${name}%`);
        }
        if (email) {
            conditions.push('email LIKE ?');
            params.push(`%${email}%`);
        }
        if (position) {
            conditions.push('Position LIKE ?');
            params.push(`%${position}%`);
        }

        const [rows] = await db.query(
            `SELECT ${ADMIN_FIELDS} FROM User_account WHERE ${conditions.join(' AND ')} ORDER BY first_name`,
            params
        );
        res.json({ error: false, count: rows.length, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load admins' });
    }
});

// Testing View one admin account (admin only)
// Test 1:
//   method: GET
//   URL: http://localhost:3030/admins/U000000002
//   header: Authorization: <admin token>
//   expected: 200, benya (Benya Shinno)
// Test 2 (a regular user's ID is not an admin):
//   method: GET
//   URL: http://localhost:3030/admins/U000000101
//   header: Authorization: <admin token>
//   expected: 404, "Admin not found"

// Find admin account
router.get('/admins/:id', requireJWTAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT ${ADMIN_FIELDS} FROM User_account WHERE UserID = ? AND Role_ID = ?`,
            [req.params.id, ROLE_ADMIN]
        );
        if (rows.length === 0) return res.status(404).json({ error: true, message: 'Admin not found' });
        res.json({ error: false, data: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not load admin' });
    }
});

// Testing Add admin account (admin only)
// Test 1 (linked to a team member):
//   method: POST
//   URL: http://localhost:3030/admins
//   header: Authorization: <admin token>
//   body: raw JSON
//   {
//     "username": "monthisa",
//     "email": "monthisa.admin@creatormatch.com",
//     "password": "monthisa123",
//     "first_name": "Monthisa",
//     "last_name": "Member",
//     "Position": "Team Member",
//     "TeamMemberID": "T000000004"
//   }
//   expected: 200, "Admin added"
// Test 2 (password too short):
//   method: POST
//   URL: http://localhost:3030/admins
//   header: Authorization: <admin token>
//   body: raw JSON
//   {
//     "username": "shortpw",
//     "email": "shortpw@creatormatch.com",
//     "password": "123",
//     "first_name": "Short",
//     "last_name": "Password"
//   }
//   expected: 400, "Password must be at least 8 characters"
 
// add admin account
router.post('/admins', requireJWTAuth, requireAdmin, async (req, res) => {
    const { data, error } = readAdminForm(req.body, true);
    if (error) return res.status(400).json({ error: true, message: error });

    const userId = 'U' + String(Date.now()).slice(-9);

    try {
        await db.beginTransaction();
        await db.query(
            `INSERT INTO User_account
                (UserID, username, email, password, first_name, last_name, Position, Role_ID, TeamMemberID)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, data.username, data.email, data.password, data.first_name, data.last_name,
             data.Position, ROLE_ADMIN, data.TeamMemberID]
        );
        await logManagement(req.user.UserID, userId);
        await db.commit();

        console.log(`Admin ${userId} (${data.username}) created by ${req.user.username}`);
        res.json({ error: false, message: 'Admin added', UserID: userId });
    } catch (err) {
        await db.rollback();
        const msg = adminDbError(err);
        if (msg) return res.status(409).json({ error: true, message: msg });
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not add admin' });
    }
});

// Testing Edit admin account (admin only). Leave "password" out to keep the current one.
// Test 1 (change position, keep password):
//   method: PUT
//   URL: http://localhost:3030/admins/U000000003
//   header: Authorization: <admin token>
//   body: raw JSON
//   {
//     "username": "naphat",
//     "email": "naphat.admin@creatormatch.com",
//     "first_name": "Naphat",
//     "last_name": "Member",
//     "Position": "Project Manager"
//   }
//   expected: 200, "Admin updated"
// Test 2 (username already used by another admin):
//   method: PUT
//   URL: http://localhost:3030/admins/U000000003
//   header: Authorization: <admin token>
//   body: raw JSON
//   {
//     "username": "benya",
//     "email": "naphat.admin@creatormatch.com",
//     "first_name": "Naphat",
//     "last_name": "Member"
//   }
//   expected: 409, "That username is already taken"
 
// Edit Admin
router.put('/admins/:id', requireJWTAuth, requireAdmin, async (req, res) => {
    const adminId = req.params.id;
    const { data, error } = readAdminForm(req.body, false);
    if (error) return res.status(400).json({ error: true, message: error });

    try {
        const [found] = await db.query('SELECT UserID FROM User_account WHERE UserID = ? AND Role_ID = ?', [adminId, ROLE_ADMIN]);
        if (found.length === 0) return res.status(404).json({ error: true, message: 'Admin not found' });

        await db.beginTransaction();
        await db.query(
            `UPDATE User_account
             SET username = ?, email = ?, first_name = ?, last_name = ?, Position = ?, TeamMemberID = ?
             WHERE UserID = ?`,
            [data.username, data.email, data.first_name, data.last_name, data.Position, data.TeamMemberID, adminId]
        );
        if (data.password) {
            await db.query('UPDATE User_account SET password = ? WHERE UserID = ?', [data.password, adminId]);
        }
        await logManagement(req.user.UserID, adminId);
        await db.commit();

        console.log(`Admin ${adminId} updated by ${req.user.username}`);
        res.json({ error: false, message: 'Admin updated' });
    } catch (err) {
        await db.rollback();
        const msg = adminDbError(err);
        if (msg) return res.status(409).json({ error: true, message: msg });
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not update admin' });
    }
});

// Testing delete admin account (admin only). Cannot delete yourself or the last admin.
// Test 1:
//   method: DELETE
//   URL: http://localhost:3030/admins/U000000003
//   header: Authorization: <admin token>
//   expected: 200, "Admin deleted"
// Test 2 (deleting your own account, logged in as admin = U000000001):
//   method: DELETE
//   URL: http://localhost:3030/admins/U000000001
//   header: Authorization: <admin token>
//   expected: 400, "You cannot delete your own account"
 
// Delete Admin
router.delete('/admins/:id', requireJWTAuth, requireAdmin, async (req, res) => {
    const adminId = req.params.id;

    if (adminId === req.user.UserID) {
        return res.status(400).json({ error: true, message: 'You cannot delete your own account' });
    }

    try {
        const [found] = await db.query('SELECT username FROM User_account WHERE UserID = ? AND Role_ID = ?', [adminId, ROLE_ADMIN]);
        if (found.length === 0) return res.status(404).json({ error: true, message: 'Admin not found' });

        const [[{ admins }]] = await db.query('SELECT COUNT(*) AS admins FROM User_account WHERE Role_ID = ?', [ROLE_ADMIN]);
        if (admins <= 1) return res.status(400).json({ error: true, message: 'Cannot delete the last admin' });

        await db.beginTransaction();
        // rows that point at this admin go first (Login_log is removed automatically by ON DELETE CASCADE)
        await db.query('DELETE FROM Management WHERE superAdminID = ? OR AdminID = ?', [adminId, adminId]);
        await db.query('DELETE FROM Edition WHERE AdminID = ?', [adminId]);
        await db.query('DELETE FROM User_account WHERE UserID = ?', [adminId]);
        await db.commit();

        console.log(`Admin ${adminId} (${found[0].username}) deleted by ${req.user.username}`);
        res.json({ error: false, message: 'Admin deleted' });
    } catch (err) {
        await db.rollback();
        console.error(err);
        res.status(500).json({ error: true, message: 'Could not delete admin' });
    }
});

// ------------------ ERRORS ------------------
// Catches upload errors (file too big, not an image) and anything else unexpected
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(400).json({ error: true, message: err.message });
});

// ------------------ Trends ------------------
// Results are kept for 30 minutes per category, to save the free 100 requests/day.

const NEWS_URL = 'https://newsapi.org/v2/top-headlines';
const NEWS_CATEGORIES = ['general', 'entertainment', 'sports', 'technology', 'business'];
const NEWS_CACHE_MS = 30 * 60 * 1000;
const newsCache = {};   

// One request to NewsAPI for one category and country
const getHeadlines = async (category, country) => {
    const params = new URLSearchParams({
        category, country, pageSize: 4, apiKey: process.env.NEWS_API_KEY,
    });
    const response = await fetch(`${NEWS_URL}?${params}`, {
        headers: { 'User-Agent': 'CreatorMatch/1.0' },   // NewsAPI rejects server requests without one
    });
    const data = await response.json();

    if (data.status === 'error') {
        const err = new Error(data.message);
        err.code = data.code;
        throw err;
    }
    // NewsAPI sometimes returns deleted articles titled "[Removed]", skip them
    return data.articles.filter((a) => a.title && a.title !== '[Removed]');
};

// Testing Trending news (public)
// Test 1:
//   method: GET
//   URL: http://localhost:3030/trends?category=sports
//   expected: 200, { "error": false, "category": "sports", "country": "th" (or "us"), "data": [ ... ] },
//             every item has title, url, image, source and publishedAt
// Test 2 (category that does not exist):
//   method: GET
//   URL: http://localhost:3030/trends?category=food
//   expected: 400, "Category must be one of: general, entertainment, sports, technology, business"

router.get('/trends', async (req, res) => {
    const category = (req.query.category || 'general').trim();
    if (!NEWS_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: true, message: 'Category must be one of: ' + NEWS_CATEGORIES.join(', ') });
    }

    const cached = newsCache[category];
    if (cached && Date.now() - cached.time < NEWS_CACHE_MS) {
        return res.json({ error: false, cached: true, ...cached.body });
    }

    try {
        // Thailand first; if that category is empty, fall back to US headlines
        let country = 'th';
        let articles = await getHeadlines(category, country);
        if (articles.length === 0) {
            country = 'us';
            articles = await getHeadlines(category, country);
        }

        const body = {
            category,
            country,
            count: articles.length,
            data: articles.map((a) => ({
                title: a.title,
                url: a.url,
                image: a.urlToImage,
                source: a.source ? a.source.name : '',
                publishedAt: a.publishedAt,
            })),
        };
        newsCache[category] = { time: Date.now(), body };

        console.log(`Trends: ${category} (${country}), ${articles.length} articles from NewsAPI`);
        res.json({ error: false, cached: false, ...body });
    } catch (err) {
        console.error('NewsAPI error:', err.code || '', err.message);
        if (err.code === 'rateLimited') {
            return res.status(429).json({ error: true, message: 'NewsAPI daily limit reached, try again tomorrow' });
        }
        if (err.code === 'apiKeyInvalid' || err.code === 'apiKeyMissing') {
            return res.status(500).json({ error: true, message: 'NewsAPI key is missing or wrong in .env' });
        }
        res.status(502).json({ error: true, message: 'Could not load trending news' });
    }
});

app.listen(port, () => {
    console.log(`Listening at port: ${port}`)
})