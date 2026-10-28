const express = require("express")
const router = express.Router()
const path = require("path")
const app = express()

app.use('/')
app.use(express.static(path.join(__dirname, "html")))
app.use(express.static(path.join(__dirname,"assets")))

app.use(router);
app.use("/home", homeRouter)

router.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, "html", "home.html"))
})