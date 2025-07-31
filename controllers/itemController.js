const Item = require("../models/Item");
const User = require("../models/User");

// ✅ Add Item
exports.addItem = async (req, res) => {
  try {
    const {
      title, description, category, type, size, condition, tags,
    } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const newItem = new Item({
      title,
      description,
      category,
      type,
      size,
      condition,
      tags: tags?.split(",").map(tag => tag.trim()),
      imageUrl,
      uploader: req.user._id,
      isApproved: false,
    });

    await newItem.save();
    res.status(201).json({ message: "Item submitted for approval", item: newItem });
  } catch (err) {
    console.error("Add Item Error:", err);
    res.status(500).json({ message: "Failed to add item" });
  }
};

// ✅ Get all approved items with uploader info
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.find({ isApproved: true }).populate("uploader", "name email");
    res.json(items);
  } catch (err) {
    console.error("Fetch items error:", err);
    res.status(500).json({ message: "Failed to fetch items" });
  }
};

// ✅ Get items uploaded by logged-in user
exports.getUserItems = async (req, res) => {
  try {
    const items = await Item.find({ uploader: req.user._id });
    res.json(items);
  } catch (err) {
    console.error("Fetch user's items error:", err);
    res.status(500).json({ message: "Failed to fetch your items" });
  }
};

// ✅ Get unapproved items for admin
exports.getUnapprovedItems = async (req, res) => {
  try {
    const items = await Item.find({ isApproved: false }).populate("uploader", "name email");
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

    const item = await Item.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.isApproved = approve;
    await item.save();

    res.json({ message: approve ? "Item approved" : "Item rejected" });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({ message: "Failed to update item approval status" });
  }
};

// ✅ Swap or Redeem Item (Buyer + Seller point logic)
exports.handleSwapOrRedeem = async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.user.id;
    const { type } = req.body; // "swap" or "redeem"

    const item = await Item.findById(itemId);
    if (!item) return res.status(400).json({ message: "Item not found" });
    if (item.status !== "available") return res.status(400).json({ message: "Item not available" });
    if (!item.isApproved) return res.status(400).json({ message: "Item not approved" });

    const buyer = await User.findById(userId);
    const seller = await User.findById(item.uploader);

    if (!buyer || !seller) return res.status(404).json({ message: "Buyer or seller not found" });

    console.log("Buyer Points:", buyer.points);

    if (type === "swap") {
      buyer.points += 10;
      seller.points += 15;
      item.status = "swapped";
      await item.save();
      await buyer.save();
      await seller.save();
      return res.status(200).json({
        message: "Swap successful",
        buyerPoints: 10,
        sellerPoints: 15,
        buyerTotal: buyer.points,
        sellerId: seller._id,
      });
    }

    if (type === "redeem") {
      const redeemCost = 20;
      if (buyer.points < redeemCost) {
        return res.status(400).json({ message: "Not enough points to redeem" });
      }
      buyer.points -= redeemCost;
      item.status = "redeemed";
      await item.save();
      await buyer.save();
      return res.status(200).json({
        message: "Redeem successful",
        pointsDeducted: redeemCost,
        buyerTotal: buyer.points,
        sellerId: seller._id,
      });
    }

    return res.status(400).json({ message: "Invalid action type" });
  } catch (err) {
    console.error("Swap/Redeem error:", err);
    res.status(500).json({ message: "Swap/Redeem failed", error: err.message });
  }
};
