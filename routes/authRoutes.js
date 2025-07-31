const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getUserInfo } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);

// ✅ Secure route to get full logged-in user info
router.get("/user", authMiddleware, getUserInfo);

module.exports = router;
