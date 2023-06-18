import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { craftError, errorCodes } from '../utils/error';
import { File, Post, craftPictureDest, deleteFiles, knexInstance, moveFiles, zipDirectory } from '../utils/globals';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';


export function getPostsByUser(userId: string) : Promise<Post[]> {
    return knexInstance
        .select('*')
        .from('Posts')
        .where('userId', userId);
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

function craftPictureURLs(picturesURLs: string[], userId: string): string[] {
    return picturesURLs.map((url) => path.join('users/', userId, 'pictures/', url));
}

export class PostController {

    create(req: Request, res: Response, next: NextFunction) {
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
                post.picturesURLs = craftPictureURLs(post.picturesURLs!, post.userId);
                return res.status(200).json({ error: undefined, content: post });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
                return res.status(500).json({ error, content: undefined });
            });

    }

    delete(req: Request, res: Response, next: NextFunction) {
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

    }

    // metadata for single post
    getSinglePost(req: Request, res: Response, next: NextFunction) {
        knexInstance
            .select('*')
            .from('Posts')
            .where('id', req.params.id)
            .then((arr: Post[]) => {
                if (arr.length === 0) {
                    const error = craftError(errorCodes.notFound, "Post not found!");
                    return res.status(404).json({ error, content: undefined });
                }

                const post = arr[0];
                post.picturesURLs = craftPictureURLs(post.picturesURLs, post.userId);
                return res.status(200).json({ error: undefined, content: arr[0] });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            });

    }

    // metadata for all posts made by user
    getPostsByUser(req: Request, res: Response, next: NextFunction) {
        const userId = req.query['userid'] as string; 
        getPostsByUser(userId!)
            .then(arr => {
                if (arr.length === 0) {
                    const error = craftError(errorCodes.notFound, "No post found for this user!");
                    return res.status(404).json({ error, content: undefined });
                }

                return res.status(200).json({ error: undefined, content: arr });

            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            });
    }

    // sends urls to post media
    getPostMedia(req: Request, res: Response, next: NextFunction) {
        knexInstance
            .select('userId', 'picturesURLs')
            .from('Posts')
            .where('id', req.params.id)
            .then(arr => {
                if (arr.length === 0) {
                    const error = craftError(errorCodes.notFound, "Post not found!");
                    return res.status(404).json({ error, content: undefined });
                }

                // resources/users/{userID}/pictures/{pictureID}.extension
                let newPath: string = path.join('users', arr[0].userId, 'pictures');
                const paths: string[] = arr[0].picturesURLs!.map((file: string) => path.join(newPath, file));
                let partialPost: Partial<Post> = {
                    picturesURLs: paths,
                };

                return res.status(200).json({ error: undefined, content: partialPost });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            });
    }

    patch(req: Request, res: Response, next: NextFunction) {

        getPostOwner(req.params.id)
            .then((data: Partial<Post> | undefined) => {
                if (!data) {
                    const error = craftError(errorCodes.notFound, "Post not found!");
                    return res.status(404).json({ error, content: undefined });
                }

                if (data.userId !== req.session.user!.id) {
                    const error = craftError(errorCodes.unAuthorized, "You are not authorized!");
                    return res.status(403).json({ error, content: undefined });
                }
                const post: Partial<Post> = {
                    description: req.body.description,
                }

                const query = knexInstance('Posts')
                    .where('id', req.params.id)
                    .andWhere('userId', req.session.user!.id);

                if (post.description) {
                    query.update({ description: post.description }, "*");
                }

                query
                    .then(arr => {
                        if (arr.length === 0) {
                            const error = craftError(errorCodes.notFound, "Post not found!");
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
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            });
    }
}