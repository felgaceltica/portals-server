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

export type GameProps =
  | "wooden_box" // done
  | "wooden_seat" // done
  | "rock" // done
  | "bush" // done
  | "tree" // done
  | "none";

export type GamePropsHealth = {
  wooden_box: 100;
  wooden_seat: 70;
  rock: 20;
  bush: 50;
  tree: 100;
  none: 100;
};

export type GameMap = "island" | "woods" | "farm";

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
  @type("number") experience?: number;
  @type("number") x?: number;
  @type("number") y?: number;
  @type("number") tick?: number;
  @type("string") npc?: string;

  // Game Type Specific
  @type("string") team?: "red" | "blue" | "neutral" = "neutral";
  @type("string") prop?: GameProps = "none";
  @type("number") health?: number = 100;
  @type("string") status?: "alive" | "dead" = "alive";

  @type(Clothing)
  clothing = new Clothing();

  inputQueue: InputData[] = [];
}

export class Message extends Schema {
  @type("string") text?: string;
  @type("string") sessionId?: string;
  @type("number") farmId?: number;
  @type("number") sentAt?: number;
  @type("string") sceneId?: string;
}

export class Trade extends Schema {
  @type("string") text?: string;
  @type("number") sellerId?: number;
  @type("number") createdAt?: number;
  @type("string") tradeId?: string;
  @type("number") buyerId?: number;
  @type("number") boughtAt?: number;
  @type("string") sceneId?: string;
}

export class GameState extends Schema {
  @type("string") nextRoundMap?: string = "island";
  @type("number") nextRoundAt?: number;
  @type("number") roundStartedAt?: number;

  @type("string") status?: "waiting" | "playing" | "round_over" = "waiting";
}

export class GameEvent extends Schema {
  @type("string") type?: string;
  @type("number") createdAt?: number;
}

export class RoomState extends Schema {
  @type("number") mapWidth?: number;
  @type("number") mapHeight?: number;

  @type({ map: Player })
  players = new MapSchema<Player>();

  @type({ array: Message })
  messages = new ArraySchema<Message>();

  @type({ array: Trade })
  trades = new ArraySchema<Trade>();

  @type(GameState)
  game = new GameState();

  @type({ array: GameEvent })
  events = new ArraySchema<GameEvent>();
}
