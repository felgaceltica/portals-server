const PD_API_URL = process.env.PD_API_URL;
const PD_API_KEY = process.env.PD_API_KEY;

export const getWalletAssets = async (address: string) => {
  const response = await fetch(`${PD_API_URL}/api/public/state`, {
    method: "POST",
    body: JSON.stringify({
      address,
      apiKey: PD_API_KEY,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status !== 200) return [];

  const json = await response.json();

  if (!json.assets) return [];

  const assets = Object.values(json.assets).flat();
  const cleanAssets = assets.map((asset: any) => {
    const assetMetadata = asset.metadata;

    let rarity = "Mythic";

    if (assetMetadata.attributes) {
      rarity = assetMetadata.attributes.find(
        (attr: any) => attr.trait_type === "Computed Rarity"
      ).value as string;
    }

    return {
      creatureType: asset.creatureType,
      assetId: asset.assetId,
      status: asset.status,
      startedAt: asset.startedAt || asset.updatedAt || 0,
      name: assetMetadata.name,
      image: assetMetadata.image,
      pixel_image: assetMetadata.pixel_image,
      rarity: rarity || "unknown",
    };
  });

  return cleanAssets;
};
