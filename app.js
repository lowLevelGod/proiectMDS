"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const express_session_1 = __importDefault(require("express-session"));
const redis_1 = require("redis");
const cors_1 = __importDefault(require("cors"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const port = 8080;
const options = {
    key: fs_1.default.readFileSync(`certificate/client-key.pem`),
    cert: fs_1.default.readFileSync(`certificate/client-cert.pem`)
};
let redisClient = (0, redis_1.createClient)();
redisClient.connect().catch(console.error);
let redisStore = new connect_redis_1.default({
    client: redisClient,
    prefix: "proiectmds:",
});
app.use((0, express_session_1.default)({
    name: "dinoSnack",
    store: redisStore,
    resave: false,
    saveUninitialized: false,
    secret: "brontosaurus",
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
    }
}));
app.use((0, cors_1.default)({
    origin: "https://localhost:4200",
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
    credentials: true,
}));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send("Hello world!");
});
app.post('/login', (req, res, next) => {
    const sessionUser = {
        id: "id 1234",
        username: "username",
        email: req.body.email,
    };
    req.session.regenerate(function (err) {
        if (err)
            next(err);
        // store user information in session, typically a user id
        req.session.user = sessionUser;
        // save the session before redirection to ensure page
        // load does not happen before session is saved
        req.session.save(function (err) {
            if (err)
                return next(err);
            res.redirect('/');
        });
    });
});
app.get('/whoami', (req, res) => {
    const isLoggedIn = req.session.user ? true : false;
    res.send(isLoggedIn);
});
app.get('/logout', function (req, res, next) {
    // logout logic
    // clear the user from the session object and save.
    // this will ensure that re-using the old session id
    // does not have a logged in user
    req.session.user = { "": "" };
    req.session.destroy(function (err) {
        if (err)
            next(err);
        res.clearCookie('dinoSnack');
        res.send('ok');
    });
});
const httpsServer = https_1.default.createServer(options, app);
httpsServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
