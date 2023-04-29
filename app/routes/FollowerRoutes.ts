import express from "express";
import { authenticationController, followerController } from '../utils/globals';

export const followerRouter = express.Router();

followerRouter.post('/follow', authenticationController.isAuthenticated, followerController.request);
followerRouter.patch('/follow', authenticationController.isAuthenticated, followerController.accept);
followerRouter.delete('/follow/:userId', authenticationController.isAuthenticated, followerController.delete);
followerRouter.get('/follow', authenticationController.isAuthenticated, followerController.get);