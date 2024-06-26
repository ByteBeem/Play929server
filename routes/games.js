const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const firebase = require("firebase-admin");
const db = firebase.database();
const secretKey = process.env.secret_key || "DonaldMxolisiRSA04?????";
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const onlineUsers = new Map();
const jwtCsrfMapGame = new Map();
const { body, validationResult } = require('express-validator');
const csrf = require("csurf");
const csrfProtection = csrf({ cookie: true });


axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error)
});

const getLink = async (gameId, userName) => {
  try {
    const response = await axios.get(`https://finalchess-12346c5fc79d.herokuapp.com/create_room?type=multi&name=${gameId}`);

    const CreatorLink = `https://finalchess-12346c5fc79d.herokuapp.com/chess?userName=${userName}&roomName=${gameId}&algorithm=random&depth=&time=`;
    return CreatorLink;
  } catch (error) {

  }
};

const wordSearch = async (jwtToken , email , accNo)=>{

  

  try{
    const response= await axios.post("http://localhost:3002/add-new-session",
{
      jtwToken : jwtToken,
      email:email,
      accNo :accNo,
}

    )
    if(response.status === 200){
      return response.data.sessionToken;
    }
  }catch(err){
    console.log("Something went wrong",err);
  }

}

router.get("/searchPlayers", async (req, res) => {
  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).redirect("https://spinz-three.vercel.app/");
  }

  const tokenValue = token.replace("Bearer ", "");

  try {
    const decodedToken = jwt.verify(tokenValue, secretKey);


    const snapshot = await db.ref("onlinePlayers").once("value");
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No online players found." });
    }
    const onlinePlayers = snapshot.val();


    if (!onlinePlayers) {
      return res.status(200).json({ onlinePlayers: [] });
    }


    return res.status(200).json({ onlinePlayers: Object.values(onlinePlayers) });
  } catch (err) {
    console.error("Error searching for online players:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});

router.post("/one-vs-one", async (req, res) => {
  const token = req.header("Authorization")


  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).redirect("https://spinz-three.vercel.app/");
  }

  const tokenValue = token.replace("Bearer ", "");
  const csrfToken = req.headers["x-csrf-token"];
  const storedCsrfToken = jwtCsrfMapGame.get(tokenValue);

  if (csrfToken !== storedCsrfToken) {
    return res.status(403).json({ error: "unauthorized , refresh the page!" });
  }

  try {
    const decodedToken = jwt.verify(tokenValue, secretKey);
    const userName = decodedToken.name;

    let type;
    let stake;
    let newStake;
    let balance;
    let user;

    const { mode, game } = req.body;
    if (mode === "Friendly") {
      type = req.body.type;
    } else {
      type = req.body.type;
      stake = req.body.stake;
      newStake = stake.replace("R", "");
      const snapshot = await db.ref('users').orderByChild('email').equalTo(decodedToken.email).once('value');
      user = snapshot.val();

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      balance = user[Object.keys(user)[0]].balance;

      if (parseFloat(newStake) > parseFloat(balance)) {
        return res.status(400).json({ error: "Insufficient balance." });
      }
      const userKey = Object.keys(user)[0];
      const userRef = db.ref(`users/${userKey}`);

      const newBalance = parseFloat(balance) - parseFloat(newStake);
      await userRef.update({ balance: newBalance });
    }


    const gameId = uuidv4();
    const Link = await getLink(gameId, userName, newStake);
    console.log(gameId);

    await db.ref(`games/${gameId}`).set({
      mode,
      stakeAmount: stake || null,
      type,
      game,
      creator: decodedToken.email,
      name: userName,
      Link: Link,
      opponent: "",
      state: "Not started",

    });

    return res.status(200).json({ Link: Link });
  } catch (err) {
    console.error("Error creating one-vs-one game:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});


router.post("/tournament", async (req, res) => {
  const token = req.header("Authorization");


  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).redirect("https://spinz-three.vercel.app/");
  }

  const tokenValue = token.replace("Bearer ", "");

  try {
    const decodedToken = jwt.verify(tokenValue, secretKey);

    let type;
    let stake;
    let prize;
    let balance;
    let firstRoundGames = [];
    const { mode, numberOfPlayers, game } = req.body;
    let tournamentRounds;

    if (parseInt(numberOfPlayers) === 3) {
      tournamentRounds = 2;
    } else if (parseInt(numberOfPlayers) === 4) {
      tournamentRounds = 2;
    } else if (parseInt(numberOfPlayers) === 6) {
      tournamentRounds = 3;
    } else if (parseInt(numberOfPlayers) === 8) {
      tournamentRounds = 3;
    }

    if (mode === "Friendly") {
      type = req.body.type;
    } else {
      type = req.body.type;
      stake = req.body.stakeAmount;
      newStake = stake.replace("R", "");
      prize = parseFloat(newStake * numberOfPlayers);
      const snapshot = await db.ref('users').orderByChild('email').equalTo(decodedToken.email).once('value');
      const user = snapshot.val();

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      balance = user[Object.keys(user)[0]].balance;

      if (parseFloat(stake) > parseFloat(balance)) {
        return res.status(400).json({ error: "Insufficient balance." });
      }
    }

    const tournamentId = uuidv4();
    const playerOptions = [3, 4, 6, 8];
    const playerCount = parseInt(numberOfPlayers);
    const gameIds = [];

    if (playerOptions.includes(playerCount)) {
      for (let i = 0; i < playerCount / 2; i++) {
        gameIds.push(uuidv4());
      }
    } else {
      return res.status(400).json({ error: "Invalid number of players." });
    }


    const playerLinks = await Promise.all(gameIds.map(async (gameId) => {
      const { black, white } = await getLink(gameId, 'white');
      return { black, white };
    }));

    playerLinks.forEach((link, index) => {

      firstRoundGames.push({
        black: `Game ${index + 1} - Black Player Link: ${link.black}`,
        white: `Game ${index + 1} - White Player Link: ${link.white}`
      });
    });

    await db.ref(`games/tournament/${tournamentId}`).set({
      tournamentRounds: tournamentRounds,
      numberOfPlayers: numberOfPlayers,
      completedRounds: 0,
      state: "in progress",
      mode: mode,
      stakeAmount: stake || null,
      type: type,
      game,
      creator: decodedToken.email,
      firstRoundLinks: firstRoundGames,
      prize: prize || null,
    });

    return res.status(200).json(tournamentId);
  } catch (err) {
    console.error("Error creating tournament game:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});


router.get('/onlineplayers', (req, res) => {
  const onlineUserIds = Array.from(onlineUsers.keys());
  res.status(200).json({ players: onlineUserIds });
});

router.get("/csrfToken", csrfProtection, (req, res) => {
  const jwtToken = req.header("Authorization").replace("Bearer ", "");
  jwtCsrfMapGame.set(jwtToken, req.csrfToken());
  res.json({ csrfToken: req.csrfToken() });
});


router.post("/JoinGame", async (req, res) => {
  const { gameId } = req.body;

  let decodedToken;
  let name;
  let gameData;
  let Data;

  const jwtToken = req.header("Authorization").replace("Bearer ", "");
  if (jwtToken) {
    decodedToken = jwt.verify(jwtToken, secretKey);
    name = decodedToken.name;
  }

  try {
    if (gameId) {
      gameData = db.ref("games/" + gameId);

      
      const snapshot = await gameData.once("value");
      const gameInfo = snapshot.val();
      Data = gameInfo;

      const opponentLink = Data.Link;

      
      await gameData.update({ opponent: name });
      await gameData.update({ state: 'Started' });

      
      const updatedUrl = opponentLink.replace(Data.name, name);

      res.status(200).json({ Link: updatedUrl });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});
router.post('/word-search', [
  body('bet').isNumeric().withMessage('Bet Amount must be a number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }


  try {
    const { bet } = req.body;
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwtToken = authHeader.replace('Bearer ', '');

    let decodedToken;
    try {
      decodedToken = jwt.verify(jwtToken, secretKey);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!bet) {
      return res.status(400).json({ error: 'Bet is required' });
    }

    const snapshot = await db.ref('users').orderByChild('email').equalTo(decodedToken.email).once('value');
    const user = snapshot.val();

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const userKey = Object.keys(user)[0];
    const userData = user[userKey];

    const balance = parseFloat(userData.balance);

    if (parseFloat(bet) > balance) {
      return res.status(400).json({ error: "Insufficient balance." });
    }

    const newBalance = balance - parseFloat(bet);
    
    
    await db.ref(`users/${userKey}`).transaction(currentData => {
      if (currentData === null) {
        return null;
      }
      currentData.balance = newBalance;
      return currentData;
    });

    const Link = await wordSearch(jwtToken , decodedToken.email , 12345678)
    const GameLink = `https://word-search-wine.vercel.app/?secured=${Link}`;

    return res.status(200).json({ message: 'Bet received', Link :GameLink });
  } catch (err) {
    console.error('Internal server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, onlineUsers };
