import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import multer, { Multer, MulterError } from 'multer';

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
import archiver from 'archiver';

const app: Express = express();
const port: number = 8080;

function craftPictureDest(userId: string): string {
    return path.join('resources/users/', userId, 'pictures/');
}

const multerStorage = multer.diskStorage({
    destination: (req: Request, file, cb) => {
        // resources/users/{userID}/pictures/{pictureID}.extension
        let dir = craftPictureDest(req.session.user!.id);
        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                throw err;
            }
            cb(
                null,
                dir
            );
        });
    },

    filename: (req: Request, file, cb) => {
        cb(
            null,
            uuidv4() + path.extname(file.originalname)
        );
    }
});

interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
}

// middleware for uploading files
const uploadFiles: Multer = multer({ storage: multerStorage });

// send this to identify error
const errorCodes = Object.freeze({
    other: 1,
    emailTaken: 2,
    notLoggedIn: 3,
    failedToUpload: 4,
    unAuthorized: 5,
    notFound: 6,
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

// SQL query builder
// use it to query POSTGRES database
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
                                    })
                                })
                            })
                            .catch(err => {
                                console.log(err.message);
                                const error = craftError(errorCodes.other, "Please try signing up again!");
                                return res.status(500).json({ error, content: undefined });
                            });
                    } else {
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
                                return res.status(500).json({ error, content: undefined });
                            }

                            // store user information in session, typically a user id
                            req.session.user = sessionUser;

                            return res.status(200).json({ error: undefined, content: sessionUser });
                        })
                    })
                    .catch(err => {
                        console.error(err.message);
                        const error = craftError(errorCodes.other, "Please try logging in again!");
                        return res.status(500).json({ error, content: undefined });
                    });

            } else {
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

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) next()
    else {
        const error = craftError(errorCodes.notLoggedIn, "Please log in first!");
        return res.status(403).json({ error, content: undefined });
    }
}

// returns JSON {error, content} and sets http status code
app.get('/whoami', isAuthenticated, (req: Request, res: Response) => {
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
    })
});

interface Post {
    id: string,
    createdAt: Date,
    userId: string,
    description?: string,
    picturesURLs: string[],
}

function uploadMedia(req: Request, res: Response, next: NextFunction) {
    const upload = uploadFiles.array('media', 10);

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.message === 'Unexpected field') {
                const error = craftError(errorCodes.failedToUpload, "Too many files!");
                return res.status(400).json({ error, content: undefined });
            }
            // A Multer error occurred when uploading.
            const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        } else if (err) {
            // An unknown error occurred when uploading.
            const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        }
        // Everything went fine. 
        return next();
    })
}

function getPostMetaData(post: Post): Partial<Post> {
    let postMetaData: Partial<Post> = {
        id: post.id,
        createdAt: post.createdAt,
        userId: post.userId,
        description: post.description,
    };

    return postMetaData;
}

app.post('/posts', isAuthenticated, uploadMedia, function (req: Request, res: Response, next: NextFunction) {
    if (!req.files) {
        const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
        return res.status(500).json({ error, content: undefined });
    }

    if (req.files.length === 0) {
        const error = craftError(errorCodes.failedToUpload, "At least one file required!");
        return res.status(400).json({ error, content: undefined });
    }

    let id = uuidv4();

    const files: File[] = req.files as File[];
    let picturesURLs: string[] = files?.map((file: File) => file.filename);

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
        .then(x => {

            // we don't want to send file paths to client
            let postMetaData: Partial<Post> = getPostMetaData(post);
            return res.status(200).json({ error: undefined, content: postMetaData });
        })
        .catch(err => {
            console.error(err.message);
            const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        });

});

function getPostOwner(id: string): Promise<Partial<Post> | undefined> {
    return knexInstance
        .select('userId', 'picturesURLs')
        .from('Posts')
        .where('id', id)
        .then(x => {
            if (x.length === 0)
                return undefined;
            const res: Partial<Post> = {
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

function deleteFiles(files: string[], callback: Function) {
    var i = files.length;
    files.forEach(function (filepath) {
        fs.unlink(filepath, function (err) {
            i--;
            if (err) {
                callback(err);
                return;
            } else if (i <= 0) {
                callback(null);
            }
        });
    });
}

app.delete('/posts/:id', isAuthenticated, function (req: Request, res: Response, next: NextFunction) {
    getPostOwner(req.params.id)
        .then(data => {
            if (!data) {
                const error = craftError(errorCodes.notFound, "Post not found!");
                return res.status(404).json({ error, content: undefined });
            }

            const userId = data.userId;
            if (userId === req.session.user!.id) {
                knexInstance
                    .from('Posts')
                    .where('id', req.params.id)
                    .del()
                    .then(x => {
                        // create absolute paths from file names
                        const paths = data.picturesURLs!.map((file) => path.join(craftPictureDest(userId), file));
                        deleteFiles(paths, function (err: any) {
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
            } else {
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
app.get('/posts/:id', isAuthenticated, function (req: Request, res: Response, next: NextFunction) {
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
app.get('/posts', function (req: Request, res: Response, next: NextFunction) {
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

            const metaArr: Partial<Post>[] = arr.map(p => getPostMetaData(p));
            return res.status(200).json({ error: undefined, content: metaArr });

        })
        .catch(err => {
            console.error(err.message);
            const error = craftError(errorCodes.other, "Please try again!");
            return res.status(500).json({ error, content: undefined });
        });
});

function moveFiles(dir: string, files: string[], callback: Function) {
    var i = files.length;
    files.forEach(function (filepath) {
        fs.copyFile(filepath, path.join(dir, path.basename(filepath)), function (err) {
            i--;
            if (err) {
                callback(err);
                return;
            } else if (i <= 0) {
                callback(null);
            }
        });
    });
}

function zipDirectory(sourceDir: string, outPath: string): Promise<void | any> {

    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath, { flags: 'w' });

    return new Promise<void | any>((resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', (err: any) => reject(err))
            .pipe(stream)
            ;

        stream.on('close', () => resolve(undefined));
        archive.finalize();
    });
}

// sends zip with media present in given post
app.get('/posts/:id/media', function (req: Request, res: Response, next: NextFunction) {
    knexInstance
        .select('userId', 'picturesURLs')
        .from('Posts')
        .where('id', req.params.id)
        .then(arr => {
            if (arr.length === 0) {
                const error = craftError(errorCodes.notFound, "Post not found!");
                return res.status(404).json({ error, content: undefined });
            }

            const paths: string[] = arr[0].picturesURLs!.map((file: string) => path.join(craftPictureDest(arr[0].userId), file));

            let dir = path.join('resources/', uuidv4());
            fs.mkdir(dir, { recursive: true }, (err) => {
                if (err) {
                    console.error(err.message);
                    const error = craftError(errorCodes.other, "Please try again!");
                    return res.status(500).json({ error, content: undefined });
                }

                // move files to temporary directory to be zipped
                moveFiles(dir, paths, function (err: any) {
                    if (err) {
                        const error = craftError(errorCodes.other, "Please try again!");
                        return res.status(500).json({ error, content: undefined });
                    }

                    let zipDir = path.join('resources/zip', uuidv4());
                    fs.mkdir(zipDir, { recursive: true }, (err) => {
                        if (err) {
                            console.error(err.message);
                            const error = craftError(errorCodes.other, "Please try again!");
                            return res.status(500).json({ error, content: undefined });
                        }

                        let zipPath = path.join(zipDir, uuidv4());
                        zipDirectory(dir, zipPath)
                            .then(() => {

                                res.set('content-type', 'application/zip');
                                return res.status(200).sendFile(path.join(__dirname, zipPath), function (err) {

                                    // cleanup temporary directories
                                    fs.rm(dir, { recursive: true }, function (err) {
                                        if (err) console.log(err.message);
                                        fs.rm(zipDir, { recursive: true }, function (err) {
                                            if (err) console.log(err.message);
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

app.patch('/posts/:id', isAuthenticated, function (req: Request, res: Response, next: NextFunction) {
    const post: Partial<Post> = {
        description: req.body.description,
    }

    const query = knexInstance('Posts')
    .where('id', req.params.id)
    .andWhere('userId', req.session.user!.id);

    if (post.description){
        query.update({description: post.description}, "*");
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

const httpsServer = https.createServer(options, app);
httpsServer.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});