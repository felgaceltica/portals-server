import { type} from "@colyseus/schema";
import { BaseRoomState } from "./base";

export class FarmerSoccerRoomState extends BaseRoomState {
  @type("number") scoreLeft?: number;
  @type("number") scoreRight?: number;

  //ball
  @type("number") ballPositionX?: number;
  @type("number") ballPositionY?: number;
  @type("number") ballVelocityX?: number;
  @type("number") ballVelocityY?: number;
}
