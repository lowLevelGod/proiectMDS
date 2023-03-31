"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationController = void 0;
const password_1 = require("../utils/password");
const globals_1 = require("../utils/globals");
const error_1 = require("../utils/error");
const uuid_1 = require("uuid");
class AuthenticationController {
    signup(req, res, next) {
        (0, password_1.hashPassword)(req.body.password)
            .then(passwordHash => {
            let id = (0, uuid_1.v4)();
            const user = {
                id,
                email: req.body.email,
                passwordHash,
            };
            (0, password_1.isEmailUnique)(user.email)
                .then(isUnique => {
                if (isUnique) {
                    (0, globals_1.knexInstance)('Users')
                        .insert(user)
                        .then(x => {
                        const sessionUser = {
                            id: user.id,
                            username: "username",
                            email: user.email,
                        };
                        req.session.regenerate(function (err) {
                            if (err) {
                                const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try signing up again!");
                                return res.status(500).json({ error, content: undefined });
                            }
                            // store user information in session, typically a user id
                            req.session.user = sessionUser;
                            // save the session before redirection to ensure page
                            // load does not happen before session is saved
                            req.session.save(function (err) {
                                if (err) {
                                    const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try signing up again!");
                                    return res.status(500).json({ error, content: undefined });
                                }
                                return res.status(200).json({ error: undefined, content: sessionUser });
                            });
                        });
                    })
                        .catch(err => {
                        console.log(err.message);
                        const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try signing up again!");
                        return res.status(500).json({ error, content: undefined });
                    });
                }
                else {
                    const error = (0, error_1.craftError)(error_1.errorCodes.emailTaken, "Email is already taken!");
                    return res.status(409).json({ error, content: undefined });
                }
            });
        })
            .catch(err => {
            console.log(err.message);
            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try signing up again!");
            return res.status(500).json({ error, content: undefined });
        });
    }
    login(req, res, next) {
        (0, password_1.getUserPassword)(req.body.email)
            .then(hash => (0, password_1.validateUser)(req.body.password, hash))
            .then(isValidated => {
            if (isValidated) {
                globals_1.knexInstance
                    .select('id', 'email')
                    .from('Users')
                    .where('email', req.body.email)
                    .then(x => x[0])
                    .then(x => {
                    return {
                        id: x.id,
                        email: x.email,
                        username: "username"
                    };
                })
                    .then(sessionUser => {
                    req.session.regenerate(function (err) {
                        if (err) {
                            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try logging in again!");
                            return res.status(500).json({ error, content: undefined });
                        }
                        // store user information in session, typically a user id
                        req.session.user = sessionUser;
                        return res.status(200).json({ error: undefined, content: sessionUser });
                    });
                })
                    .catch(err => {
                    console.error(err.message);
                    const error = (0, error_1.craftError)(error_1.errorCodes.other, "Please try logging in again!");
                    return res.status(500).json({ error, content: undefined });
                });
            }
            else {
                const error = (0, error_1.craftError)(error_1.errorCodes.other, "Email or password wrong!");
                return res.status(403).json({ error, content: undefined });
            }
        })
            .catch(err => {
            console.error(err.message);
            const error = (0, error_1.craftError)(error_1.errorCodes.other, "Email or password wrong!");
            return res.status(403).json({ error, content: undefined });
        });
    }
    isAuthenticated(req, res, next) {
        if (req.session.user)
            next();
        else {
            const error = (0, error_1.craftError)(error_1.errorCodes.notLoggedIn, "Please log in first!");
            return res.status(403).json({ error, content: undefined });
        }
    }
    whoami(req, res) {
        return res.status(200).json({ error: undefined, content: req.session.user });
    }
    logout(req, res, next) {
        // logout logic
        // clear the user from the session object and save.
        // this will ensure that re-using the old session id
        // does not have a logged in user
        req.session.user = undefined;
        req.session.destroy(function (err) {
            if (err) {
                const error = (0, error_1.craftError)(error_1.errorCodes.other, "Log out failed!");
                return res.status(500).json({ error, content: undefined });
            }
            return res.clearCookie('dinoSnack').status(200).json({ error: undefined, content: undefined });
        });
    }
}
exports.AuthenticationController = AuthenticationController;
