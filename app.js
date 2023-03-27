"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const express_session_1 = __importDefault(require("express-session"));
const redis_1 = require("redis");
const knex_1 = require("knex");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const cors_1 = __importDefault(require("cors"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const app = (0, express_1.default)();
const port = 8080;
function craftPictureDest(userId) {
    return path_1.default.join('resources/users/', userId, 'pictures/');
}
const multerStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // resources/users/{userID}/pictures/{pictureID}.extension
        let dir = craftPictureDest(req.session.user.id);
        fs_1.default.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                throw err;
            }
            cb(null, dir);
        });
    },
    filename: (req, file, cb) => {
        cb(null, (0, uuid_1.v4)() + path_1.default.extname(file.originalname));
    }
});
// middleware for uploading files
const uploadFiles = (0, multer_1.default)({ storage: multerStorage });
// send this to identify error
const errorCodes = Object.freeze({
    other: 1,
    emailTaken: 2,
    notLoggedIn: 3,
    failedToUpload: 4,
    unAuthorized: 5,
    notFound: 6,
});
function craftError(errorCode, errorMsg) {
    return {
        errorCode,
        errorMsg,
    };
}
// database connection
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
// SQL query builder
// use it to query POSTGRES database
const knexInstance = (0, knex_1.knex)(knexConfig);
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
app.get('/', (req, res) => {
    res.send("Hello world!");
});
// for database storage
function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt_1.default
        .hash(password, saltRounds);
}
// cannot have 2 users with same email
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
// returns JSON {error, content} and sets http status code
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
                        if (err) {
                            const error = craftError(errorCodes.other, "Please try signing up again!");
                            return res.status(500).json({ error, content: undefined });
                        }
                        // store user information in session, typically a user id
                        req.session.user = sessionUser;
                        // save the session before redirection to ensure page
                        // load does not happen before session is saved
                        req.session.save(function (err) {
                            if (err) {
                                const error = craftError(errorCodes.other, "Please try signing up again!");
                                return res.status(500).json({ error, content: undefined });
                            }
                            return res.status(200).json({ error: undefined, content: sessionUser });
                        });
                    });
                })
                    .catch(err => {
                    console.log(err.message);
                    const error = craftError(errorCodes.other, "Please try signing up again!");
                    return res.status(500).json({ error, content: undefined });
                });
            }
            else {
                const error = craftError(errorCodes.emailTaken, "Email is already taken!");
                return res.status(409).json({ error, content: undefined });
            }
        });
    })
        .catch(err => {
        console.log(err.message);
        const error = craftError(errorCodes.other, "Please try signing up again!");
        return res.status(500).json({ error, content: undefined });
    });
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
// returns JSON {error, content} and sets http status code
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
                    if (err) {
                        const error = craftError(errorCodes.other, "Please try logging in again!");
                        return res.status(500).json({ error, content: undefined });
                    }
                    // store user information in session, typically a user id
                    req.session.user = sessionUser;
                    return res.status(200).json({ error: undefined, content: sessionUser });
                });
            })
                .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try logging in again!");
                return res.status(500).json({ error, content: undefined });
            });
        }
        else {
            const error = craftError(errorCodes.other, "Email or password wrong!");
            return res.status(403).json({ error, content: undefined });
        }
    })
        .catch(err => {
        console.error(err.message);
        const error = craftError(errorCodes.other, "Email or password wrong!");
        return res.status(403).json({ error, content: undefined });
    });
});
function isAuthenticated(req, res, next) {
    if (req.session.user)
        next();
    else {
        const error = craftError(errorCodes.notLoggedIn, "Please log in first!");
        return res.status(403).json({ error, content: undefined });
    }
}
// returns JSON {error, content} and sets http status code
app.get('/whoami', isAuthenticated, (req, res) => {
    return res.status(200).json({ error: undefined, content: req.session.user });
});
// returns JSON {error, content} and sets http status code
app.get('/logout', function (req, res, next) {
    // logout logic
    // clear the user from the session object and save.
    // this will ensure that re-using the old session id
    // does not have a logged in user
    req.session.user = undefined;
    req.session.destroy(function (err) {
        if (err) {
            const error = craftError(errorCodes.other, "Log out failed!");
            return res.status(500).json({ error, content: undefined });
        }
        return res.clearCookie('dinoSnack').status(200).json({ error: undefined, content: undefined });
    });
});
function uploadMedia(req, res, next) {
    const upload = uploadFiles.array('media', 10);
    upload(req, res, function (err) {
        if (err instanceof multer_1.default.MulterError) {
            if (err.message === 'Unexpected field') {
                const error = craftError(errorCodes.failedToUpload, "Too many files!");
                return res.status(400).json({ error, content: undefined });
            }
            // A Multer error occurred when uploading.
            const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        }
        else if (err) {
            // An unknown error occurred when uploading.
            const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        }
        // Everything went fine. 
        return next();
    });
}
function getPostMetaData(post) {
    let postMetaData = {
        id: post.id,
        createdAt: post.createdAt,
        userId: post.userId,
        description: post.description,
    };
    return postMetaData;
}
app.post('/posts', isAuthenticated, uploadMedia, function (req, res, next) {
    if (!req.files) {
        const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
        return res.status(500).json({ error, content: undefined });
    }
    if (req.files.length === 0) {
        const error = craftError(errorCodes.failedToUpload, "At least one file required!");
        return res.status(400).json({ error, content: undefined });
    }
    let id = (0, uuid_1.v4)();
    const files = req.files;
    let picturesURLs = files === null || files === void 0 ? void 0 : files.map((file) => file.filename);
    let createdAt = new Date();
    let userId = req.session.user.id;
    let description = req.body.description;
    let post = {
        id,
        createdAt,
        userId,
        description,
        picturesURLs,
    };
    knexInstance('Posts')
        .insert(post)
        .then(x => {
        // we don't want to send file paths to client
        let postMetaData = getPostMetaData(post);
        return res.status(200).json({ error: undefined, content: postMetaData });
    })
        .catch(err => {
        console.error(err.message);
        const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
        return res.status(500).json({ error, content: undefined });
    });
});
function getPostOwner(id) {
    return knexInstance
        .select('userId', 'picturesURLs')
        .from('Posts')
        .where('id', id)
        .then(x => {
        if (x.length === 0)
            return undefined;
        const res = {
            userId: x[0].userId,
            picturesURLs: x[0].picturesURLs
        };
        return res;
    })
        .catch(err => {
        console.error(err.message);
        return undefined;
    });
}
function deleteFiles(files, callback) {
    var i = files.length;
    files.forEach(function (filepath) {
        fs_1.default.unlink(filepath, function (err) {
            i--;
            if (err) {
                callback(err);
                return;
            }
            else if (i <= 0) {
                callback(null);
            }
        });
    });
}
app.delete('/posts/:id', isAuthenticated, function (req, res, next) {
    getPostOwner(req.params.id)
        .then(data => {
        if (!data) {
            const error = craftError(errorCodes.notFound, "Post not found!");
            return res.status(404).json({ error, content: undefined });
        }
        const userId = data.userId;
        if (userId === req.session.user.id) {
            knexInstance
                .from('Posts')
                .where('id', req.params.id)
                .del()
                .then(x => {
                // create absolute paths from file names
                const paths = data.picturesURLs.map((file) => path_1.default.join(craftPictureDest(userId), file));
                deleteFiles(paths, function (err) {
                    if (err) {
                        console.error(err.message);
                    }
                    return res.status(200).json({ error: undefined, content: undefined });
                });
            })
                .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try deleting again!");
                return res.status(500).json({ error, content: undefined });
            });
        }
        else {
            const error = craftError(errorCodes.unAuthorized, "You are not authorized!");
            return res.status(403).json({ error, content: undefined });
        }
    })
        .catch(err => {
        console.error(err.message);
        const error = craftError(errorCodes.other, "Please try deleting again!");
        return res.status(500).json({ error, content: undefined });
    });
});
// metadata for single post
app.get('/posts/:id', isAuthenticated, function (req, res, next) {
    knexInstance
        .select('*')
        .from('Posts')
        .where('id', req.params.id)
        .then(arr => {
        if (arr.length === 0) {
            const error = craftError(errorCodes.notFound, "Post not found!");
            return res.status(404).json({ error, content: undefined });
        }
        return res.status(200).json({ error: undefined, content: getPostMetaData(arr[0]) });
    })
        .catch(err => {
        console.error(err.message);
        const error = craftError(errorCodes.other, "Please try again!");
        return res.status(500).json({ error, content: undefined });
    });
});
// metadata for all posts made by user
app.get('/posts', function (req, res, next) {
    const userId = req.query['userid'];
    knexInstance
        .select('*')
        .from('Posts')
        .where('userId', userId)
        .then(arr => {
        if (arr.length === 0) {
            const error = craftError(errorCodes.notFound, "No post found for this user!");
            return res.status(404).json({ error, content: undefined });
        }
        const metaArr = arr.map(p => getPostMetaData(p));
        return res.status(200).json({ error: undefined, content: metaArr });
    })
        .catch(err => {
        console.error(err.message);
        const error = craftError(errorCodes.other, "Please try again!");
        return res.status(500).json({ error, content: undefined });
    });
});
function moveFiles(dir, files, callback) {
    var i = files.length;
    files.forEach(function (filepath) {
        fs_1.default.copyFile(filepath, path_1.default.join(dir, path_1.default.basename(filepath)), function (err) {
            i--;
            if (err) {
                callback(err);
                return;
            }
            else if (i <= 0) {
                callback(null);
            }
        });
    });
}
function zipDirectory(sourceDir, outPath) {
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    const stream = fs_1.default.createWriteStream(outPath, { flags: 'w' });
    return new Promise((resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', (err) => reject(err))
            .pipe(stream);
        stream.on('close', () => resolve(undefined));
        archive.finalize();
    });
}
// sends zip with media present in given post
app.get('/posts/:id/media', function (req, res, next) {
    knexInstance
        .select('userId', 'picturesURLs')
        .from('Posts')
        .where('id', req.params.id)
        .then(arr => {
        if (arr.length === 0) {
            const error = craftError(errorCodes.notFound, "Post not found!");
            return res.status(404).json({ error, content: undefined });
        }
        const paths = arr[0].picturesURLs.map((file) => path_1.default.join(craftPictureDest(arr[0].userId), file));
        let dir = path_1.default.join('resources/', (0, uuid_1.v4)());
        fs_1.default.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            }
            // move files to temporary directory to be zipped
            moveFiles(dir, paths, function (err) {
                if (err) {
                    const error = craftError(errorCodes.other, "Please try again!");
                    return res.status(500).json({ error, content: undefined });
                }
                let zipDir = path_1.default.join('resources/zip', (0, uuid_1.v4)());
                fs_1.default.mkdir(zipDir, { recursive: true }, (err) => {
                    if (err) {
                        console.error(err.message);
                        const error = craftError(errorCodes.other, "Please try again!");
                        return res.status(500).json({ error, content: undefined });
                    }
                    let zipPath = path_1.default.join(zipDir, (0, uuid_1.v4)());
                    zipDirectory(dir, zipPath)
                        .then(() => {
                        res.set('content-type', 'application/zip');
                        return res.status(200).sendFile(path_1.default.join(__dirname, zipPath), function (err) {
                            // cleanup temporary directories
                            fs_1.default.rm(dir, { recursive: true }, function (err) {
                                if (err)
                                    console.log(err.message);
                                fs_1.default.rm(zipDir, { recursive: true }, function (err) {
                                    if (err)
                                        console.log(err.message);
                                });
                            });
                        });
                    })
                        .catch(err => {
                        console.error(err.message);
                        const error = craftError(errorCodes.other, "Please try again!");
                        return res.status(500).json({ error, content: undefined });
                    });
                });
            });
        });
    })
        .catch(err => {
        console.error(err.message);
        const error = craftError(errorCodes.other, "Please try again!");
        return res.status(500).json({ error, content: undefined });
    });
});
app.patch('/posts/:id', isAuthenticated, function (req, res, next) {
    const post = {
        description: req.body.description,
    };
    const query = knexInstance('Posts')
        .where('id', req.params.id)
        .andWhere('userId', req.session.user.id);
    if (post.description) {
        query.update({ description: post.description }, "*");
    }
    query
        .then(arr => {
        if (arr.length === 0) {
            const error = craftError(errorCodes.notFound, "Post not found or not authorized!");
            return res.status(404).json({ error, content: undefined });
        }
        const metadataPost = getPostMetaData(arr[0]);
        return res.status(200).json({ error: undefined, content: metadataPost });
    })
        .catch(err => {
        console.error(err.message);
        const error = craftError(errorCodes.other, "Please try again!");
        return res.status(500).json({ error, content: undefined });
    });
});
const httpsServer = https_1.default.createServer(options, app);
httpsServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
