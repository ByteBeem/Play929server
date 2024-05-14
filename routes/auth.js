const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const firebase = require("firebase-admin");
const saltRounds = 12;
const randomInt = require('crypto').randomInt;
const nodemailer = require("nodemailer");
const axios = require('axios');
const db = firebase.database();
const csrf = require("csurf");
const secretKey = process.env.secret_key || "DonaldMxolisiRSA04?????";
const csrfProtection = csrf({ cookie: true });
const fs = require('fs');
const logoData = fs.readFileSync('./logo.jpg');
const logoBase64 = logoData.toString('base64');
const logoSrc = `data:image/jpeg;base64,${logoBase64}`;
const jwtCsrfMap = new Map();



const SendNoticeEmail = async (email) => {

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
      subject: 'Password changed',
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
              <h1>Password changed</h1>
              <p>Hello Play929 user,</p>
              <p>You've changed your play929.com account password.</p>
              <p>If this was not you , please contact us on <a href="mailto:support@Play929.com">support@Play929.com</a.</p>
              
              <div class="footer">
                <p>This is an automated email, please do not reply.</p>
                
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

const validateEmail = (email) => {
  const emailRegex = new RegExp(
    "^(?!\\.)[a-zA-Z0-9._%+-]+@(?!-)[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
  );
  return emailRegex.test(email);
};

async function validateRecaptcha(token) {

  const secretKey = '6LeZbckpAAAAACEX7ap_CZ9-8OXDWIia69GmsXlV';
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

  try {
    const response = await axios.post(url);

    const { success } = response.data;
    return success;
  } catch (error) {
    console.error('Recaptcha validation error: ', error);
    return false;
  }

}

const OTPgen = async () => {
  let code = '';
  for (let i = 0; i < 4; i++) {
    const digit = randomInt(0, 10);
    code += digit.toString();
  }
  return code
}

const SendSignUpEmail = async (email, code) => {

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
    subject: 'Account Verification',
    html: `
      <p>Dear User,</p>
      <p>Your OTP code to verify your account on Play929.com is:</p>
      <p>${code}</p>
      <p>Thank you for choosing Play929.com.</p>
      <p>Sincerely,</p>
      <p>The Play929 Team</p>
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



const EmailReset = async (email, code) => {

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'heckyl66@gmail.com',
      pass: 'izpanbvcuqhsvlyb',
    },
  });


  const mailOptions = {
    from: 'heckyl66@gmail.com',
    to: email,
    subject: 'Reset Your Password',
    html: `
        <p>OTP code to reset your Chess929.com password:</p>
        <p>${code}</p>
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

router.post("/signup", async (req, res) => {
  const { full, surname, country, email, password } = req.body;

  let balance;

  if (country != 'ZA') {
    balance = '5.00';
  } else {
    balance = '10.00';
  }

  try {


    const cellSnapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (cellSnapshot.exists()) {
      return res.status(409).json({ error: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const code = await OTPgen();

    SendSignUpEmail(email, code);

    await db.ref('otpCodes').push({
      code: code,
      names: full,
      surname: surname,
      balance: balance,
      country: country,
      email: email,
      password: hashedPassword,

    });



    res.status(200).json({ message: "Please confirm OTP code." });
  } catch (err) {
    console.error("Error during signup:", err);
    return res.status(500).json({ error: "Oops!. Please try again later." });
  }

});

router.post("/confirm-otp", async (req, res) => {
  const { code, email } = req.body;

  try {


    const otpSnapshot = await db.ref('otpCodes').orderByChild('email').equalTo(email).once('value');
    const otpData = otpSnapshot.val();
    const matchingCode = Object.values(otpData).find(otp => otp.code === code);

    if (matchingCode) {

      const { names, surname, email, password, country, balance } = matchingCode;



      const userRef = db.ref('users').push();
      userRef.set({
        names: names,
        surname: surname,
        email: email,
        country: country,
        password: password,
        balance: balance

      });


      await db.ref('otpCodes').orderByChild('email').equalTo(email).once('value', snapshot => {
        snapshot.forEach(child => {
          child.ref.remove();
        });
      });

      const newToken = jwt.sign(
        {

          email: email,

        },
        secretKey,
        { expiresIn: "7D" }
      );

      return res.status(200).json({ token: newToken });
    } else {
      return res.status(403).json({ error: "Invalid OTP code." });
    }
  } catch (err) {
    console.error("Error during OTP confirmation:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password, token } = req.body;

  const isValid = await validateRecaptcha(token);


  try {
    if (isValid) {
      const snapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
      const userData = snapshot.val();

      if (!userData) {
        return res.status(401).json({ error: "User not found." });
      }

      const userId = Object.keys(userData)[0];
      const user = userData[userId];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: "Incorrect password." });
      }

      const newToken = jwt.sign(
        {

          email: user.email,
        },
        secretKey,
        { expiresIn: "7D" }
      );


      res.status(200).json({ token: newToken });
    } else {
      res.status(400).json({ error: "Please verify you are not a robot." });
    }

  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});

router.post("/changePassword", async (req, res) => {
  const { oldPassword, newPassword, token } = req.body;

  let email;

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, secretKey);
  } catch (tokenError) {
    console.error("Error verifying token:", tokenError);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const cellphone = decodedToken.email.toString();

  const snapshot = await db.ref('users').orderByChild('email').equalTo(cellphone).once('value');
  const userData = snapshot.val();

  if (!userData) {
    return res.status(404).json({ error: "User not found." });
  }

  const userId = Object.keys(userData)[0];
  const user = userData[userId];

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  const userKey = Object.keys(userData)[0];
  const userRef = db.ref(`users/${userKey}`);
  userRef.once('value', (snapshot) => {
    const userData = snapshot.val(); 
     email = userData.email; 
     console.log(email);
   
  });

  try {
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    await userRef.update({ password: hashedNewPassword });
    await SendNoticeEmail(email);
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (updateError) {
    console.error("Error updating password:", updateError);
    return res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/resetPassword", async (req, res) => {
  const { email, token } = req.body;

  const isValid = await validateRecaptcha(token);
  try {

    if (isValid) {

      const snapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
      const userData = snapshot.val();

      if (!userData) {
        return res.status(401).json({ error: `No account found on: ${email}` });
      }

      if (!email) {
        return res.status(400).json({ error: "Email is Required." });
      }

      const isValid = validateEmail(email);
      if (!isValid) {
        return res.status(400).json({ error: "Wrong email Format." });
      }

      const code = await OTPgen();
      EmailReset(email, code);

      await db.ref('ResetOtpCodes').push({
        code: code,
        email: email,

      });

      return res.status(200).json({ message: "Reset code sent successfully." });
    } else {
      return res.status(400).json({ error: "Please verify you are not a robot." });
    }
  } catch (err) {
    console.error("Error during ResetPassword:", err);
    return res.status(500).json({ error: "Something went wrong , try again later." });
  }
});


router.post("/confirmReset-otp", async (req, res) => {
  const { code, email } = req.body;

  try {


    const otpSnapshot = await db.ref('ResetOtpCodes').orderByChild('email').equalTo(email).once('value');
    const otpData = otpSnapshot.val();
    const matchingCode = Object.values(otpData).find(otp => otp.code === code);

    if (matchingCode) {

      return res.status(200).json({});
    } else {
      return res.status(403).json({ error: "Invalid OTP code." });
    }
  } catch (err) {
    console.error("Error during OTP confirmation:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});




router.post("/updatePassword", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and newPassword are required." });
    }

    
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    
    const snapshot = await db.ref("users")
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    const userData = snapshot.val();

    if (!userData) {
      return res.status(404).json({ error: `No user found with email: ${email}` });
    }

    
    const userId = Object.keys(userData)[0]; 
    await db.ref(`users/${userId}`).update({ password: hashedPassword });

    
    await db.ref("ResetOtpCodes")
      .orderByChild("email")
      .equalTo(email)
      .once("value", (snapshot) => {
        snapshot.forEach((childSnapshot) => {
          const key = childSnapshot.key;
          db.ref("ResetOtpCodes").child(key).remove();
        });
      });

    return res.status(200).json({ message: "Password updated successfully , Go log in." });
  } catch (error) {
    console.error("Error during password reset:", error);
    return res.status(500).json({ error: "Failed to update password. Please try again later." });
  }
});

router.get("/csrfToken", csrfProtection, (req, res) => {
  const jwtToken = req.header("Authorization").replace("Bearer ", "");
  jwtCsrfMap.set(jwtToken, req.csrfToken());
  res.json({ csrfToken: req.csrfToken() });
});


module.exports = {router , jwtCsrfMap };