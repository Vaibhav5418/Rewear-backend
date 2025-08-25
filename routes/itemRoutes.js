const express = require("express");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
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
const Item = require("../models/Item");

const router = express.Router();

// ✅ Cloudinary storage setup with better error handling
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "rewear-items",
    allowed_formats: ["jpg", "png", "jpeg"],
    public_id: (req, file) => `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`,
    transformation: [
      { width: 800, height: 600, crop: "limit" },
      { quality: "auto:good" }
    ]
  },
});

// Enhanced multer configuration with file validation
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log("File filter - File info:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Check file type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimes.includes(file.mimetype)) {
      const error = new Error('Invalid file type. Only JPEG, JPG, and PNG files are allowed.');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // Check file size (additional check)
    if (file.size && file.size > 5 * 1024 * 1024) {
      const error = new Error('File too large. Maximum size is 5MB.');
      error.code = 'FILE_TOO_LARGE';
      return cb(error, false);
    }

    cb(null, true);
  }
});

// Multer error handling middleware
const handleMulterError = (error, req, res, next) => {
  console.error("Multer error:", error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Only one file is allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected file field. Use "image" field name.'
      });
    }
  }
  
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      message: error.message
    });
  }
  
  if (error.code === 'FILE_TOO_LARGE') {
    return res.status(400).json({
      message: error.message
    });
  }
  
  // Generic multer error
  return res.status(400).json({
    message: 'File upload error: ' + error.message
  });
};

// ✅ Routes with enhanced error handling
router.post("/", authMiddleware, (req, res, next) => {
  console.log("POST /items - Starting upload process");
  console.log("Request headers:", {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'Bearer [hidden]' : 'None'
  });
  
  upload.single("image")(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, addItem);

router.get("/", getAllItems);
router.get("/user", authMiddleware, getUserItems);

// Admin-only routes
router.get("/pending", authMiddleware, adminMiddleware, getUnapprovedItems);
router.put("/approve/:id", authMiddleware, adminMiddleware, updateItemApproval);

// Swap/Redeem
router.post("/swap/:id", authMiddleware, handleSwapOrRedeem);

// Get single item by ID with better error handling
// Health check route for debugging
router.get("/health/check", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    cloudinary: cloudinary.config().cloud_name ? "Connected" : "Not configured"
  });
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid item ID format" });
    }
    
    const item = await Item.findById(id).populate("uploader", "name email");
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    res.json(item);
  } catch (err) {
    console.error("Error fetching item by ID:", err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "Invalid item ID" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;