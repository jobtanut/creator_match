const express = require("express")
const path = require("path")
const router = express.Router()

// Admin menu (first page after an admin logs in)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin_menu.html"))
});

// Admin
router.get('/adminmanage', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin_manage.html"))
});

router.get('/admins', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin_search.html"))
});

// Creator
router.get('/creators', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "creator_search.html"))
});

router.get('/creatormanage', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "creator_manage.html"))
});

//User
router.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "user_search.html"))
});

router.get('/usermanage', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "user_manage.html"))
});

module.exports = router;