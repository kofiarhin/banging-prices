const mongoose = require("mongoose");
const User = require("../models/user.model");

const postSignup = async (req, res, next) => {
  try {
    const { clerkId, firstName, lastName, email, imageUrl } = req.body;
    if (!clerkId) {
      throw new Error("clerkId is required");
    }

    const foundUser = await User.findOne({ clerkId });
    if (!foundUser) {
      const user = await User.create({
        clerkId,
        firstName,
        lastName,
        email,
        imageUrl,
      });
      console.log("user created");
      return res.status(201).json(user);
    }

    console.log("user details will be updated");
    return res.json(foundUser);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error.message });
  }
};

const postLogin = async (req, res, next) => {
  try {
    const { clerkId, firstName, lastName, email, imageUrl } = req.body;
    if (!clerkId) {
      throw new Error("clerkId is required");
    }

    //check if user is in the dataabse
    const foundUser = await User.findOne({ clerkId });
    if (!foundUser) {
      const user = await User.create({
        firstName,
        lastName,
        email,
        imageUrl,
      });
      return res.json(user);
    }

    console.log("user has been successfully logged in");
    return res.json(foundUser);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { postSignup, postLogin };
