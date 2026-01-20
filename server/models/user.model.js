const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
    },
    firstName: String,
    imageUrl: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
