import {
  Schema,
  Context,
  type,
  MapSchema,
  ArraySchema,
  filterChildren,
} from "@colyseus/schema";
import { Equipped } from "../../types/bumpkin";

export interface InputData {
  x: number;
  y: number;
  tick: number;
  text: string;
  clothing: Equipped;
  sceneId: string;
  trade?: {
    buyerId: number;
    sellerId: number;
    tradeId: string;
  };
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
  @type("number") updatedAt?: number;
}

export class Player extends Schema {
  @type("string") sceneId?: string;
  @type("number") farmId?: number;
  @type("string") username?: string;
  @type("string") faction?: string;
  @type("number") experience?: number;
  @type("number") x?: number;
  @type("number") y?: number;
  @type("number") tick?: number;
  @type("string") npc?: string;

  @type(Clothing)
  clothing = new Clothing();

  inputQueue: InputData[] = [];
}

export class Message extends Schema {
  @type("string") text?: string;
  @type("string") sessionId?: string;
  @type("number") id?: number;
  @type("string") username?: string;
  @type("string") faction?: string;
  @type("number") sentAt?: number;
  @type("string") sceneId?: string;
}

export class Objects extends Schema {
  @type("string") name: string;
  @type("number") x: number;
  @type("number") y: number;
}

export class RoomState extends Schema {
  @type("number") mapWidth?: number;
  @type("number") mapHeight?: number;

  @type({ map: Player })
  players = new MapSchema<Player>();

  @type({ array: Message })
  messages = new ArraySchema<Message>();

  @type({ array: Objects })
  objects = new ArraySchema<Objects>();
}
