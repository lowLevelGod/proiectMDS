import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { PostLike, knexInstance } from '../utils/globals';
import { craftError, errorCodes } from '../utils/error';

export class PostLikesController {

    create(req: Request, res: Response, next: NextFunction) {
        
        let postLike: PostLike = {
            userId: req.session.user!.id,
            postId: req.body.postId,
        };

        knexInstance('PostLikes')
            .insert(postLike)
            .then(x => res.status(200).json({ error: undefined, content: postLike }))
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined});
            })
    }

    getPostLikes(req: Request, res: Response, next: NextFunction) {
        const postId = req.params.postId;

        if (!postId || typeof postId != 'string') {
            const error = craftError(errorCodes.notFound, "Post not found!");
            return res.status(404).json({ error, content: undefined });
        }

        knexInstance
            .select('*')
            .from('PostLikes')
            .where('postId', postId)
            .then(rows => {
                const likes: PostLike[] = rows.map(row => ({
                    userId: row.userId,
                    postId: row.postId
                }));
                return res.status(200).json({ error: undefined, content: likes });
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
            postId: req.params.postId
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
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined});
            })
    }

    getPostLikesCount(req: Request, res: Response, next: NextFunction) {
        const postId = req.params.postId;

        // Check if post exists
        knexInstance('Posts')
            .select('id')
            .where('id', postId)
            .then(rows => {
                if (rows.length === 0) {
                    const error = craftError(errorCodes.notFound, "Post not found!");
                    return res.status(404).json({ error, content: undefined });
                }
            })
            .then(() => {
                knexInstance
                    .count()
                    .from('PostLikes')
                    .where('postId', postId)
                    .then(count => {
                        return res.status(200).json({ error: undefined, content: count });
                    })
                    .catch(err => {
                        console.error(err.message);
                        const error = craftError(errorCodes.other, "Please try again");
                        return res.status(500).json({ error, content: undefined });
                    })
            })
            .catch(err =>{
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            });
    }
}