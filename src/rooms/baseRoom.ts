import { Room, Client } from "colyseus";
import {
  Action,
  Bud,
  Clothing,
  FactionName,
  InputData,
  Message,
  BaseRoomState,
  Player,
  Reaction,
  Trade,
} from "./state/base";
import { IncomingMessage } from "http";
import { Bumpkin } from "../types/bumpkin";

const MAX_MESSAGES = 100;

export class BaseRoom extends Room<BaseRoomState> {
  fixedTimeStep = 1000 / 60;

  // Safe limit of clients to avoid performance issues
  // Depending on your Portal and server specs, you can increase this number
  maxClients: number = 150;

  private pushMessage = (message: Message) => {
    this.state.messages.push(message);

    while (this.state.messages.length > MAX_MESSAGES) {
      this.state.messages.shift();
    }
  };

  private pushReaction = (reaction: Reaction) => {
    this.state.reactions.push(reaction);

    while (this.state.reactions.length > MAX_MESSAGES) {
      this.state.reactions.shift();
    }
  };

  private pushTrade = (trade: Trade) => {
    this.state.trades.push(trade);

    while (this.state.trades.length > MAX_MESSAGES) {
      this.state.trades.shift();
    }
  };

  private pushAction = (action: Action) => {
    this.state.actions.push(action);

    while (this.state.actions.length > 10) {
      this.state.actions.shift();
    }
  };

  // Farm ID > sessionId
  private farmConnections: Record<number, string> = {};

  // This method is called when the room is created
  onCreate(options: any) {
    this.setState(new BaseRoomState());

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
  }

  // This method is called every fixed time step (1000 / 60)
  fixedTick(timeStep: number) {
    const velocity = 1.68;

    this.state.players.forEach((player, key) => {
      let input: InputData | undefined;

      // dequeue player inputs.
      while ((input = player.inputQueue.shift())) {
        if (input.x || input.y) {
          player.x = input.x;
          player.y = input.y;

          // Check if they have moved away from their placeables
          const bud = this.state.buds.get(key);
          if (!!bud) {
            const distance = Math.sqrt(
              Math.pow(player.x - (bud.x ?? 0), 2) +
                Math.pow(player.y - (bud.y ?? 0), 2)
            );

            if (distance > 50) {
              this.state.buds.delete(key);
            }
          }
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
            beard: input.clothing.beard,
            shoes: input.clothing.shoes,
            tool: input.clothing.tool,
            background: input.clothing.background,
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
          message.username = player.username;
          message.sentAt = Date.now();
          this.pushMessage(message);
        }

        if (input.reaction) {
          const reaction = new Reaction();
          reaction.sceneId = player.sceneId;
          reaction.reaction = input.reaction;
          reaction.sessionId = key;
          reaction.farmId = player.farmId;
          reaction.sentAt = Date.now();
          this.pushReaction(reaction);
        }

        if (input.budId) {
          const bud = new Bud();
          bud.sceneId = player.sceneId;
          bud.x = player.x;
          bud.id = Number(input.budId);
          bud.y = player.y;
          bud.farmId = player.farmId;
          this.state.buds.set(key, bud);

          // Max time for a bud to show is 5 minutes
          setTimeout(() => this.state.buds.delete(key), 5 * 60 * 1000);
        }

        if (input.trade) {
          const trade = new Trade();
          trade.sceneId = player.sceneId;
          trade.tradeId = input.trade.tradeId;
          trade.text = "Trade bought";
          trade.buyerId = input.trade.buyerId;
          trade.sellerId = input.trade.sellerId;
          trade.boughtAt = Date.now();
          this.pushTrade(trade);
        }

        if (input.action) {
          const action = new Action();
          action.sceneId = player.sceneId;
          action.farmId = player.farmId;
          action.event = input.action;
          action.sentAt = Date.now();
          action.x = input.x;
          action.y = input.y;
          this.pushAction(action);
        }

        if (input.username) {
          player.username = input.username;
        }

        if (input.faction) {
          player.faction = input.faction;
        }
      }
    });
  }

  // This method is called when a client tries to join the room
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

  // This method is called when a client joins the room
  onJoin(
    client: Client,
    options: { x: number; y: number },
    auth: {
      bumpkin: Bumpkin;
      farmId: number;
      faction?: FactionName;
      sceneId: string;
      experience: number;
      username?: string;
      fingerprint: string;
    }
  ) {
    //
    const previousConnection = this.farmConnections[auth.farmId];
    if (previousConnection) {
      const client = this.clients.find(
        (client) => client.sessionId === previousConnection
      );

      if (
        client &&
        this.state.players.get(client.sessionId)?.sceneId === "corn_maze"
      ) {
        throw new Error("You are already connected");
      }

      client?.leave();
    }

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
    player.clothing.beard = clothing.beard;
    player.clothing.shoes = clothing.shoes;
    player.clothing.background = clothing.background;
    player.clothing.tool = clothing.tool;

    player.sceneId = auth.sceneId;
    player.username = auth.username;
    player.faction = auth.faction;

    this.state.players.set(client.sessionId, player);
  }

  // This method is called when a client leaves the room
  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
    this.state.buds.delete(client.sessionId);
  }

  // This method is called when the room is disposed
  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
