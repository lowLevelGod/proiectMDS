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
import { craftError, Error, errorCodes } from './error';
import { CommentsController } from '../controllers/CommentsController';
import { FollowersController } from '../controllers/FollowersController';
import { PostLikesController } from '../controllers/PostLikesController'; 
import { CommentLikesController } from '../controllers/CommentLikesController'; 
import { ProfileController, getProfileByUserId } from '../controllers/ProfileController';
import { FeedController } from '../controllers/FeedController';

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

export interface GenericResponse<TResponse> {
    error: Error;
    content: TResponse;
  }

const multerPosts = multer.diskStorage({
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

// middleware for uploading posts
export const uploadPosts: Multer = multer({ storage: multerPosts });


const multerProfiles = multer.diskStorage({
    destination: (req: Request, file, cb) => {
        // resources/users/{userID}/profile/{pictureID}.extension
        let dir = craftProfilePictureDest(req.session.user!.id);
        console.log(dir);
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

// middleware for uploading profiles
export const uploadProfiles: Multer = multer({ storage: multerProfiles });

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

export function craftProfilePictureURL(userId: string, pictureName: string): string {
    return path.join("users/", userId, "profile/", pictureName);
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

export function uploadMediaPosts(req: Request, res: Response, next: NextFunction) {
    const upload = uploadPosts.array('media', 10);

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

export function uploadMediaProfiles(req: Request, res: Response, next: NextFunction) {
    const upload = uploadProfiles.single('media');

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

// middleware to verify if a profile exists
export function ProfileExists(req: Request, res: Response, next: NextFunction) {
    console.log("sunt in profile exists");
    const userId = req.session.user!.id;
    getProfileByUserId(userId)
      .then((profile) => {
        if (!profile) {
          const error = craftError(errorCodes.notFound, 'Profile not found for this user!');
          return res.status(404).json({ error, content: undefined });
        }
        // pass control to the next middleware
        return next();
      })
      .catch((err) => {
        console.error(err.message);
        const error = craftError(errorCodes.other, 'Please try again!');
        return res.status(500).json({ error, content: undefined });
      });
  }


// middleware to verify if a profile does not exists
export function ProfileDoesNotExist(req: Request, res: Response, next: NextFunction) {
    console.log("sunt in profile does not exists");

    const userId = req.session.user!.id;
    getProfileByUserId(userId)
      .then((profile) => {
        if (profile) {
          const error = craftError(errorCodes.entityExists, 'A profile already exists for this user!');
          return res.status(404).json({ error, content: undefined });
        }
        // pass control to the next middleware
        return next();
      })
      .catch((err) => {
        console.error(err.message);
        const error = craftError(errorCodes.other, 'Please try again!');
        return res.status(500).json({ error, content: undefined });
      });
  }

export const authenticationController: AuthenticationController = new AuthenticationController();
export const postController: PostController = new PostController();
export const commentController: CommentsController = new CommentsController();
export const followerController: FollowersController = new FollowersController();
export const postLikeController: PostLikesController = new PostLikesController();
export const commentLikeController: CommentLikesController = new CommentLikesController();
export const profileController: ProfileController = new ProfileController();
export const feedController: FeedController = new FeedController();