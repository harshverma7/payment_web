const express = require("express");
const zod = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

const { User } = require("../db");
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("../middlewares/authmiddleware");

const updateUserBody = zod.object({
  password: zod.string().optional(),
  firstname: zod.string().optional(),
  lastname: zod.string().optional(),
});

const signupBody = zod.object({
  username: zod.string().email(),
  password: zod
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
  firstname: zod.string().min(1, "First name is required"),
  lastname: zod.string().min(1, "Last name is required"),
});

const signinBody = zod.object({
  username: zod.string().email(),
  password: zod.string().min(1, "Password is required"),
});

const generateToken = (userId) => {
  const token = jwt.sign({ userId }, JWT_SECRET);
  return token;
};

const hashPassword = (password) => {
  return bcrypt.hash(password, 10);
};

router.post("/Signup", async (req, res) => {
  try {
    const result = signupBody.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid inputs",
        errors: result.error.issues,
      });
    }

    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPasswordValue = await hashPassword(req.body.password);

    const user = await User.create({
      username: req.body.username,
      password: hashedPasswordValue,
      firstname: req.body.firstname.trim(),
      lastname: req.body.lastname.trim(),
    });

    const token = generateToken(user._id);
    res.status(201).json({ message: "Signup successful", token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "An error occurred during signup" });
  }
});

router.post("/Signin", async (req, res) => {
  try {
    const result = signinBody.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.json({ message: "Signin successful", token });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "An error occurred during signin" });
  }
});

router.put("/Update", authMiddleware, async (req, res) => {
  try {
    const result = updateUserBody.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid inputs",
        errors: result.error.issues,
      });
    }

    const updateData = {};
    if (result.data.password) {
      updateData.password = await hashPassword(result.data.password);
    }
    if (result.data.firstname) {
      updateData.firstname = result.data.firstname.trim();
    }
    if (result.data.lastname) {
      updateData.lastname = result.data.lastname.trim();
    }

    const updateResult = await User.updateOne(
      { _id: req.userId },
      { $set: updateData }
    );

    if (updateResult.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "User not found or no changes made" });
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "An error occurred during update" });
  }
});

router.get("/bulk", async (req, res) => {
  const filter = req.query.filter || "";

  const users = await User.find({
    $or: [
      {
        firstname: { $regex: filter },
      },
      {
        lastname: { $regex: filter },
      },
    ],
  });

  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      _id: user._id,
    })),
  });
});

module.exports = router;
