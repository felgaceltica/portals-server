import { Room, Client } from "colyseus";
import {
  Clothing,
  InputData,
  Message,
  RoomState,
  Player,
  GameState,
  GameEvent,
} from "./state/prophunt";
import { IncomingMessage } from "http";
import { Bumpkin } from "../types/bumpkin";
import { logVisit } from "../db/logger";

const MAX_MESSAGES = 100;
const MAX_EVENTS = 100;

export class PropHuntRoom extends Room<RoomState> {
  fixedTimeStep = 1000 / 60;

  maxClients: number = 150;

  private pushMessage = (message: Message) => {
    this.state.messages.push(message);

    while (this.state.messages.length > MAX_MESSAGES) {
      this.state.messages.shift();
    }
  };

  private pushGameEvent = (event: GameEvent) => {
    console.log("pushing game event", event);
    // send game event to all clients
    this.state.events.push(event);

    while (this.state.events.length > MAX_EVENTS) {
      this.state.events.shift();
    }
  };

  private pushGameState = (gameState: GameState) => {
    this.state.game = gameState;

    // send game state to all clients
    this.broadcast("game_state", gameState);
  };

  // Farm ID > sessionId
  private farmConnections: Record<number, string> = {};

  onCreate(options: any) {
    const roomState = new RoomState();

    // Pre-define Game State
    roomState.game.nextRoundMap = "island";
    roomState.game.nextRoundAt = Date.now() + 1000 * 60 * 5;
    roomState.game.roundStartedAt = 0;
    roomState.game.status = "waiting";

    this.setState(roomState);

    // set map dimensions
    (this.state.mapWidth = 600), (this.state.mapHeight = 600);

    this.onMessage(0, (client, input) => {
      console.log(client.auth);
      console.log(input);
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player?.inputQueue.push(input);
    });

    this.onMessage("player_transform", (client, input) => {
      console.log("player_transform", input);
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.prop = input.prop;
      }

      this.broadcast("player_transform", {
        sessionId: client.sessionId,
        prop: input.prop,
      });
    });

    let elapsedTime = 0;
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });

    const message = new Message();
    message.text = `Welcome to ${this.roomName.replace("_", " ")}.`;
    message.sentAt = Date.now();
    this.pushMessage(message);
  }

  fixedTick(timeStep: number) {
    const velocity = 1.68;

    this.state.players.forEach((player, key) => {
      let input: InputData | undefined;

      // dequeue player inputs.
      while ((input = player.inputQueue.shift())) {
        if (input.x || input.y) {
          player.x = input.x;
          player.y = input.y;
        }

        if (input.sceneId) {
          player.sceneId = input.sceneId;
        }

        if (input.clothing) {
          player.clothing = new Clothing({
            body: input.clothing.body,
            shirt: input.clothing.shirt,
            pants: input.clothing.pants,
            onesie: input.clothing.onesie,
            wings: input.clothing.wings,
            suit: input.clothing.suit,
            dress: input.clothing.dress,
            hat: input.clothing.hat,
            hair: input.clothing.hair,
            updatedAt: Date.now(),
          });
        }

        player.tick = input.tick;

        if (input.text) {
          const message = new Message();
          message.sceneId = player.sceneId;
          message.text = input.text;
          message.sessionId = key;
          message.farmId = player.farmId;
          message.sentAt = Date.now();
          this.pushMessage(message);
        }
      }
    });
  }

  async onAuth(
    client: Client<any>,
    options: {
      jwt: string;
      farmId: number;
      bumpkin: Bumpkin;
      sceneId: string;
      experience: number;
    },
    request?: IncomingMessage | undefined
  ) {
    return {
      bumpkin: options.bumpkin,
      farmId: options.farmId,
      sceneId: options.sceneId,
      experience: options.experience,
    };
  }

  onJoin(
    client: Client,
    options: { x: number; y: number },
    auth: {
      bumpkin: Bumpkin;
      farmId: number;
      sceneId: string;
      experience: number;
    }
  ) {
    logVisit("prophunt", auth.farmId);

    this.farmConnections[auth.farmId] = client.sessionId;

    const player = new Player();
    player.x = options.x ?? 560; // Math.random() * this.state.mapWidth;
    player.y = options.y ?? 300; //Math.random() * this.state.mapHeight;
    player.farmId = auth.farmId;
    player.experience = auth.experience ?? 0;

    const clothing = auth.bumpkin.equipped;
    player.clothing.body = clothing.body;
    player.clothing.shirt = clothing.shirt;
    player.clothing.pants = clothing.pants;
    player.clothing.onesie = clothing.onesie;
    player.clothing.suit = clothing.suit;
    player.clothing.dress = clothing.dress;
    player.clothing.hat = clothing.hat;
    player.clothing.hair = clothing.hair;
    player.clothing.wings = clothing.wings;

    player.sceneId = auth.sceneId;

    // Game Specific State
    player.team = "neutral";
    player.prop = "none";
    player.health = 100;
    player.status = "alive";

    this.state.players.set(client.sessionId, player);
    this.pushGameState(this.state.game);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
