require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  password: { type: String, required: true, minlength: 6, maxlength: 200 },
  firstname: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  lastname: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
});

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balance: { type: Number, required: true },
});

const transactionSchema = new mongoose.Schema({
  senderUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  receiverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  amount: { type: Number, required: true },

  timestamp: { type: Date, default: Date.now },
});

const Account = mongoose.model("Account", accountSchema);
const User = mongoose.model("User", userSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = {
  User,
  Account,
  Transaction,
};
