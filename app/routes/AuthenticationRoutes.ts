import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { authenticationController } from '../utils/globals';

export const auth = express.Router();

auth.post('/signup', authenticationController.signup);
auth.post('/login', authenticationController.login);
auth.get('/whoami', authenticationController.isAuthenticated, authenticationController.whoami);
auth.get('/logout', authenticationController.logout);