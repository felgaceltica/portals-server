import { connect, isConnected, getDatabase } from "./client";

export const logVisit = async (scene: string, farmId: number) => {
  if (!isConnected()) {
    await connect();
  }

  const database = getDatabase();
  const collection = database.collection(scene);

  const existingFarm = await collection.findOne({ farmId });

  if (existingFarm) {
    await collection.updateOne({ farmId }, { $inc: { visitCount: 1 } });
  } else {
    await collection.insertOne({ farmId, visitCount: 1 });
  }
};
