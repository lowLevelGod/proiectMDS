import {knex, Knex} from 'knex';
import { AuthenticationController } from '../controllers/AuthenticationController';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { PostController } from '../controllers/PostController';
import multer, { Multer, MulterError } from 'multer';
import session from "express-session";
import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { craftError, errorCodes } from './error';
import { CommentsController } from '../controllers/CommentsController';
import { FollowersController } from '../controllers/FollowersController';
import { PostLikesController } from '../controllers/PostLikesController'; 
import { CommentLikesController } from '../controllers/CommentLikesController'; 

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
export const knexInstance: Knex = knex(knexConfig);


// database User
export interface User {
    id: string,
    email: string,
    passwordHash: string,
}

export interface Profile {
    id: string,
    userId: string,
    username: string,
    name: string,
    profilePictureURL: string,
    bio?: string,
}

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

export interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
}

export interface Post {
    id: string,
    createdAt: Date,
    userId: string,
    description?: string,
    picturesURLs: string[],
}

export interface PostLike {
    userId: string,
    postId: string,
}

export interface Comment{
    id: string,
    createdAt: Date, 
    userId: string,
    postId: string,
    content: string,
    parentId?: string,
}

export interface CommentLike { 
    userId: string,
    commentId: string,
}

export interface Follower{
    follows: string,
    followedBy: string,
    accepted: boolean,
}

export const uploadFiles: (fileType: string) => multer.Multer = (fileType: string) => {
    const multerStorage = multer.diskStorage({
        destination: (req: Request, file, cb) => {
            let dir: string;
            if (fileType === 'post') {
                // resources/users/{userID}/pictures/{pictureID}.extension
                dir = craftPictureDest(req.session.user!.id);
            } else {
                // resources/users/{userID}/profile/{pictureID}.extension
                dir = craftProfilePictureDest(req.session.user!.id);
            }

            fs.mkdir(dir, { recursive: true }, (err) => {
                if (err) {
                    throw err;
                }
                cb(null, dir);
            });
        },
        filename: (req: Request, file, cb) => {
            cb(null, uuidv4() + path.extname(file.originalname));
        }
    });
    return multer({ storage: multerStorage });
};

export function deleteFiles(files: string[], callback: Function) {
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

export function craftPictureDest(userId: string): string {
    return path.join('resources/users/', userId, 'pictures/');
}

export function craftProfilePictureDest(userId: string): string {
    return path.join("resources/users/", userId, "profile/");
}

export function moveFiles(dir: string, files: string[], callback: Function) {
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

export function zipDirectory(sourceDir: string, outPath: string): Promise<void | any> {

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

export function uploadMedia(req: Request, res: Response, next: NextFunction, fileType: string) {
    const upload = fileType === 'post' ? uploadFiles(fileType).array('media', 10) : uploadFiles(fileType).single('media');

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

export const authenticationController: AuthenticationController = new AuthenticationController();
export const postController: PostController = new PostController();
export const commentController: CommentsController = new CommentsController();
export const followerController: FollowersController = new FollowersController();
export const postLikeController: PostLikesController = new PostLikesController();
export const commentLikeController: CommentLikesController = new CommentLikesController();