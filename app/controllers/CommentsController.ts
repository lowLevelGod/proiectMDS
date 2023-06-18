import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { knexInstance, Comment } from '../utils/globals';
import { Knex } from 'knex';
import { craftError, errorCodes } from '../utils/error';
import { v4 as uuidv4 } from 'uuid';

function getComment(id: string): Knex.QueryBuilder {
    return knexInstance('Comments')
        .select('*')
        .where('id', id)
        .first();
}

function getCommentOwner(id: string): Knex.QueryBuilder {
    return knexInstance('Comments')
        .select('userId')
        .where('id', id)
        .first();
}

export class CommentsController {
    create(req: Request, res: Response, next: NextFunction) {

        if (!req.body.content) {
            const error = craftError(errorCodes.noContent, "Comment content cannot be null!");
            return res.status(403).json({ error, content: undefined });
        }

        let parentId: string = req.body.parentId;

        let comment: Comment = {
            id: uuidv4(),
            createdAt: new Date(),
            userId: req.session.user!.id,
            postId: req.body.postId,
            content: req.body.content,
            parentId,
        };

        if (parentId) {
            getComment(parentId)
                .then((parent: Comment) => {
                    if (!parent) {
                        const error = craftError(errorCodes.notFound, "Parent comment not found!");
                        return res.status(404).json({ error, content: undefined });
                    }

                    // if we reply to comment not on root level
                    // we assign replied comment's parent
                    if (parent.parentId) {
                        parentId = parent.parentId;
                    }

                    comment.parentId = parentId;
                    knexInstance('Comments')
                        .insert(comment)
                        .then(x => res.status(200).json({ error: undefined, content: comment }));
                })
                .catch(err => {
                    console.error(err.message);
                    const error = craftError(errorCodes.other, "Please try commenting again!");
                    return res.status(500).json({ error, content: undefined });
                });
        }else{

            knexInstance('Comments')
                .insert(comment)
                .then(x => res.status(200).json({ error: undefined, content: comment }))
                .catch(err => {
                    console.error(err.message);
                    const error = craftError(errorCodes.other, "Please try commenting again!");
                    return res.status(500).json({ error, content: undefined });
                });
        }
    }

    get(req: Request, res: Response, next: NextFunction) {

        getComment(req.params.id)
            .then((comment: Comment) => {
                if (!comment) {
                    const error = craftError(errorCodes.notFound, "Comment not found!");
                    return res.status(404).json({ error, content: undefined });
                }

                return res.status(200).json({ error: undefined, content: comment });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            });
    }

    getChildren(req: Request, res: Response, next: NextFunction) {

        let query = knexInstance('Comments').select('*');
        if (req.params.postId) {
            query
                .where('postId', req.params.postId)
                .andWhere('parentId', null)
                .then((arr: Comment[]) => {
                    // if (arr.length === 0) {
                    //     const error = craftError(errorCodes.notFound, "No comments found!");
                    //     return res.status(404).json({ error, content: undefined });
                    // }

                    return res.status(200).json({ error: undefined, content: arr });
                })
                .catch(err => {
                    console.error(err.message);
                    const error = craftError(errorCodes.other, "Please try again!");
                    return res.status(500).json({ error, content: undefined });
                });
        } else {
            query
                .where('parentId', req.params.id)
                .then((arr: Comment[]) => {
                    // if (arr.length === 0) {
                    //     const error = craftError(errorCodes.notFound, "No replies found!");
                    //     return res.status(404).json({ error, content: undefined });
                    // }

                    return res.status(200).json({ error: undefined, content: arr });
                })
                .catch(err => {
                    console.error(err.message);
                    const error = craftError(errorCodes.other, "Please try again!");
                    return res.status(500).json({ error, content: undefined });
                });
        }
    }

    patch(req: Request, res: Response, next: NextFunction) {

        getCommentOwner(req.params.id)
            .then((data: Partial<Comment>) => {
                if (!data) {
                    const error = craftError(errorCodes.notFound, "Comment not found!");
                    return res.status(404).json({ error, content: undefined });
                }

                const userId = data.userId;
                if (userId !== req.session.user!.id) {
                    const error = craftError(errorCodes.unAuthorized, "You are not authorized!");
                    return res.status(403).json({ error, content: undefined });
                }

                const comment: Partial<Comment> = {
                    content: req.body.content,
                }

                const query = knexInstance('Comments')
                    .where('id', req.params.id)
                    .andWhere('userId', req.session.user!.id);

                if (comment.content) {
                    query.update({ content: comment.content }, "*");
                }

                query
                    .then((arr: Comment[]) => {
                        if (arr.length === 0) {
                            const error = craftError(errorCodes.notFound, "Comment not found!");
                            return res.status(404).json({ error, content: undefined });
                        }

                        return res.status(200).json({ error: undefined, content: arr[0] });
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

    getCommentsCount(req: Request, res: Response, next: NextFunction) {
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
                    .from('Comments')
                    .where('postId', postId)
                    .then(count => {
                        return res.status(200).json({ error: undefined, content: count[0] });
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