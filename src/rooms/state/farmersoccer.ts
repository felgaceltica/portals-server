import { type, CollectionSchema} from "@colyseus/schema";
import { BaseRoomState } from "./base";

export class FarmerSoccerRoomState extends BaseRoomState {
  @type("number") scoreLeft?: number;
  @type("number") scoreRight?: number;

  @type("string") matchState?: string;
  @type({ collection: "string" }) leftTeam = new CollectionSchema<string>();
  @type({ collection: "string" }) rightTeam = new CollectionSchema<string>();

  @type({ collection: "string" }) leftQueue = new CollectionSchema<string>();
  @type({ collection: "string" }) rightQueue = new CollectionSchema<string>();
  
  //ball
  @type("number") ballPositionX?: number;
  @type("number") ballPositionY?: number;
  @type("number") ballVelocityX?: number;
  @type("number") ballVelocityY?: number;

  leftTeamConfirmed: boolean;
  rightTeamConfirmed: boolean;
}
