const express = require('express');
const firebase = require('firebase-admin');
const jwt = require('jsonwebtoken');
const saltRounds = 12;
const db = firebase.database();
const csrf = require("csurf");
const { body, validationResult } = require('express-validator')
const secretKey = process.env.secret_key || "DonaldMxolisiRSA04?????";
const router = express.Router();


router.post('/referral', [
    body('referalCode').isAlphanumeric().withMessage('Invalid Referal Code.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {

    } catch (err) {
        res.status(500).json({ error: "Something went wrong , try again." });
        console.log(err);
    }
})


module.exports = router;