import { type, CollectionSchema} from "@colyseus/schema";
import { BaseRoomState } from "./base";

export class FarmerFootballRoomState extends BaseRoomState {
  @type("number") scoreLeft?: number;
  @type("number") scoreRight?: number;

  @type("string") matchState?: string;
  @type({ collection: "string" }) leftTeam = new CollectionSchema<string>();
  @type({ collection: "string" }) rightTeam = new CollectionSchema<string>();

  @type({ collection: "string" }) leftQueue = new CollectionSchema<string>();
  @type({ collection: "string" }) rightQueue = new CollectionSchema<string>();

  @type("number") currentTime?: number;

  @type("number") ballChanged?: number;
  @type("number") ballX?: number;
  @type("number") ballY?: number;
  @type("number") ballVX?: number;
  @type("number") ballVY?: number;
  
  leftTeamConfirmed: boolean;
  rightTeamConfirmed: boolean;

  lastBallPositionId: string;

  confirmationTime: number;
}
