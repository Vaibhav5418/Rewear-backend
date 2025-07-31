const express = require("express");
const multer = require("multer");
const {
  addItem,
  getAllItems,
  getUnapprovedItems,
  updateItemApproval,
  getUserItems,
  handleSwapOrRedeem,
} = require("../controllers/itemController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Routes
router.post("/", authMiddleware, upload.single("image"), addItem);
router.get("/", getAllItems);
router.get("/user", authMiddleware, getUserItems);

// Admin-only
router.get("/pending", authMiddleware, adminMiddleware, getUnapprovedItems);
router.put("/approve/:id", authMiddleware, adminMiddleware, updateItemApproval);

// Swap/Redeem
router.post("/swap/:id", authMiddleware, handleSwapOrRedeem);

// Get single item by ID
router.get("/:id", async (req, res) => {
  try {
    const item = await require("../models/Item")
      .findById(req.params.id)
      .populate("uploader", "name email");
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    console.error("Error fetching item by ID:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
