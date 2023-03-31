import express from "express";
import { authenticationController, commentController } from "../utils/globals";

export const commentRouter = express.Router();

commentRouter.post('/comments', authenticationController.isAuthenticated, commentController.create);