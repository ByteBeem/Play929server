const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const firebase = require("firebase-admin");
const db = firebase.database();
const secretKey = process.env.secret_key || "DonaldMxolisiRSA04?????";


router.get("/old", async (req, res) => {
  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).redirect("https://spinz-three.vercel.app/");
  }

  const tokenValue = token.replace("Bearer ", "");

  try {
    const decodedToken = jwt.verify(tokenValue, secretKey);

    const gamesRef = db.ref('games');
    const userGamesSnapshot = await gamesRef.orderByChild('creator').equalTo(decodedToken.email).once('value');
    const userGames = userGamesSnapshot.val();

    

    if (!userGames) {
      return res.status(404).json({ error: "No previous games found." });
    }

    const prevGames = [];


    if (typeof userGames === 'object') {
    
      Object.keys(userGames).forEach(key => {
        const game = userGames[key];
        
        prevGames.push({
          mode: game.mode,
          stakeAmount: game.stakeAmount || null,
          type: game.type,
          creator: game.creator,
          blackPlayerLink: game.blackPlayerLink,
          whitePlayerLink: game.whitePlayerLink,
        });
      });
    }

    return res.status(200).json({ prevGames });
  } catch (err) {
    console.error("Error fetching previous games:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});



router.get("/balance", async (req, res) => {
  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.redirect(401, "https://spinz-three.vercel.app/");
  }


  const tokenValue = token.replace("Bearer ", "");

  try {
    const decodedToken = jwt.verify(tokenValue, secretKey);

    const snapshot = await db.ref('users').orderByChild('email').equalTo(decodedToken.email).once('value');
    const user = snapshot.val();



    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }


    const userBalance = user[Object.keys(user)[0]].balance;
    const country = user[Object.keys(user)[0]].country;

    return res.status(200).json({ balance: userBalance, country: country });
  } catch (err) {
    console.error("Error fetching user balance:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});

router.get("/getUserData", async (req, res) => {
  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.redirect(401, "https://spinz-three.vercel.app/");
  }


  const tokenValue = token.replace("Bearer ", "");

  try {
    const decodedToken = jwt.verify(tokenValue, secretKey);

    const snapshot = await db.ref('users').orderByChild('email').equalTo(decodedToken.email).once('value');
    const user = snapshot.val();


    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }


    const name = user[Object.keys(user)[0]].names;
    const surname = user[Object.keys(user)[0]].surname;

    return res.status(200).json({ name: name, surname: surname });
  } catch (err) {
    console.error("Error fetching user balance:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});


router.get("/email" , async (req, res) =>{

  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).redirect("https://spinz-three.vercel.app/");
  }

  const tokenValue = token.replace("Bearer ", "");

  try {
    const decodedToken = jwt.verify(tokenValue, secretKey);
    const userEmail = decodedToken.email;
   

    return res.status(200).json({userEmail :userEmail});
  }catch(err){
    console.error("Error fetching user balance:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }

});


router.get("/activities", async (req, res) => {
  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.redirect(401, "https://spinz-three.vercel.app/");
  }


  const tokenValue = token.replace("Bearer ", "");

  try {
    const decodedToken = jwt.verify(tokenValue, secretKey);

    const snapshot = await db.ref('Activities').orderByChild('user_id').equalTo(decodedToken.email).once('value');
    const userActivities = snapshot.val();


    if (!userActivities) {
      return res.status(404).json({ error: "User not found." });
    }


    const Date = userActivities[Object.keys(userActivities)[0]].date_time;
    const Details = userActivities[Object.keys(userActivities)[0]].activity_details;
    const Type = userActivities[Object.keys(userActivities)[0]].activity_description;
   

    return res.status(200).json({ Date: Date, Details: Details , Type:Type });
  } catch (err) {
    console.error("Error fetching user activities:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});


module.exports = router;