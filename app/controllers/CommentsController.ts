import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { knexInstance, Comment } from '../utils/globals';
import { Knex } from 'knex';
import { craftError, errorCodes } from '../utils/error';
import { v4 as uuidv4 } from 'uuid';

function getComment(id: string): Knex.QueryBuilder{
    return knexInstance('Comments')
    .select('*')
    .where('id', id)
    .first();
}

export class CommentsController{
    create(req: Request, res: Response, next: NextFunction){

        if (!req.body.content){
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

        if (parentId){
            getComment(parentId)
            .then((parent: Comment) => {
                if (!parent){
                    const error = craftError(errorCodes.notFound, "Parent comment not found!");
                    return res.status(404).json({ error, content: undefined });
                }

                // if we reply to comment not on root level
                // we assign replied comment's parent
                if (parent.parentId){
                    parentId = parent.parentId;
                }

                comment.parentId = parentId;
                knexInstance('Comments')
                .insert(comment)
                .then(x => res.status(200).json({ error: undefined, content: comment }))
                .catch(err => {
                    console.error(err.message);
                    const error = craftError(errorCodes.other, "Please try commenting again!");
                    return res.status(500).json({ error, content: undefined });
                });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try commenting again!");
                return res.status(500).json({ error, content: undefined });
            });
        }

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