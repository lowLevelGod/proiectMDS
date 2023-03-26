import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import multer, { Multer } from 'multer';

import RedisStore from "connect-redis";
import session from "express-session";
import { createClient } from "redis";

import { knex, Knex } from 'knex';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';

const app: Express = express();
const port: number = 8080;

const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(
            null,
            'resources/pictures/'
        );
    },

    filename: (req: Request, file, cb) => {
        cb(
            null,
            uuidv4() + "." + path.extname(file.originalname)
        );
    }
});
const uploadPicture : Multer = multer({ dest: 'resources/pictures/' , storage: multerStorage});

const errorCodes = Object.freeze({
    other: 1,
    emailTaken: 2,
    notLoggedIn: 3,
});

interface Error {
    errorCode: number,
    errorMsg: string,
}

function craftError(errorCode: number, errorMsg: string): Error {
    return {
        errorCode,
        errorMsg,
    };
}

// database connection
const knexConfig: Knex.Config = {
    client: 'postgres',
    connection: {
        host: '127.0.0.1',
        port: 5432,
        user: 'brontosaur',
        password: '1234',
        database: 'dbMDS'
    },
};

const knexInstance: Knex = knex(knexConfig);

// user information to be used on client
declare module 'express-session' {
    export interface SessionData {
        user: {
            id: string,
            username: string,
            email: string,
        };
    }
}

// https certificate
const options = {
    key: fs.readFileSync(`certificate/client-key.pem`),
    cert: fs.readFileSync(`certificate/client-cert.pem`)
};

// redis connection for session storage
let redisClient = createClient();
redisClient.connect().catch(console.error);

let redisStore = new RedisStore({
    client: redisClient,
    prefix: "proiectmds:",
});

// cookie options
app.use(
    session({
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
    })
);

app.use(
    cors({
        origin: "https://localhost:4200",
        methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
        credentials: true,
    })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send("Hello world!");
});

// for database storage
function hashPassword(password: string): Promise<string> {
    const saltRounds: number = 10;
    return bcrypt
        .hash(password, saltRounds);
}

// database User
interface User {
    id: string,
    email: string,
    passwordHash: string,
}

// cannot have 2 users with same email
function isEmailUnique(email: string): Promise<boolean> {
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
app.post('/signup', (req: Request, res: Response, next: NextFunction) => {

    hashPassword(req.body.password)
        .then(passwordHash => {
            let id = uuidv4();
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
                                        return res.status(500).json({error, content: undefined});
                                    }

                                    // store user information in session, typically a user id
                                    req.session.user = sessionUser;

                                    // save the session before redirection to ensure page
                                    // load does not happen before session is saved
                                    req.session.save(function (err) {
                                        if (err) {
                                            const error = craftError(errorCodes.other, "Please try signing up again!");
                                            return res.status(500).json({error, content: undefined});
                                        }
                                        return res.status(200).json({error: undefined, content: sessionUser});
                                    })
                                })
                            })
                            .catch(err => {
                                console.log(err.message);
                                const error = craftError(errorCodes.other, "Please try signing up again!");
                                return res.status(500).json({error, content: undefined});
                            });
                    } else {
                        const error = craftError(errorCodes.emailTaken, "Email is already taken!");
                        return res.status(409).json({error, content: undefined});
                    }
                });

        })
        .catch(err => {
            console.log(err.message);
            const error = craftError(errorCodes.other, "Please try signing up again!");
            return res.status(500).json({error, content: undefined});
        });

});


function validateUser(password: string, storedHash: string): Promise<boolean> {
    return bcrypt
        .compare(password, storedHash)
        .then(res => res)
        .catch(err => {
            console.error(err.message)
            return false;
        });
}

function getUserPassword(email: string): Promise<string> {
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
            console.error(err.message)
            return undefined;
        });

}

// returns JSON {error, content} and sets http status code
app.post('/login', (req: Request, res: Response, next: NextFunction) => {

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
                        }
                    })
                    .then(sessionUser => {
                        req.session.regenerate(function (err) {
                            if (err) {
                                const error = craftError(errorCodes.other, "Please try logging in again!");
                                return res.status(500).json({error, content: undefined});
                            }

                            // store user information in session, typically a user id
                            req.session.user = sessionUser;

                            return res.status(200).json({error: undefined, content: sessionUser});
                        })
                    })
                    .catch(err => {
                        console.error(err.message);
                        const error = craftError(errorCodes.other, "Please try logging in again!");
                        return res.status(500).json({error, content: undefined});
                    });

            } else {
                const error = craftError(errorCodes.other, "Email or password wrong!");
                return res.status(403).json({error, content: undefined});
            }
        })
        .catch(err => {
            console.error(err.message);
            const error = craftError(errorCodes.other, "Email or password wrong!");
            return res.status(403).json({error, content: undefined});
        });

});

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) next()
    else {
        const error = craftError(errorCodes.notLoggedIn, "Please log in first!");
        return res.status(403).json({error, content: undefined});
    }
}

// returns JSON {error, content} and sets http status code
app.get('/whoami', isAuthenticated, (req: Request, res: Response) => {
    return res.status(200).json({error: undefined, content: req.session.user});
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
            return res.status(500).json({error, content: undefined});
        }
        return res.clearCookie('dinoSnack').status(200).json({error: undefined, content: undefined});
    })
});

interface Post {
    id: string,
    createdAt: Date,
    userId: string,
    description?: string,
    picturesURLs: string[],
}

app.post('/posts', isAuthenticated, uploadPicture.array('pictures', 10), function (req: Request, res: Response, next: NextFunction) {
    console.log(req.files);
    let id = uuidv4();
    let picturesURLs = ['test.jpeg'];
    let createdAt = new Date();
    let userId = req.session.user!.id;
    let description = req.body.description;

    let post = {
        id,
        createdAt,
        userId,
        description,
        picturesURLs,
    }
    knexInstance('Posts')
        .insert(post)
        .then(x => res.send(post))
        .catch(err => {
            console.error(err.message);
            res.send(undefined);
        });

});

function getPostOwner(id: string): Promise<string> {
    return knexInstance
        .select('userId')
        .from('Posts')
        .where('id', id)
        .then(x => {
            if (x.length === 0)
                return undefined;
            return x[0].userId;
        })
        .catch(err => {
            console.error(err.message);
            return undefined;
        });
}

app.delete('/posts/:id', isAuthenticated, function (req: Request, res: Response, next: NextFunction) {
    console.log('hello');
    getPostOwner(req.params.id)
        .then(userId => {
            if (userId === req.session.user!.id) {
                knexInstance
                    .from('Posts')
                    .where('id', req.params.id)
                    .del()
                    .then(x => {
                        if (x)
                            return res.sendStatus(200);
                        return res.sendStatus(404);
                    })
                    .catch(err => {
                        console.error(err.message);
                        return res.sendStatus(404);
                    });
            } else {
                return res.sendStatus(404);
            }
        })
        .catch(err => {
            console.error(err.message);
            return res.sendStatus(404);
        });

});

const httpsServer = https.createServer(options, app);
httpsServer.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});