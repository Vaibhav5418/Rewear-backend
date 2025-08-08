const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  type: String,
  size: String,
  condition: String,
  tags: [String],
  imageUrl: String,
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  points: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "swapped", "pending", "redeemed"],
    default: "available",
  },
  isApproved: {
    type: Boolean,
    default: false, // Admin must approve before showing on Home
  },
}, { timestamps: true });

module.exports = mongoose.model("Item", itemSchema);
