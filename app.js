const cluster = require("cluster");
const http = require("http");
const express = require("express");
const firebase = require("firebase-admin");
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 3001;
const server = http.createServer(app);
app.use(cookieParser());
const firebaseServiceAccount = require("./key.json");

firebase.initializeApp({
  credential: firebase.credential.cert(firebaseServiceAccount),
  databaseURL: "https://chess929-54412-default-rtdb.asia-southeast1.firebasedatabase.app"
});

app.use(helmet());
app.use(hpp());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.set('trust proxy', 'loopback');
app.use(compression());
app.use(express.json({ limit: '5mb' }));

app.use(mongoSanitize());
app.use(xss());
const corsOptions = {
  origin: ['https://play929.vercel.app', 'https://play929.vercel.app', 'https://play929.vercel.app'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'X-Content-Type-Options', 'X-Frame-Options'],
};

app.use(cors(corsOptions));


app.use((req, res, next) => {
  const allowedOrigins = ['https://play929.vercel.app', 'https://play929.vercel.app', 'https://play929.vercel.app', 'https://play929.vercel.app'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', true);

  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Access-Control-Allow-Origin', 'Content-Type, Authorization');
    return res.status(200).json({});
  }

  next();
});


const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/auth/login', limiter);

app.use(morgan('combined'));

const {router: authRouter , jwtCsrfMap} = require('./routes/auth');
const usersRouter = require('./routes/users');
const walletRouter = require("./routes/wallet");
const { router: gamesRouter, onlineUsers } = require('./routes/games');


app.use('/auth', authRouter);
app.use('/games', gamesRouter);
app.use('/users', usersRouter);
app.use('/wallet', walletRouter);

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });



wss.on('connection', (ws) => {
  let userId;


  ws.on('message', (message) => {
    const data = JSON.parse(message);


    if (data.type === 'heartbeat') {

      const userEmail = data.userId;
      onlineUsers.set(userEmail, Date.now());
      return;
    }


    userId = data.userId;
    onlineUsers.set(userId, Date.now());
    broadcastOnlineStatus();
  });
});


function updateOnlineStatus() {
  const currentTime = Date.now();
  onlineUsers.forEach((lastHeartbeatTime, userEmail) => {

    if (currentTime - lastHeartbeatTime > 60000) {
      onlineUsers.delete(userEmail);
    }
  });
  broadcastOnlineStatus();
}


function broadcastOnlineStatus() {
  const onlineUserIds = Array.from(onlineUsers.keys());
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'onlineStatus', onlineUserIds }));
    }
  });
}

setInterval(updateOnlineStatus, 60000);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
