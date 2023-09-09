import { connect, isConnected, getDatabase } from "./client";

import { getFarm } from "../web3/Alchemy";
import { getWalletAssets } from "../api/projectdignity";

export const logVisit = async (scene: string, farmId: number) => {
  if (!isConnected()) {
    await connect();
  }

  const database = getDatabase();
  const collection = database.collection(scene);

  const existingFarm = await collection.findOne({ farmId });

  const farm = await getFarm(farmId);

  if (existingFarm) {
    await collection.updateOne(
      { farmId },
      {
        $inc: { visitCount: 1 },
        $set: { wallet: farm.wallet_address, farm: farm.farm_address },
      }
    );
  } else {
    await collection.insertOne({
      farmId,
      visitCount: 1,
      wallet: farm.wallet_address,
      farm: farm.farm_address,
    });
  }

  if (scene === "projectdignity") populateProjectDignity(farmId);
};

const populateProjectDignity = async (farmId: number) => {
  if (!isConnected()) return;

  const database = getDatabase();
  const collection = database.collection("projectdignity");

  const existingFarm = await collection.findOne({ farmId });

  if (!existingFarm || !existingFarm.wallet) return;

  const data = await getWalletAssets(existingFarm.wallet);

  const allAssets = Object.values(data).flat();

  await collection.updateOne(
    { farmId },
    { $set: { assets: allAssets, quests: {} } }
  );
};
