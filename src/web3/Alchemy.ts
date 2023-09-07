import Web3 from "web3";
import { FarmABI } from "./FarmABI";

const web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://polygon-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY
  )
);

const FarmContract = "0x2b4a66557a79263275826ad31a4cddc2789334bd";

export async function getFarm(farm_id: number) {
  if (!farm_id) return { error: "Invalid farm id" };

  const farm_contract = new web3.eth.Contract(FarmABI, FarmContract);

  let farm = await (farm_contract as any).methods.getFarm(farm_id).call();

  return {
    farm_id: farm[2],
    farm_address: farm[1],
    wallet_address: farm[0],
  };
}
