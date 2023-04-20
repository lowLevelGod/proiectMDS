import express from "express";
import { authenticationController, postController, uploadMediaPosts } from '../utils/globals';

export const postRouter = express.Router();

postRouter.post('/posts', authenticationController.isAuthenticated, uploadMediaPosts, postController.create);
postRouter.delete('/posts/:id', authenticationController.isAuthenticated, postController.delete);
postRouter.get('/posts/:id', authenticationController.isAuthenticated, postController.getSinglePost);
postRouter.get('/posts', postController.getPostsByUser);
postRouter.get('/posts/:id/media', postController.getPostMedia);
postRouter.patch('/posts/:id', authenticationController.isAuthenticated, postController.patch);
