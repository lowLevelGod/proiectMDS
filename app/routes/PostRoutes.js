"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRouter = void 0;
const express_1 = __importDefault(require("express"));
const globals_1 = require("../utils/globals");
exports.postRouter = express_1.default.Router();
exports.postRouter.post('/posts', globals_1.authenticationController.isAuthenticated, globals_1.uploadMedia, globals_1.postController.create);
exports.postRouter.delete('/posts/:id', globals_1.authenticationController.isAuthenticated, globals_1.postController.delete);
exports.postRouter.get('/posts/:id', globals_1.authenticationController.isAuthenticated, globals_1.postController.getSinglePost);
exports.postRouter.get('/posts', globals_1.postController.getPostsByUser);
exports.postRouter.get('/posts/:id/media', globals_1.postController.getPostMedia);
exports.postRouter.patch('/posts/:id', globals_1.authenticationController.isAuthenticated, globals_1.postController.patch);
