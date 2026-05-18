const mongoose = require("mongoose");

const getMongoUri = () => {
  const uri = process.env.MONGO_URI?.trim();

  if (!uri) {
    throw new Error("Missing required environment variable MONGO_URI");
  }

  return uri;
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(getMongoUri(), {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    console.log(`connected to database ${conn.connection.host}`);
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
