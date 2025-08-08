// utils/mailer.js
const nodemailer = require("nodemailer");
require("dotenv").config(); // at the top


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = transporter;
