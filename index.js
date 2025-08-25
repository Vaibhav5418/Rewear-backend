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

// CORS: allowlist support (comma-separated env FRONTEND_URLS or single FRONTEND_URL)
const ALLOWED_ORIGINS = (process.env.FRONTEND_URLS || FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser or same-origin requests (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.length === 0) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));


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
