const express = require("express")
const path = require("path")
const router = express.Router()

const fs = require("fs");

router.get("/login", (req, res) => {
    const html = fs.readFileSync(path.join(__dirname, "..", "html", "login.html"), "utf8");
    const msg = req.query.error ? "Incorrect username or password" : "";
    res.send(html.replace("{{error}}", msg));
});

router.get('/signup', (req,res) => {
    res.sendFile(path.join(__dirname, '..', "html", "signup.html"))
});



module.exports = router;