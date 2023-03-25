"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const express_session_1 = __importDefault(require("express-session"));
const redis_1 = require("redis");
const knex_1 = require("knex");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const cors_1 = __importDefault(require("cors"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const port = 8080;
const knexConfig = {
    client: 'postgres',
    connection: {
        host: '127.0.0.1',
        port: 5432,
        user: 'brontosaur',
        password: '1234',
        database: 'dbMDS'
    },
};
const knexInstance = (0, knex_1.knex)(knexConfig);
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
function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt_1.default
        .hash(password, saltRounds);
}
function isEmailUnique(email) {
    return knexInstance
        .column('email')
        .select()
        .from('Users')
        .where('email', email)
        .then((x) => x.length === 0)
        .catch(err => {
        console.log(err.message);
        return false;
    });
}
app.post('/signup', (req, res, next) => {
    hashPassword(req.body.password)
        .then(passwordHash => {
        let id = (0, uuid_1.v4)();
        const user = {
            id,
            email: req.body.email,
            passwordHash,
        };
        isEmailUnique(user.email)
            .then(isUnique => {
            if (isUnique) {
                knexInstance('Users')
                    .insert(user)
                    .then(x => {
                    const sessionUser = {
                        id: user.id,
                        username: "username",
                        email: user.email,
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
                            res.send(sessionUser);
                        });
                    });
                })
                    .catch(err => console.log(err.message));
            }
            else {
                res.send(undefined);
            }
        });
    })
        .catch(err => console.log(err.message));
});
function validateUser(password, storedHash) {
    return bcrypt_1.default
        .compare(password, storedHash)
        .then(res => res)
        .catch(err => {
        console.error(err.message);
        return false;
    });
}
function getUserPassword(email) {
    return knexInstance
        .select('passwordHash')
        .from('Users')
        .where('email', email)
        .then(x => {
        if (x.length === 0)
            return undefined;
        return x[0].passwordHash;
    })
        .catch(err => {
        console.error(err.message);
        return undefined;
    });
}
app.post('/login', (req, res, next) => {
    getUserPassword(req.body.email)
        .then(hash => validateUser(req.body.password, hash))
        .then(isValidated => {
        if (isValidated) {
            knexInstance
                .select('id', 'email')
                .from('Users')
                .where('email', req.body.email)
                .then(x => x[0])
                .then(x => {
                return {
                    id: x.id,
                    email: x.email,
                    username: "username"
                };
            })
                .then(sessionUser => {
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
                        res.send(sessionUser);
                    });
                });
            })
                .catch(err => {
                console.error(err.message);
            });
        }
        else {
            res.send(undefined);
        }
    })
        .catch(err => {
        console.error(err.message);
    });
});
function isAuthenticated(req, res, next) {
    if (req.session.user)
        next();
    else
        next('route');
}
app.get('/whoami', (req, res) => {
    res.send(req.session.user);
});
app.get('/logout', function (req, res, next) {
    // logout logic
    // clear the user from the session object and save.
    // this will ensure that re-using the old session id
    // does not have a logged in user
    req.session.user = undefined;
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
