import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { PostLike, knexInstance } from '../utils/globals';
import { craftError, errorCodes } from '../utils/error';

function postLikeExists(postLike: PostLike): Promise<PostLike> {
    return knexInstance('PostLikes')
        .select('*')
        .where('userId', postLike.userId)
        .andWhere('postId', postLike.postId)
        .first();
}

export class PostLikesController {

    create(req: Request, res: Response, next: NextFunction) {

        let postLike: PostLike = {
            userId: req.session.user!.id,
            postId: req.body.postId,
        };

        postLikeExists(postLike)
            .then((x: PostLike) => {
                if (x) {

                    throw {
                        error: craftError(errorCodes.entityExists, "You already liked this post!"),
                        content: undefined,
                    }

                    return;
                }
            })
            .then(() => {

                knexInstance('PostLikes')
                    .insert(postLike)
                    .then(x => res.status(200).json({ error: undefined, content: postLike }));

            })
            .catch(err => {
                if (!err.error) {
                    console.error(err.message);
                    const error = craftError(errorCodes.other, "Please try again!");
                    return res.status(500).json({ error, content: undefined });
                } else {
                    console.error(err.error.errorMsg);
                    return res.status(400).json(err);
                }
            });

    }

    getPostLikes(req: Request, res: Response, next: NextFunction) {
        const postId = req.params.id;
        
        if (!postId) {
            const error = craftError(errorCodes.notFound, "Post not found!");
            return res.status(404).json({ error, content: undefined });
        }

        knexInstance
            .select('*')
            .from('PostLikes')
            .where('postId', postId)
            .then(rows => {
                return res.status(200).json({ error: undefined, content: rows });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            })
    }

    deleteLike(req: Request, res: Response, next: NextFunction) {

        let postLike: PostLike = {
            userId: req.session.user!.id,
            postId: req.params.id,
        };

        knexInstance
            .from('PostLikes')
            .where(postLike)
            .del()
            .then(rowsDeleted => {
                if (rowsDeleted === 0) {
                    const error = craftError(errorCodes.notFound, "No like found for this post and user!");
                    return res.status(404).json({ error, content: undefined });
                }
                return res.status(200).json({ error: undefined, content: undefined });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            })
    }

    getPostLikesCount(req: Request, res: Response, next: NextFunction) {
        const postId = req.params.id;

        // Check if post exists
        knexInstance('Posts')
            .select('id')
            .where('id', postId)
            .then(rows => {
                if (rows.length === 0) {
                    throw {
                        error: craftError(errorCodes.notFound, "Post not found!"),
                        content: undefined,
                    }
                }
            })
            .then(() => {
                knexInstance
                    .count()
                    .from('PostLikes')
                    .where('postId', postId)
                    .then(count => {
                        return res.status(200).json({ error: undefined, content: count });
                    });
            })
            .catch(err => {
                if (!err.error) {
                    console.error(err.message);
                    const error = craftError(errorCodes.other, "Please try again!");
                    return res.status(500).json({ error, content: undefined });
                } else {
                    console.error(err.error.errorMsg);
                    return res.status(404).json(err);
                }
            });
    }
}