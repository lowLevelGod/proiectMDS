import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { CommentLike, knexInstance } from '../utils/globals';
import { craftError, errorCodes } from '../utils/error';

function commentLikeExists(commentLike: CommentLike): Promise<CommentLike> {
    return knexInstance('CommentLikes')
        .select('*')
        .where('userId', commentLike.userId)
        .andWhere('commentId', commentLike.commentId)
        .first();
}

export class CommentLikesController {

    create(req: Request, res: Response, next: NextFunction) {

        let commentLike: CommentLike = {
            userId: req.session.user!.id,
            commentId: req.body.commentId,
        };

        commentLikeExists(commentLike)
            .then((x: CommentLike) => {
                if (x) {

                    throw {
                        error: craftError(errorCodes.entityExists, "You already liked this comment!"),
                        content: undefined,
                    }

                    return;
                }
            })
            .then(() => {

                knexInstance('CommentLikes')
                    .insert(commentLike)
                    .then(x => res.status(200).json({ error: undefined, content: commentLike }));

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

    getCommentLikes(req: Request, res: Response, next: NextFunction) {
        const commentId = req.params.id;

        if (!commentId) {
            const error = craftError(errorCodes.notFound, "Comment not found!");
            return res.status(404).json({ error, content: undefined });
        }

        knexInstance
            .select('*')
            .from('CommentLikes')
            .where('commentId', commentId)
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

        let commentLike: CommentLike = {
            userId: req.session.user!.id,
            commentId: req.params.id,
        };

        knexInstance
            .from('CommentLikes')
            .where(commentLike)
            .del()
            .then(rowsDeleted => {
                if (rowsDeleted === 0) {
                    const error = craftError(errorCodes.notFound, "No like found for this comment and user!");
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

    getCommentLikesCount(req: Request, res: Response, next: NextFunction) {
        const commentId = req.params.id;

        // Check if comment exists
        knexInstance('Comments')
            .select('id')
            .where('id', commentId)
            .then(rows => {
                if (rows.length === 0) {
                    throw {
                        error: craftError(errorCodes.notFound, "Comment not found!"),
                        content: undefined,
                    }
                }
            })
            .then(() => {
                knexInstance
                    .count()
                    .from('CommentLikes')
                    .where('commentId', commentId)
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