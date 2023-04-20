import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { authenticationController, profileController, uploadMediaProfiles, ProfileExists, ProfileDoesNotExist } from '../utils/globals';

export const profileRouter = express.Router();

profileRouter.get('/profiles/:id', authenticationController.isAuthenticated, profileController.getProfile);
profileRouter.post('/profiles', authenticationController.isAuthenticated, ProfileDoesNotExist, uploadMediaProfiles, profileController.create);
profileRouter.patch('/profiles', authenticationController.isAuthenticated, ProfileExists, uploadMediaProfiles, profileController.patch);
profileRouter.delete('/profiles', authenticationController.isAuthenticated, profileController.delete);
profileRouter.delete('/profiles/picture', authenticationController.isAuthenticated, profileController.deleteProfilePicture);
