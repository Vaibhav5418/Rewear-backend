const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(cors({ origin: process.env.FRONTEND_URL }));


// ✅ Middleware
app.use(express.json());
app.use("/uploads", express.static("uploads")); // serves uploaded images

// ✅ Routes
app.get("/", (req, res) => res.send("ReWear API running..."));
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/users", userRoutes);

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running at ${BASE_URL.replace('/api', '')}`));
}).catch(err => console.error("❌ MongoDB connection error:", err));
