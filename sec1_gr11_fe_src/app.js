const express = require("express");
const router = express.Router();
const path = require("path");
const app = express();
const dotenv = require('dotenv').config();
const port = process.env.PORT;

// Router
const searchRouter = require('./router/searchRouter');
const teamRouter = require('./router/teamRouter');
const authRouter = require('./router/authRouter');
const adminRouter = require('./router/adminRouter');
const creatorRouter = require('./router/creatorRouter');
const trendsRouter =require('./router/trendsRouter');


app.use("/", express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "html")));
app.use(express.static(path.join(__dirname,"assets")));

app.use(router);
app.use('/search', searchRouter);
app.use('/team', teamRouter);
app.use('/auth', authRouter);
app.use('/admin',adminRouter);
app.use('/creator', creatorRouter);
app.use('/trends', trendsRouter);

router.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, "html", "home.html"));
});

app.listen(port, () => {
    console.log(`Frontend server listening on port: ${port}`)
});