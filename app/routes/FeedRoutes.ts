import express from "express";
import { authenticationController, feedController } from "../utils/globals";

export const feedRouter = express.Router();

feedRouter.get('/feed', authenticationController.isAuthenticated, feedController.getFeed);