import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import multer, { Multer, MulterError } from 'multer';

import RedisStore from "connect-redis";
import session from "express-session";
import { createClient } from "redis";

import { knex, Knex } from 'knex';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { auth } from './routes/AuthenticationRoutes';
import { postRouter } from './routes/PostRoutes';
import { commentRouter } from './routes/CommentRoutes';
import { followerRouter } from './routes/FollowerRoutes';
import { profileRouter } from './routes/ProfileRoutes';
import { postLikeRouter } from './routes/PostLikeRoutes';
import { commentLikeRouter } from './routes/CommentLikeRoutes';

import swaggerUI from 'swagger-ui-express';
import { swaggerDocument } from '../openAPI/swagger';

const app: Express = express();
const port: number = 8080;

// https certificate
const options = {
    key: fs.readFileSync(`certificate/client-key.pem`),
    cert: fs.readFileSync(`certificate/client-cert.pem`)
};

// redis connection for session storage
let redisClient = createClient();
redisClient.connect().catch(console.error);

let redisStore = new RedisStore({
    client: redisClient,
    prefix: "proiectmds:",
});

app.use(express.static('resources'));


app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// cookie options
app.use(
    session({
        name: "dinoSnack",
        store: redisStore,
        resave: false,
        saveUninitialized: false,
        secret: "brontosaurus",
        cookie: {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        }
    })
);

app.use(
    cors({
        origin: "https://localhost:4200",
        methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
        credentials: true,
    })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(auth);
app.use(postRouter);
app.use(commentRouter);
app.use(followerRouter);
app.use(profileRouter);
app.use(postLikeRouter);
app.use(commentLikeRouter);

const httpsServer = https.createServer(options, app);
httpsServer.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});