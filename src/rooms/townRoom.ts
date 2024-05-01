import { Room, Client } from "colyseus";
import { Clothing, InputData, Message, RoomState, Player } from "./state/town";
import { IncomingMessage } from "http";
import { Bumpkin } from "../types/bumpkin";
//import { logVisit } from "../db/logger";

const MAX_MESSAGES = 100;

export class TownRoom extends Room<RoomState> {
  fixedTimeStep = 1000 / 60;

  maxClients: number = 300;

  private pushMessage = (message: Message) => {
    this.state.messages.push(message);

    while (this.state.messages.length > MAX_MESSAGES) {
      this.state.messages.shift();
    }
  };

  // Farm ID > sessionId
  private farmConnections: Record<number, string> = {};

  onCreate(options: any) {
    this.setState(new RoomState());

    // set map dimensions
    (this.state.mapWidth = 600), (this.state.mapHeight = 600);

    this.onMessage(0, (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player?.inputQueue.push(input);
    });

    let elapsedTime = 0;
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });

    this.setMetadata({
      ownerId: options.farmId,
      name: "Test Island",
      description: "A test room for development.",
    });
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
          message.id = player.farmId;
          message.username = player.username;
          message.faction = player.faction;
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
      username: string;
      faction: string;
      bumpkin: Bumpkin;
      sceneId: string;
      experience: number;
    },
    request?: IncomingMessage | undefined
  ) {
    fetch(
      "https://discord.com/api/webhooks/1233563760321499206/IB-ecdkgt-cq_cFTjhHxUXsJG1X3k_RqZXW_z1u7ksv6J5oJKcAg7ri6qgnlmaqgMsn9",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `New player joined: ${JSON.stringify(request?.headers)}`,
        }),
      }
    );

    return {
      bumpkin: options.bumpkin,
      farmId: options.farmId,
      username: options.username,
      faction: options.faction,
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
      username: string;
      faction: string;
      sceneId: string;
      experience: number;
    }
  ) {
    //logVisit("town", auth.farmId);
    console.log("client joined", client.sessionId);

    this.farmConnections[auth.farmId] = client.sessionId;

    const player = new Player();
    player.x = options.x ?? 560; // Math.random() * this.state.mapWidth;
    player.y = options.y ?? 300; //Math.random() * this.state.mapHeight;
    player.farmId = auth.farmId;
    player.username = auth.username;
    player.faction = auth.faction;
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

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.log("client left", client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
