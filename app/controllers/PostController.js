"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostController = void 0;
const error_1 = require("../utils/error");
const globals_1 = require("../utils/globals");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function getPostMetaData(post) {
    let postMetaData = {
        id: post.id,
        createdAt: post.createdAt,
        userId: post.userId,
        description: post.description,
    };
    return postMetaData;
}
class PostController {
    getPostOwner(id) {
        return globals_1.knexInstance
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
    create(req, res, next) {
        if (!req.files) {
            const error = (0, error_1.craftError)(error_1.errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        }
        if (req.files.length === 0) {
            const error = (0, error_1.craftError)(error_1.errorCodes.failedToUpload, "At least one file required!");
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
        (0, globals_1.knexInstance)('Posts')
            .insert(post)
            .then(x => {
            // we don't want to send file paths to client
            let postMetaData = getPostMetaData(post);
            return res.status(200).json({ error: undefined, content: postMetaData });
        })
            .catch(err => {
            console.error(err.message);
            const error = (0, error_1.craftError)(error_1.errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        });
    }
    delete(req, res, next) {
        this.getPostOwner(req.params.id)
            .then(data => {
            if (!data) {
                const error = (0, error_1.craftError)(error_1.errorCodes.notFound, "Post not found!");
                return res.status(404).json({ error, content: undefined });
            }
            const userId = data.userId;
            if (userId === req.session.user.id) {
                globals_1.knexInstance
                    .from('Posts')
                    .where('id', req.params.id)
                    .del()
                    .then(x => {
                    // create absolute paths from file names
                    const paths = data.picturesURLs.map((file) => path_1.default.join((0, globals_1.craftPictureDest)(userId), file));
                    (0, globals_1.deleteFiles)(paths, function (err) {
                        if (err) {
                            console.error(err.message);
                        }
                        return res.status(200).json({ error: undefined, content: undefined });
                    });
                })
                    .catch(err => {
                    console.error(err.message);
                    const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try deleting again!");
                    return res.status(500).json({ error, content: undefined });
                });
            }
            else {
                const error = (0, error_1.craftError)(error_1.errorCodes.unAuthorized, "You are not authorized!");
                return res.status(403).json({ error, content: undefined });
            }
        })
            .catch(err => {
            console.error(err.message);
            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try deleting again!");
            return res.status(500).json({ error, content: undefined });
        });
    }
    // metadata for single post
    getSinglePost(req, res, next) {
        globals_1.knexInstance
            .select('*')
            .from('Posts')
            .where('id', req.params.id)
            .then(arr => {
            if (arr.length === 0) {
                const error = (0, error_1.craftError)(error_1.errorCodes.notFound, "Post not found!");
                return res.status(404).json({ error, content: undefined });
            }
            return res.status(200).json({ error: undefined, content: getPostMetaData(arr[0]) });
        })
            .catch(err => {
            console.error(err.message);
            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try again!");
            return res.status(500).json({ error, content: undefined });
        });
    }
    // metadata for all posts made by user
    getPostsByUser(req, res, next) {
        const userId = req.query['userid'];
        globals_1.knexInstance
            .select('*')
            .from('Posts')
            .where('userId', userId)
            .then(arr => {
            if (arr.length === 0) {
                const error = (0, error_1.craftError)(error_1.errorCodes.notFound, "No post found for this user!");
                return res.status(404).json({ error, content: undefined });
            }
            const metaArr = arr.map(p => getPostMetaData(p));
            return res.status(200).json({ error: undefined, content: metaArr });
        })
            .catch(err => {
            console.error(err.message);
            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try again!");
            return res.status(500).json({ error, content: undefined });
        });
    }
    // sends zip with media present in given post
    getPostMedia(req, res, next) {
        globals_1.knexInstance
            .select('userId', 'picturesURLs')
            .from('Posts')
            .where('id', req.params.id)
            .then(arr => {
            if (arr.length === 0) {
                const error = (0, error_1.craftError)(error_1.errorCodes.notFound, "Post not found!");
                return res.status(404).json({ error, content: undefined });
            }
            const paths = arr[0].picturesURLs.map((file) => path_1.default.join((0, globals_1.craftPictureDest)(arr[0].userId), file));
            let dir = path_1.default.join('resources/', (0, uuid_1.v4)());
            fs_1.default.mkdir(dir, { recursive: true }, (err) => {
                if (err) {
                    console.error(err.message);
                    const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try again!");
                    return res.status(500).json({ error, content: undefined });
                }
                // move files to temporary directory to be zipped
                (0, globals_1.moveFiles)(dir, paths, function (err) {
                    if (err) {
                        const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try again!");
                        return res.status(500).json({ error, content: undefined });
                    }
                    let zipDir = path_1.default.join('resources/zip', (0, uuid_1.v4)());
                    fs_1.default.mkdir(zipDir, { recursive: true }, (err) => {
                        if (err) {
                            console.error(err.message);
                            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try again!");
                            return res.status(500).json({ error, content: undefined });
                        }
                        let zipPath = path_1.default.join(zipDir, (0, uuid_1.v4)());
                        (0, globals_1.zipDirectory)(dir, zipPath)
                            .then(() => {
                            res.set('content-type', 'application/zip');
                            return res.status(200).sendFile(path_1.default.join(__dirname, "../", "../", zipPath), function (err) {
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
                            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try again!");
                            return res.status(500).json({ error, content: undefined });
                        });
                    });
                });
            });
        })
            .catch(err => {
            console.error(err.message);
            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try again!");
            return res.status(500).json({ error, content: undefined });
        });
    }
    patch(req, res, next) {
        const post = {
            description: req.body.description,
        };
        const query = (0, globals_1.knexInstance)('Posts')
            .where('id', req.params.id)
            .andWhere('userId', req.session.user.id);
        if (post.description) {
            query.update({ description: post.description }, "*");
        }
        query
            .then(arr => {
            if (arr.length === 0) {
                const error = (0, error_1.craftError)(error_1.errorCodes.notFound, "Post not found or not authorized!");
                return res.status(404).json({ error, content: undefined });
            }
            const metadataPost = getPostMetaData(arr[0]);
            return res.status(200).json({ error: undefined, content: metadataPost });
        })
            .catch(err => {
            console.error(err.message);
            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try again!");
            return res.status(500).json({ error, content: undefined });
        });
    }
}
exports.PostController = PostController;
