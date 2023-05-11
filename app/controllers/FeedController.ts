import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { getAllFollowing } from './FollowersController';
import { Follower, Post } from '../utils/globals';
import { getPostsByUser } from './PostController';
import { craftError, errorCodes } from '../utils/error';
import path from 'path';

export class FeedController {
    getFeed(req: Request, res: Response, next: NextFunction){

        const userId = req.session.user?.id!;

        getAllFollowing(userId)
        .then((followers: Follower[]) => {

            const promises: Promise<Post[]>[] = followers.map(f => getPostsByUser(f.follows));

            Promise.allSettled(promises)
            .then((results: PromiseSettledResult<Post[]>[]) => {

                const posts: Post[] = [];
                results.forEach(r => {
                    if (r.status === "fulfilled"){
                        const arr: Post[] = r.value;
                        arr.forEach(p => {
                            p.picturesURLs = p.picturesURLs.map(f => {
                                const newPath: string = path.join('users', p.userId, 'pictures');
                                return path.join(newPath, f);
                            });
                        });

                        posts.push(...arr);
                    }
                });

                return posts.sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf());
            })
            .then((posts: Post[]) => {
                return res.status(200).json({ error: undefined, content: posts });
            })
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