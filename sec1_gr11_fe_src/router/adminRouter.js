const express = require("express")
const path = require("path")
const router = express.Router()

// Creator Management
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "admin.html"))
});

// Add / edit one creator
router.get('/creator', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "creator-form.html"))
});

// Admin Account Search
router.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "search_admin.html"))
});

// Add / edit one admin
router.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, '..', "html", "admin", "manage_admin.html"))
});

module.exports = router;