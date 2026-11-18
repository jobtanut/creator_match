const express = require("express")
const path = require("path")
const router = express.Router()

// Admin menu (first page after an admin logs in)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin_menu.html"))
});

// Add / edit one creator
router.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin_manage.html"))
});

// Admin Manage: search + list
router.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin_search.html"))
});

// Add / edit one admin
router.get('/creators', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "creator_search.html"))
});

// Creator Manage: search + list
router.get('/creatorm', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "creator_manage.html"))
});

module.exports = router;