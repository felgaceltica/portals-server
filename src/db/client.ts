import mongoose from "mongoose";

export const connect = async () => {
  const uri = process.env.MONGO_URL || "";
  await mongoose
    .connect(uri, {
      dbName: process.env.DB_NAME || "test",
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(err));
};

export const disconnect = async () => {
  await mongoose.disconnect();
};

export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getDatabase = () => {
  return mongoose.connection.db;
};
