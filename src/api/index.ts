import { Router } from "express";
import { connect, isConnected, getDatabase } from "../db/client";

const mainRouter = Router();

mainRouter.get("/", (req, res) => {
  res.status(200).json({ message: "Hello world!" });
});

mainRouter.get("/stats/:roomId", async (req, res) => {
  const roomId = req.params.roomId;

  if (!roomId) {
    res.status(400).json({ status: "error", message: "missing room id" });
    return;
  } else if (
    roomId !== "valoria" &&
    roomId !== "prophunt" &&
    roomId !== "ingals"
  ) {
    res.status(400).json({ status: "error", message: "invalid room id" });
    return;
  }

  if (!isConnected()) {
    connect();
  }

  const database = getDatabase();
  const collection = database.collection(roomId);

  // retrieve all farmId and visitCount
  const documents = await collection.find({}).toArray();

  const stats = documents.map((doc) => {
    return {
      farmId: doc.farmId,
      visitCount: doc.visitCount,
    };
  });

  res.status(200).json({ status: "ok", stats });
});

export default mainRouter;
