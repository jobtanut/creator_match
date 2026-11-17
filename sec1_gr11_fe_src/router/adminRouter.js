const express = require("express")
const path = require("path")
const router = express.Router()

// Admin menu (first page after an admin logs in)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "menu.html"))
});

// Add / edit one creator (/admin/creator or /admin/creator?id=...)
router.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin_manage.html"))
});

// Admin Manage: search + list
router.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin_search.html"))
});

// Add / edit one admin (/admin/account or /admin/account?id=...)
router.get('/creators', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "creator_search.html"))
});

// Creator Manage: search + list
router.get('/creatorm', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "creator_manage.html"))
});

module.exports = router;