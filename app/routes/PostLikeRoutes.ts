import express from "express";
import { authenticationController, postLikeController } from "../utils/globals";

export const commentLikeRouter = express.Router();

commentLikeRouter.post('/posts/:id/likes', authenticationController.isAuthenticated, postLikeController.create);
commentLikeRouter.get('/posts/:id/likes', postLikeController.getPostLikes); 
commentLikeRouter.get('/posts/:id/likes/count', postLikeController.getPostLikesCount);
commentLikeRouter.delete('/posts/:id/likes', authenticationController.isAuthenticated, postLikeController.deleteLike);
