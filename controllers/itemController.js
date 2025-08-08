const Item = require("../models/Item");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const dotenv = require('dotenv');

dotenv.config();

// ✅ Add Item with Cloudinary image upload
exports.addItem = async (req, res) => {
  try {
    console.log("=== ADD ITEM REQUEST ===");
    console.log("BODY:", JSON.stringify(req.body, null, 2));
    console.log("FILE:", req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    console.log("USER:", req.user ? { id: req.user.id, email: req.user.email } : 'No user');

    // Validate required fields
    const {
      title,
      description,
      category,
      type,
      size,
      condition,
      tags,
      points,
    } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!points || isNaN(points) || Number(points) <= 0) {
      return res.status(400).json({ message: "Valid points value is required" });
    }

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const uploaderId = req.user.id;

    // Check if image was uploaded successfully
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const imageUrl = req.file.path;

    if (!imageUrl) {
      return res.status(400).json({ message: "Image upload failed" });
    }

    // Process tags - handle empty tags gracefully
    let processedTags = [];
    if (tags && tags.trim() !== '') {
      processedTags = tags.split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }

    // Create new item
    const newItem = new Item({
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category ? category.trim() : '',
      type: type ? type.trim() : '',
      size: size ? size.trim() : '',
      condition: condition ? condition.trim() : '',
      tags: processedTags,
      points: Number(points),
      uploader: uploaderId,
      imageUrl,
      isApproved: false, // Default to false for admin approval
      status: 'available'
    });

    console.log("Creating item:", {
      title: newItem.title,
      points: newItem.points,
      uploader: newItem.uploader,
      imageUrl: newItem.imageUrl,
      tags: newItem.tags
    });

    const savedItem = await newItem.save();
    console.log("Item saved successfully:", savedItem._id);

    res.status(201).json({ 
      message: "Item added successfully and is pending approval", 
      item: {
        id: savedItem._id,
        title: savedItem.title,
        points: savedItem.points,
        status: savedItem.status,
        isApproved: savedItem.isApproved
      }
    });

  } catch (err) {
    console.error("=== ADD ITEM ERROR ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    // Handle specific MongoDB validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: "Validation error",
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Duplicate item detected"
      });
    }

    // Handle cast errors (invalid ObjectId, etc.)
    if (err.name === 'CastError') {
      return res.status(400).json({
        message: "Invalid data format"
      });
    }

    // Send detailed error info in development, generic in production
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({
        message: "Server error",
        error: err.message,
        stack: err.stack
      });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

// ✅ Get all approved items with uploader info
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.find({ isApproved: true, status: 'available' })
      .populate("uploader", "name email")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("Fetch items error:", err);
    res.status(500).json({ message: "Failed to fetch items" });
  }
};

// ✅ Get items uploaded by logged-in user
exports.getUserItems = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const items = await Item.find({ uploader: req.user.id })
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("Fetch user's items error:", err);
    res.status(500).json({ message: "Failed to fetch your items" });
  }
};

// ✅ Get unapproved items for admin
exports.getUnapprovedItems = async (req, res) => {
  try {
    const items = await Item.find({ isApproved: false })
      .populate("uploader", "name email")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("Fetch unapproved items error:", err);
    res.status(500).json({ message: "Failed to fetch unapproved items" });
  }
};

// ✅ Admin approve/reject item
exports.updateItemApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    item.isApproved = Boolean(approve);
    await item.save();

    res.json({ 
      message: approve ? "Item approved successfully" : "Item rejected successfully",
      item: {
        id: item._id,
        title: item.title,
        isApproved: item.isApproved
      }
    });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({ message: "Failed to update item approval status" });
  }
};

// ✅ Swap or Redeem Item (Buyer + Seller point logic)
exports.handleSwapOrRedeem = async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.user?.id;
    const { type } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.status !== "available") {
      return res.status(400).json({ message: "Item not available" });
    }

    if (!item.isApproved) {
      return res.status(400).json({ message: "Item not approved yet" });
    }

    // Prevent user from redeeming their own item
    if (item.uploader.toString() === userId) {
      return res.status(400).json({ message: "You cannot redeem your own item" });
    }

    const buyer = await User.findById(userId);
    const seller = await User.findById(item.uploader);

    if (!buyer || !seller) {
      return res.status(404).json({ message: "Buyer or seller not found" });
    }

    // 🔒 Only "redeem" logic allowed now
    if (type === "redeem") {
      const redeemCost = item.points || 0;

      if (buyer.points < redeemCost) {
        return res.status(400).json({ 
          message: `Not enough points to redeem. You have ${buyer.points} points, but need ${redeemCost} points.`
        });
      }

      // 💰 Transfer points
      buyer.points -= redeemCost;
      seller.points += redeemCost;

      // 📦 Update item status
      item.status = "redeemed";

      await Promise.all([
        item.save(),
        buyer.save(),
        seller.save()
      ]);

      // 📧 Notify seller via email
      try {
        await sendPurchaseEmailToSeller({
          sellerEmail: seller.email,
          sellerName: seller.name,
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          itemTitle: item.title,
          points: redeemCost,
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Don't fail the transaction if email fails
      }

      return res.status(200).json({
        message: "Item redeemed successfully",
        pointsDeducted: redeemCost,
        buyerPointsRemaining: buyer.points,
        sellerPointsTotal: seller.points,
      });
    }

    return res.status(400).json({ message: "Only redeem operation is allowed" });
  } catch (err) {
    console.error("Redeem error:", err);
    res.status(500).json({ message: "Redeem failed", error: err.message });
  }
};

const sendPurchaseEmailToSeller = async ({ sellerEmail, sellerName, buyerName, buyerEmail, itemTitle, points }) => {
  try {
    // ✅ Fixed: Use createTransport instead of createTransporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Rewear Team" <${process.env.EMAIL_USER}>`,
      to: sellerEmail,
      subject: `Your item "${itemTitle}" has been redeemed!`,
      html: `
        <h3>Hello ${sellerName},</h3>
        <p>Your item "<strong>${itemTitle}</strong>" has been successfully redeemed by <strong>${buyerName}</strong> (${buyerEmail}).</p>
        <p>You have received <strong>${points} points</strong> in your account.</p>
        <br/>
        <p>Thank you for using Rewear!</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${sellerEmail}`);
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};