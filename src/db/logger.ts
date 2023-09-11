import { connect, isConnected, getDatabase } from "./client";

import { getFarm } from "../web3/Alchemy";
import { getWalletAssets } from "../api/projectdignity";

export const logVisit = async (scene: string, farmId: number) => {
  if (!isConnected()) await connect();

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
      quests: {
        season_1: {},
        season_2: {},
      },
      assets: [],
      canAccess: true,
    });
  }

  if (scene === "valoria") populateValoria(farmId);
};

const populateValoria = async (farmId: number) => {
  if (!isConnected()) await connect();

  const database = getDatabase();
  const collection = database.collection("valoria");

  const existingFarm = await collection.findOne({ farmId });

  if (!existingFarm || !existingFarm.wallet) return;

  const data = await getWalletAssets(existingFarm.wallet);

  const allAssets = Object.values(data).flat();

  const quests = {
    season_1: existingFarm.quests.season_1 || {},
    season_2: existingFarm.quests.season_2 || {},
  };

  await collection.updateOne(
    { farmId },
    {
      $set: {
        assets: allAssets,
        quests: quests,
        canAccess: existingFarm.canAccess || true,
      },
    }
  );
};
