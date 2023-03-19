const express = require('express');
const RedisStore = require('connect-redis').default;
const session = require('express-session');
const {createClient} = require('redis');
const cors = require('cors');
const https = require(`https`);
const fs = require(`fs`);
const app = express();
const port = 8080;

const options = {
    key: fs.readFileSync(`certificate/client-key.pem`),
    cert: fs.readFileSync(`certificate/client-cert.pem`)
};

let redisClient = createClient();
redisClient.connect().catch(console.error);

let redisStore = new RedisStore({
    client: redisClient,
    prefix: "proiectmds:",
});

app.use(
    session({
      name: "dinoSnack", 
      store: redisStore,
      resave: false, 
      saveUninitialized: false,
      secret: "brontosaurus",
      cookie : {
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

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Hello world!");
});

app.post('/login', (req, res) => {

    const sessionUser = {
        id: "id 1234",
        username: "username",
        email: req.body.email,
    };

    req.session.regenerate(function (err) {
        if (err) next(err)
    
        // store user information in session, typically a user id
        req.session.user = sessionUser
    
        // save the session before redirection to ensure page
        // load does not happen before session is saved
        req.session.save(function (err) {
          if (err) return next(err)
          res.redirect('/')
        })
      })
});

app.get('/whoami', (req, res) => {

    const isLoggedIn = req.session.user ? true : false;
    res.send(isLoggedIn);
});

app.get('/logout', function (req, res, next) {
    // logout logic
  
    // clear the user from the session object and save.
    // this will ensure that re-using the old session id
    // does not have a logged in user
    req.session.user = null
    req.session.destroy(function (err) {
        if (err) next(err)
        res.clearCookie('dinoSnack');
        res.send('ok');
      })
  })

const httpsServer = https.createServer(options, app);
httpsServer.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});