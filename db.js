import { type } from "os";

const mongoose = require("mongoose");

mongoose.connect(
  "mongodb+srv://admin:9YT6XYXUB3qRsMCK@cluster0.85lcr.mongodb.net/paytm"
);

const userSchema = new mongoose.Schema({
  username: {
    type: string,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  password: { type: string, required: true, minlength: 6, maxlength: 20 },
  firstname: {
    type: string,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  lastname: {
    type: string,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
};
