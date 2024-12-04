// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const supabase = require("../utils/supabase");
// const sendOTP = require("../utils/email");

// // const register = async (req, res) => {
// //   const { fullName, email, password, role, phone, bio } = req.body;
// //   const hashedPassword = await bcrypt.hash(password, 10);
// //   const otp = Math.floor(100000 + Math.random() * 900000);

// //   const { error } = await supabase
// //     .from("users")
// //     .insert([{ fullName, email, password: hashedPassword, role, phone, bio, otp }]);

// //   if (error) return res.status(400).json({ error: error.message });

// //   await sendOTP(email, otp);
// //   res.status(200).json({ message: "OTP sent to email" });
// // };

// // const verifyOTP = async (req, res) => {
// //   const { email, otp } = req.body;

// //   const { data, error } = await supabase
// //     .from("users")
// //     .select("*")
// //     .eq("email", email)
// //     .eq("otp", otp)
// //     .single();

// //   if (error || !data) return res.status(400).json({ error: "Invalid OTP" });

// //   await supabase.from("users").update({ otp: null }).eq("email", email);
// //   res.status(200).json({ message: "Account activated" });
// // };

// // Kode Solve
// const register = async (req, res) => {
//   const { fullname, email, password, role, phone, bio } = req.body; // Gunakan "fullname"
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const otp = Math.floor(100000 + Math.random() * 900000);

//   const { error } = await supabase
//     .from("users")
//     .insert([
//       { fullname, email, password: hashedPassword, role, phone, bio, otp },
//     ]);

//   if (error) return res.status(400).json({ error: error.message });

//   await sendOTP(email, otp);
//   res.status(200).json({ message: "OTP sent to email" });
// };

// const verifyOTP = async (req, res) => {
//   const { email, otp } = req.body;

//   const { data, error } = await supabase
//     .from("users")
//     .select("*")
//     .eq("email", email)
//     .eq("otp", otp)
//     .single();

//   if (error || !data) return res.status(400).json({ error: "Invalid OTP" });

//   await supabase
//     .from("users")
//     .update({ otp: null, isActive: true }) // Mark account as active
//     .eq("email", email);

//   res.status(200).json({ message: "Account activated" });
// };

// const login = async (req, res) => {
//   const { email, password } = req.body;

//   const { data, error } = await supabase
//     .from("users")
//     .select("*")
//     .eq("email", email)
//     .single();

//   if (error || !data)
//     return res.status(400).json({ error: "Invalid email or password" });

//   const isValid = await bcrypt.compare(password, data.password);
//   if (!isValid)
//     return res.status(400).json({ error: "Invalid email or password" });

//   const token = jwt.sign(
//     { id: data.id, role: data.role },
//     process.env.JWT_SECRET,
//     {
//       expiresIn: "1h",
//     }
//   );

//   res.status(200).json({ token });
// };

// module.exports = { register, verifyOTP, login };

//  Coba

// authController.js
// authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../utils/supabase");
const sendOTP = require("../utils/email");
const multer = require("multer");
const path = require("path");

// Konfigurasi Multer untuk upload gambar
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
}).single("image");

const register = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const { fullname, email, password, role, phone, bio } = req.body;

      // Validation role
      if (role !== "user" && role !== "admin") {
        return res.status(400).json({ error: "Invalid role specified" });
      }

      // Memeriksa apakah email sudah terdaftar
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000);
      // OTP akan berlaku selama 3 minutes
      const otpExpiry = new Date(Date.now() + 3 * 60 * 1000);

      const imageUrl = req.file
        ? `/uploads/${req.file.filename}`
        : req.body.imageUrl || null;

      const { error } = await supabase.from("users").insert([
        {
          fullname,
          email,
          password: hashedPassword,
          role,
          phone,
          bio,
          otp,
          otpExpiry,
          imageUrl,
          isActive: false,
        },
      ]);

      if (error) return res.status(400).json({ error: error.message });

      await sendOTP(email, otp);
      res.status(200).json({ message: "OTP sent to email" });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("otp", otp)
    .single();

  if (error || !data) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  // Memeriksa apakah OTP sudah kadaluarsa
  if (new Date() > new Date(data.otpExpiry)) {
    return res.status(400).json({ error: "OTP has expired" });
  }

  await supabase
    .from("users")
    .update({
      otp: null,
      otpExpiry: null,
      isActive: true,
    })
    .eq("email", email);

  res.status(200).json({ message: "Account activated" });
};

// const login = async (req, res) => {
//   const { email, password } = req.body;

//   const { data, error } = await supabase
//     .from("users")
//     .select("*")
//     .eq("email", email)
//     .single();

//   if (error || !data) {
//     return res.status(400).json({ error: "Invalid email or password" });
//   }

//   if (!data.isActive) {
//     return res.status(400).json({ error: "Account not activated" });
//   }

//   const isValid = await bcrypt.compare(password, data.password);
//   if (!isValid) {
//     return res.status(400).json({ error: "Invalid email or password" });
//   }

//   const token = jwt.sign(
//     {
//       id: data.id,
//       role: data.role,
//       email: data.email,
//     },
//     process.env.JWT_SECRET,
//     { expiresIn: "1h" }
//   );

//   res.status(200).json({ token, userId: data.id, role: data.role });
// };

const login = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  if (!data.isActive) {
    return res.status(400).json({ error: "Account not activated" });
  }

  const isValid = await bcrypt.compare(password, data.password);
  if (!isValid) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  // Mengupdate status user
  await supabase.from("user_status").upsert({
    userId: data.id,
    status: "online",
    lastSeen: new Date().toISOString(),
  });

  const token = jwt.sign(
    { id: data.id, role: data.role, email: data.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.status(200).json({ token, userId: data.id, role: data.role });
};

const logout = async (req, res) => {
  const { id } = req.user;

  // Mengupdate status user ke offline
  await supabase.from("user_status").upsert({
    userId: id,
    status: "offline",
    lastSeen: new Date().toISOString(),
  });

  res.status(200).json({ message: "User logged out successfully" });
};

module.exports = { register, verifyOTP, login, logout };