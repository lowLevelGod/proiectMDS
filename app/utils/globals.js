"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postController = exports.authenticationController = exports.uploadMedia = exports.zipDirectory = exports.moveFiles = exports.craftPictureDest = exports.deleteFiles = exports.uploadFiles = exports.knexInstance = void 0;
const knex_1 = require("knex");
const AuthenticationController_1 = require("../controllers/AuthenticationController");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const PostController_1 = require("../controllers/PostController");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const error_1 = require("./error");
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
exports.knexInstance = (0, knex_1.knex)(knexConfig);
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
exports.uploadFiles = (0, multer_1.default)({ storage: multerStorage });
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
exports.deleteFiles = deleteFiles;
function craftPictureDest(userId) {
    return path_1.default.join('resources/users/', userId, 'pictures/');
}
exports.craftPictureDest = craftPictureDest;
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
exports.moveFiles = moveFiles;
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
exports.zipDirectory = zipDirectory;
function uploadMedia(req, res, next) {
    const upload = exports.uploadFiles.array('media', 10);
    upload(req, res, function (err) {
        if (err instanceof multer_1.default.MulterError) {
            if (err.message === 'Unexpected field') {
                const error = (0, error_1.craftError)(error_1.errorCodes.failedToUpload, "Too many files!");
                return res.status(400).json({ error, content: undefined });
            }
            // A Multer error occurred when uploading.
            const error = (0, error_1.craftError)(error_1.errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        }
        else if (err) {
            // An unknown error occurred when uploading.
            const error = (0, error_1.craftError)(error_1.errorCodes.failedToUpload, "Please try uploading again!");
            return res.status(500).json({ error, content: undefined });
        }
        // Everything went fine. 
        return next();
    });
}
exports.uploadMedia = uploadMedia;
exports.authenticationController = new AuthenticationController_1.AuthenticationController();
exports.postController = new PostController_1.PostController();
