import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Equipped } from "../../types/bumpkin";

export type FactionName =
  | "sunflorians"
  | "bumpkins"
  | "goblins"
  | "nightshades";

export interface InputData {
  x: number;
  y: number;
  tick: number;
  text: string;
  clothing: Equipped;
  sceneId: string;
  trade?: {
    buyerId: string;
    sellerId: string;
    tradeId: string;
  };
  reaction: string;
  action: string;
  username: string;
  faction?: FactionName;
  budId: number;
}

export class Clothing extends Schema {
  @type("string") body?: string;
  @type("string") shirt?: string;
  @type("string") pants?: string;
  @type("string") hat?: string;
  @type("string") suit?: string;
  @type("string") onesie?: string;
  @type("string") dress?: string;
  @type("string") hair?: string;
  @type("string") wings?: string;
  @type("string") beard?: string;
  @type("string") tool?: string;
  @type("string") background?: string;
  @type("string") shoes?: string;
  @type("number") updatedAt?: number;
}

export class Player extends Schema {
  @type("string") username?: string;
  @type("string") faction?: FactionName;
  @type("string") sceneId?: string;
  @type("number") farmId?: number;
  @type("number") experience?: number;
  @type("number") x?: number;
  @type("number") y?: number;
  @type("number") tick?: number;
  @type("string") npc?: string;

  @type(Clothing)
  clothing = new Clothing();

  inputQueue: InputData[] = [];
}

export class Bud extends Schema {
  @type("string") sceneId?: string;
  @type("number") farmId?: number;
  @type("number") x?: number;
  @type("number") y?: number;
  @type("number") id?: number;
}

export class Message extends Schema {
  @type("string") username?: string;
  @type("string") text?: string;
  @type("string") sessionId?: string;
  @type("number") farmId?: number;
  @type("number") sentAt?: number;
  @type("string") sceneId?: string;
}

export class Reaction extends Schema {
  @type("string") reaction?: string;
  @type("string") sessionId?: string;
  @type("number") farmId?: number;
  @type("number") sentAt?: number;
  @type("string") sceneId?: string;
}

export class Action extends Schema {
  @type("number") farmId?: number;
  @type("number") sentAt?: number;
  @type("string") sceneId?: string;
  @type("string") event?: string;
  @type("number") x?: number;
  @type("number") y?: number;
}

export class Trade extends Schema {
  @type("string") text?: string;
  @type("string") sellerId?: string;
  @type("number") createdAt?: number;
  @type("string") tradeId?: string;
  @type("string") buyerId?: string;
  @type("number") boughtAt?: number;
  @type("string") sceneId?: string;
}

export class BaseRoomState extends Schema {
  @type("number") mapWidth?: number;
  @type("number") mapHeight?: number;

  @type({ map: Player })
  players = new MapSchema<Player>();

  @type({ map: Bud })
  buds = new MapSchema<Bud>();

  @type({ array: Message })
  messages = new ArraySchema<Message>();

  @type({ array: Reaction })
  reactions = new ArraySchema<Reaction>();

  @type({ array: Trade })
  trades = new ArraySchema<Trade>();

  @type({ array: Action })
  actions = new ArraySchema<Action>();
}
