const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserInfo,
  sendOtp
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", sendOtp);
router.get("/user", authMiddleware, getUserInfo);

module.exports = router;
