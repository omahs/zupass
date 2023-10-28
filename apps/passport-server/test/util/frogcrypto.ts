import { FrogCryptoFrogData } from "@pcd/passport-interface/src/FrogCrypto";
import { v4 as uuid } from "uuid";

export const testFrogs: FrogCryptoFrogData[] = [
  {
    id: 1,
    uuid: uuid(),
    name: "Frog 1",
    description: "A frog",
    biome: "Jungle",
    rarity: "common",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 2,
    uuid: uuid(),
    name: "Frog 2",
    description: "A frog",
    biome: "Desert",
    rarity: "common",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 3,
    uuid: uuid(),
    name: "Frog 2",
    description: "A frog",
    biome: "Jungle",
    rarity: "common",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  }
];
