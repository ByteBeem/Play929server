const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const firebase = require("firebase-admin");
const db = firebase.database();
const secretKey = process.env.secret_key || "DonaldMxolisiRSA04?????";
const { jwtCsrfMap } = require('./auth.js');
const bcrypt = require("bcryptjs");
const fs = require('fs');
const axios = require("axios");
const logoData = fs.readFileSync('./logo.jpg');
const logoBase64 = logoData.toString('base64');
const logoSrc = `data:image/jpeg;base64,${logoBase64}`;
const payfastSandbox = " https://sandbox.payfast.co.za​/eng/process";
const payfastReal = " https://www.payfast.co.za/eng/process";
const Merchant_ID = "23735018";
const Merchant_Key= "byi69veyijohe";
const return_url = "https://play929.vercel.app";
const cancel_url = "https://play929.vercel.app";


const sendDepositInfo = async (email , amount , name , surname) =>{
  try {

    const response = await axios.post(payfastReal ,{

      merchant_id : Merchant_ID,
      merchant_key :Merchant_Key,
      amount:amount,
      item_name: "Deposit",
      email_address :email,
      name_first : name , 
      name_last : surname,
      email_confirmation :1,
      confirmation_address :email,
      return_url : return_url,
      cancel_url :cancel_url,
    })
  
    if(response.status == 200 ){
      
      
      return response.request.res.responseUrl;
    };

  }catch(error){
    
  }
}


const SendWIthdrawalEmail = async (email, amount) => {

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'heckyl66@gmail.com',
        pass: 'izpanbvcuqhsvlyb',
      },
    });
  
  
    const mailOptions = {
        from: 'Play929 Support <support@Play929.com>',
        to: email,
        subject: 'Withdrawal Request',
        html: `
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  border: 1px solid #ccc;
                  border-radius: 5px;
                  background-color: #f9f9f9;
                }
                .logo {
                  width: 150px;
                  display: block;
                  margin: 0 auto;
                }
                h1 {
                  text-align: center;
                  color: #333;
                }
                p {
                  margin-bottom: 20px;
                  line-height: 1.6;
                  color: #666;
                }
                .footer {
                  text-align: center;
                  color: #999;
                  font-size: 12px;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <img src=${logoSrc} alt="Play929 Logo" class="logo">
                <h1>Withdrawal Request</h1>
                <p>Hello,</p>
                <p>You've requested a withdrawal from your Play929.com account.</p>
                <p>An amount of R${amount} will be processed within 24 hours.</p>
                <p>Thank you for using Play929!</p>
                <div class="footer">
                  <p>This is an automated email, please do not reply.</p>
                  <p>If you have any questions, contact <a href="mailto:support@Play929.com">support@Play929.com</a>.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };
      
  
    try {
  
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent: ', info.response);
      return true;
    } catch (error) {
      console.error('Error sending email: ', error);
      return false;
    }
  };
  router.post('/withdraw', async (req, res) => {
    
    try {
        
        const jwtToken = req.header("Authorization").replace("Bearer ", "");
        const csrfToken = req.headers["x-csrf-token"];
        
        const storedCsrfToken = jwtCsrfMap.get(jwtToken);
        
        
        if (csrfToken !== storedCsrfToken) {
          return res.status(403).json({ error: "unauthorized , refresh the page!" });
        }

        const token = req.header('Authorization').replace('Bearer ', '');
        const { amount, account, bank, password } = req.body;

        if (!bank) {
            return res.status(400).json({ error: 'Select your Bank' });
        }

        const decodedToken = jwt.verify(token, secretKey);
        const userId = decodedToken.email;

        const snapshot = await db.ref('users').orderByChild('email').equalTo(decodedToken.email).once('value');
        const user = snapshot.val();



        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const Username = user[Object.keys(user)[0]].names;
        const Usersurname = user[Object.keys(user)[0]].surname;
        const UserEmail = user[Object.keys(user)[0]].email;
        const Userpassword = user[Object.keys(user)[0]].password;
        const Userbalance = user[Object.keys(user)[0]].balance;
        const userCountry = user[Object.keys(user)[0]].country;


        const isMatch = await bcrypt.compare(password, Userpassword);

        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect Password' });
        }


        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }

        if (amount < 200 && userCountry === "ZA") {
            return res.status(400).json({ error: 'Minimum withdrawal amount is R200' });
        }

        if (amount < 200 && userCountry !== "ZA") {
            return res.status(400).json({ error: 'Minimum withdrawal amount is $100' });
        }


        if (amount > Userbalance) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const userKey = Object.keys(user)[0];
        const userRef = db.ref(`users/${userKey}`);
        const newAmount = amount - (amount * 0.1);


        const newBalance = parseFloat(Userbalance - newAmount);
        await userRef.update({ balance: newBalance });

        await SendWIthdrawalEmail(decodedToken.email ,  newAmount);


        const withdrawalRef = db.ref('Activities').push();
        withdrawalRef.set({
            user_id: userId,
            activity_description: 'Withdrawal',
            activity_details: `Withdrawal of R${newAmount} to Account No: ${account}, Bank: ${bank}`,
            date_time: new Date().toISOString(),
        });

        const transporter = nodemailer.createTransport({

            service: 'Gmail',
            auth: {
                user: 'heckyl66@gmail.com',
                pass: 'izpanbvcuqhsvlyb',
            },
        });


        const mailOptions = {
            from: 'heckyl66@gmail.com',
            to: 'donald.mxolisi@proton.me',
            subject: 'Withdrawal Request',
            html: `
          <p>Withdrawal Request Details:</p>
          <ul>
            <li>Name: ${Username}</li>
            <li>SurName: ${Usersurname}</li>
            <li>Cell: ${UserEmail}</li>
            <li>User ID: ${userId}</li>
            <li>Withdrawal Amount: ${amount}</li>
            <li>Account: ${account}</li>
            <li>Bank: ${bank}</li>
            <li>Country : ${userCountry}</li>
          </ul>
          <p>Your withdrawal request is being processed. Thank you!</p>
        `,
        };


        await transporter.sendMail(mailOptions);
        

        res.status(200).json({ message: 'Withdrawal successful', newBalance });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post("/deposit" , async (req , res)=>{

  const jwtToken = req.header("Authorization").replace("Bearer ", "");
  const decodedToken = jwt.verify(jwtToken, secretKey);
  const email = decodedToken.email;

  const {amount} = req.body;

  if(!jwtToken){
    res.status(401).json({error : "You have to login again!"});
    return ;
  };

  if(!email){
    res.status(401).json({error: "Unauthorised , login again."});
    return;
  }

  if (!amount){
    res.status(404).json({error : "Amount is required."});
    return;
  }

  try{

    const snapshot = await db.ref('users').orderByChild('email').equalTo(decodedToken.email).once('value');
    const user = snapshot.val();



    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const name = user[Object.keys(user)[0]].names;
    const surname = user[Object.keys(user)[0]].surname;
    

    const response = await sendDepositInfo(email , amount , name , surname);

   
    res.status(200).json({url : response});
  }catch(err){
    res.status(500).json({error : "Something wenty wrong , please try again later"});
    return ;
  }

})

module.exports = router;