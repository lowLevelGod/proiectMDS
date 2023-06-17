import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { getUserPassword, hashPassword, isEmailUnique, validateUser } from "../utils/password";
import { knexInstance, User } from "../utils/globals";
import { craftError, errorCodes } from "../utils/error";
import session from "express-session";
import { v4 as uuidv4 } from 'uuid';

export class AuthenticationController {
    signup(req: Request, res: Response, next: NextFunction) {
        hashPassword(req.body.password)
            .then(passwordHash => {
                let id = uuidv4();
                const user = {
                    id,
                    email: req.body.email,
                    passwordHash,
                };

                isEmailUnique(user.email)
                    .then(isUnique => {
                        if (isUnique) {
                            knexInstance('Users')
                                .insert(user)
                                .then(x => {
                                    const sessionUser = {
                                        id: user.id,
                                        username: "username",
                                        email: user.email,
                                    };
                                    req.session.regenerate(function (err) {
                                        if (err) {
                                            const error = craftError(errorCodes.other, "Please try signing up again!");
                                            return res.status(500).json({ error, content: undefined });
                                        }

                                        // store user information in session, typically a user id
                                        req.session.user = sessionUser;

                                        // save the session before redirection to ensure page
                                        // load does not happen before session is saved
                                        req.session.save(function (err) {
                                            if (err) {
                                                const error = craftError(errorCodes.other, "Please try signing up again!");
                                                return res.status(500).json({ error, content: undefined });
                                            }
                                            return res.status(200).json({ error: undefined, content: sessionUser });
                                        })
                                    })
                                })
                                .catch(err => {
                                    console.log(err.message);
                                    const error = craftError(errorCodes.other, "Please try signing up again!");
                                    return res.status(500).json({ error, content: undefined });
                                });
                        } else {
                            const error = craftError(errorCodes.emailTaken, "Email is already taken!");
                            return res.status(409).json({ error, content: undefined });
                        }
                    });

            })
            .catch(err => {
                console.log(err.message);
                const error = craftError(errorCodes.other, "Please try signing up again!");
                return res.status(500).json({ error, content: undefined });
            });

    }

    login(req: Request, res: Response, next: NextFunction) {

        getUserPassword(req.body.email)
            .then(hash => validateUser(req.body.password, hash))
            .then(isValidated => {

                if (isValidated) {
                    knexInstance
                        .select('id', 'email')
                        .from('Users')
                        .where('email', req.body.email)
                        .then(x => x[0])
                        .then(x => {
                            return {
                                id: x.id,
                                email: x.email,
                                username: "username"
                            }
                        })
                        .then(sessionUser => {
                            req.session.regenerate(function (err) {
                                if (err) {
                                    const error = craftError(errorCodes.other, "Please try logging in again!");
                                    return res.status(500).json({ error, content: undefined });
                                }

                                // store user information in session, typically a user id
                                req.session.user = sessionUser;
                            
                                return res.status(200).json({ error: undefined, content: sessionUser });
                            })
                        })
                        .catch(err => {
                            console.error(err.message);
                            const error = craftError(errorCodes.other, "Please try logging in again!");
                            return res.status(500).json({ error, content: undefined });
                        });

                } else {
                    const error = craftError(errorCodes.badCredentials, "Email or password wrong!");
                    return res.status(403).json({ error, content: undefined });
                }
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.badCredentials, "Email or password wrong!");
                return res.status(403).json({ error, content: undefined });
            });

    }

    isAuthenticated(req: Request, res: Response, next: NextFunction) {
        if (req.session.user) next()
        else {
            const error = craftError(errorCodes.notLoggedIn, "Please log in first!");
            return res.status(403).json({ error, content: undefined });
        }
    }

    whoami(req: Request, res: Response) {
        return res.status(200).json({ error: undefined, content: req.session.user });
    }

    logout(req: Request, res: Response, next: NextFunction) {
        // logout logic

        // clear the user from the session object and save.
        // this will ensure that re-using the old session id
        // does not have a logged in user
        req.session.user = undefined;
        req.session.destroy(function (err) {
            if (err) {
                const error = craftError(errorCodes.other, "Log out failed!");
                return res.status(500).json({ error, content: undefined });
            }
            return res.clearCookie('dinoSnack').status(200).json({ error: undefined, content: undefined });
        })
    }

    delete(req: Request, res: Response, next: NextFunction) {

        knexInstance('Users')
            .where('id', req.session.user!.id)
            .del()
            .then(x => {
                if (x === 0) {
                    const error = craftError(errorCodes.notFound, "User not found!");
                    return res.status(404).json({ error, content: undefined });
                }

                // logout logic

                // clear the user from the session object and save.
                // this will ensure that re-using the old session id
                // does not have a logged in user
                req.session.user = undefined;
                req.session.destroy(function (err) {
                    if (err) {
                        const error = craftError(errorCodes.other, "Log out failed!");
                        return res.status(500).json({ error, content: undefined });
                    }
                    return res.clearCookie('dinoSnack').status(200).json({ error: undefined, content: undefined });
                });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            });
    }
}