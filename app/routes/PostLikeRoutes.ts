import express from "express";
import { authenticationController, postLikeController } from "../utils/globals";

export const commentLikeRouter = express.Router();

commentLikeRouter.post('/comments/:id/likes', authenticationController.isAuthenticated, postLikeController.create);
commentLikeRouter.get('/comments/:id/likes', postLikeController.getPostLikes); 
commentLikeRouter.get('/comments/:id/likes/count', postLikeController.getPostLikesCount);
commentLikeRouter.delete('/comments/:id/likes', authenticationController.isAuthenticated, postLikeController.deleteLike);