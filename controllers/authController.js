const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const transporter = require("../utils/mailer");

const otpMap = new Map(); // in-memory for demo (use DB in production)

// ✅ Send OTP to email
exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  
  // Validate email
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  otpMap.set(email, otp);

  try {
    // Check if email credentials are available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Missing email credentials in environment variables");
      return res.status(500).json({ 
        message: "Email service not configured. Please contact administrator." 
      });
    }

    const mailOptions = {
      from: `"Rewear" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP for Rewear Registration",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to Rewear!</h2>
          <p>Your OTP for registration is:</p>
          <h1 style="color: #4CAF50; font-size: 32px;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    
    // Set OTP expiration (10 minutes)
    setTimeout(() => {
      otpMap.delete(email);
    }, 10 * 60 * 1000);

    console.log(`OTP sent to ${email}: ${otp}`); // Remove in production
    res.json({ message: "OTP sent to email successfully" });
    
  } catch (err) {
    console.error("OTP send error:", err);
    
    // More specific error messages
    if (err.code === 'EAUTH') {
      return res.status(500).json({ 
        message: "Email authentication failed. Please check email configuration." 
      });
    }
    
    if (err.code === 'ENOTFOUND') {
      return res.status(500).json({ 
        message: "Email service unavailable. Please try again later." 
      });
    }
    
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
};

// ✅ Register user after OTP verification
exports.registerUser = async (req, res) => {
  const { name, email, password, otp } = req.body;

  // Validate required fields
  if (!name || !email || !password || !otp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const storedOtp = otpMap.get(email);
    if (!storedOtp || parseInt(otp) !== parseInt(storedOtp)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "user", // default role only
    });

    await newUser.save();
    otpMap.delete(email); // Remove OTP after use
    
    console.log(`User registered successfully: ${email}`);
    res.status(201).json({ message: "User registered successfully" });
    
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ✅ Login user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// ✅ Get logged-in user info
exports.getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error("Fetch user info error:", err);
    res.status(500).json({ message: "Server error" });
  }
};