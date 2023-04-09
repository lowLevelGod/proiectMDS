import express from "express";
import { authenticationController, commentLikeController } from "../utils/globals";

export const commentLikeRouter = express.Router();

commentLikeRouter.post('/comments/:id/likes', authenticationController.isAuthenticated, commentLikeController.create);
commentLikeRouter.get('/comments/:id/likes', commentLikeController.getCommentLikes); 
commentLikeRouter.get('/comments/:id/likes/count', commentLikeController.getCommentLikesCount);
commentLikeRouter.delete('/comments/:id/likes', authenticationController.isAuthenticated, commentLikeController.deleteLike);