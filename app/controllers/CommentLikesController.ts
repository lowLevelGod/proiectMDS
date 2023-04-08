import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { CommentLike, knexInstance } from '../utils/globals';
import { craftError, errorCodes } from '../utils/error';

export class CommentLikesController {

    create(req: Request, res: Response, next: NextFunction) {
        
        let commentLike: CommentLike = {
            userId: req.session.user!.id,
            commentId: req.body.commentId,
        };

        knexInstance('CommentLikes')
            .insert(commentLike)
            .then(x => res.status(200).json({ error: undefined, content: commentLike }))
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            })
    }

    getLikes(req: Request, res: Response, next: NextFunction) {
        const commentId = req.body.commentId;   

        if (!commentId || typeof commentId != 'string') {
            const error = craftError(errorCodes.notFound, "Comment not found!");
            return res.status(404).json({ error, content: undefined });
        }

        knexInstance
            .select('*')
            .from('CommentLikes')
            .where('commentId', '=', commentId)
            .then(rows => {
                if (rows.length === 0) {
                    const error = craftError(errorCodes.notFound, "No likes found for this comment!");
                    return res.status(404).json({ error, content: undefined });
                }
                const likes: CommentLike[] = rows.map(row => ({
                    userId: row.userId,
                    commentId: row.commentId
                }));
                return res.status(200).json({ error: undefined, content: likes });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            })
    }
}