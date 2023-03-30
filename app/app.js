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
const AuthenticationRoutes_1 = require("./routes/AuthenticationRoutes");
const PostRoutes_1 = require("./routes/PostRoutes");
const app = (0, express_1.default)();
const port = 8080;
// https certificate
const options = {
    key: fs_1.default.readFileSync(`certificate/client-key.pem`),
    cert: fs_1.default.readFileSync(`certificate/client-cert.pem`)
};
// redis connection for session storage
let redisClient = (0, redis_1.createClient)();
redisClient.connect().catch(console.error);
let redisStore = new connect_redis_1.default({
    client: redisClient,
    prefix: "proiectmds:",
});
// cookie options
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
app.use(AuthenticationRoutes_1.auth);
app.use(PostRoutes_1.postRouter);
const httpsServer = https_1.default.createServer(options, app);
httpsServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
