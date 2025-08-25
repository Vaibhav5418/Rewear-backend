const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

// CORS: allow configured frontend, otherwise default to all in development
app.use(cors({ origin: FRONTEND_URL || '*', credentials: true }));


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
  const displayUrl = BASE_URL ? BASE_URL.replace('/api', '') : `http://localhost:${PORT}`;
  app.listen(PORT, () => console.log(`🚀 Server running at ${displayUrl}`));
}).catch(err => console.error("❌ MongoDB connection error:", err));
