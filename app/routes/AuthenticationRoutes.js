"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const express_1 = __importDefault(require("express"));
const globals_1 = require("../utils/globals");
exports.auth = express_1.default.Router();
exports.auth.post('/signup', globals_1.authenticationController.signup);
exports.auth.post('/login', globals_1.authenticationController.login);
exports.auth.get('/whoami', globals_1.authenticationController.isAuthenticated, globals_1.authenticationController.whoami);
exports.auth.get('/logout', globals_1.authenticationController.logout);
