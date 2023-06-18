import express from "express";
import { authenticationController, commentController } from "../utils/globals";

export const commentRouter = express.Router();

commentRouter.post('/comments', authenticationController.isAuthenticated, commentController.create);
commentRouter.get('/comments/:id', commentController.get);
commentRouter.get('/comments/:id/replies', commentController.getChildren);
commentRouter.get('/posts/:postId/comments', commentController.getChildren);
commentRouter.patch('/comments/:id', authenticationController.isAuthenticated, commentController.patch);
commentRouter.get('/posts/:id/comments/count', commentController.getCommentsCount);