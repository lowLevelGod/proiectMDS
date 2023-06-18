import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { authenticationController, profileController, uploadMediaProfiles, ProfileExists, ProfileDoesNotExist } from '../utils/globals';

export const profileRouter = express.Router();

profileRouter.get('/profiles/:id', profileController.getProfile);
profileRouter.get('/profiles/:id/profilePicture', profileController.getProfilePicture)
profileRouter.post('/profiles', authenticationController.isAuthenticated, ProfileDoesNotExist, uploadMediaProfiles, profileController.create);
profileRouter.post('/profiles/users', profileController.getProfileRange);
profileRouter.patch('/profiles', authenticationController.isAuthenticated, ProfileExists, uploadMediaProfiles, profileController.patch);
profileRouter.delete('/profiles', authenticationController.isAuthenticated, profileController.delete);
profileRouter.delete('/profiles/profilePicture', authenticationController.isAuthenticated, profileController.deleteProfilePicture);
