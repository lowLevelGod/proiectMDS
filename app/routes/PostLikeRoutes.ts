import express from "express";
import { authenticationController, postLikeController } from "../utils/globals";

export const postLikeRouter = express.Router();

postLikeRouter.post('/posts/likes', authenticationController.isAuthenticated, postLikeController.create);
postLikeRouter.get('/posts/:id/likes', postLikeController.getPostLikes); 
postLikeRouter.get('/posts/:id/likes/count', postLikeController.getPostLikesCount);
postLikeRouter.delete('/posts/:id/likes', authenticationController.isAuthenticated, postLikeController.deleteLike);
