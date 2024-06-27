import { Room, Client, Delayed } from "colyseus";
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
import { FarmerFootballRoomState } from "./state/farmerfootball";
import {  CollectionSchema} from "@colyseus/schema";
const MAX_MESSAGES = 100;

export class FarmerFootballRoom extends Room<FarmerFootballRoomState> {
  fixedTimeStep = 1000 / 60;
  public delayedInterval!: Delayed;
  countdown: number = 5;
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
    this.clock.start();
    this.setState(new FarmerFootballRoomState());

    // set map dimensions
    (this.state.mapWidth = 600), (this.state.mapHeight = 600);
 
    this.resetField();

    this.state.matchState = "waiting";
    this.state.leftTeam = new CollectionSchema<string>();
    this.state.rightTeam = new CollectionSchema<string>();
    this.state.leftQueue = new CollectionSchema<string>();
    this.state.rightQueue = new CollectionSchema<string>();

    this.onMessage(0, (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player?.inputQueue.push(input);
    });

    //bounce ball
    this.onMessage(1, (client, input) => {      
      //this.broadcast("ballPosition", input,{except: client});
      var opponentSessionId = "";
      if(this.state.rightTeam.has(client.sessionId)){
        opponentSessionId = this.state.leftTeam.at(0);
      }
      if(this.state.leftTeam.has(client.sessionId)){
        opponentSessionId = this.state.rightTeam.at(0);
      }
      const opponent = this.clients.find(
        (client) => client.sessionId === opponentSessionId
      );
      opponent.send("ballPosition", input);
      this.broadcast("ballPosition", input,{except: [client,opponent]});
      this.state.lastBallPositionId = client.sessionId;
    });
    
    //join Right Team
    this.onMessage(2, (client) => {
      this.state.rightQueue.add(client.sessionId);
    });

    //leave Right Team
    this.onMessage(3, (client) => {
      this.state.rightQueue.delete(client.sessionId);
      this.state.rightTeam.delete(client.sessionId);
    });
      
    //join Left ight Team
    this.onMessage(4, (client) => {
      this.state.leftQueue.add(client.sessionId);
    });
        
    //leave Left Team
    this.onMessage(5, (client) => {
          this.state.leftQueue.delete(client.sessionId);
          this.state.leftTeam.delete(client.sessionId);
    });

    //confirm Right Team
    this.onMessage(6, (client) => {
      this.state.rightTeamConfirmed = true;      
    });

    //confirm Left Team
    this.onMessage(7, (client) => {
      this.state.leftTeamConfirmed = true;      
    });

    //Left Goal
    this.onMessage(8, (client) => {
      if(this.state.lastBallPositionId == client.sessionId || this.state.lastBallPositionId == "server"){
        this.state.lastBallPositionId = "server1";
        this.state.scoreLeft += 1;
        this.checkFinishGame();
      }
    });

    //Right Goal
    this.onMessage(9, (client) => {
      if(this.state.lastBallPositionId == client.sessionId || this.state.lastBallPositionId == "server"){
        this.state.lastBallPositionId = "server1";
        this.state.scoreRight += 1;      
        this.checkFinishGame();
      }
    });

    //Ping
    this.onMessage("ping", (client, input) => {
      client.send("pingResponse", input);     
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
  checkFinishGame(){
    this.broadcast("goal");
    if(this.state.scoreLeft==2){
      this.state.matchState = "finished";
      this.broadcast("winner",{players: this.state.leftTeam, side:"left"});
      this.broadcast("loser",{players: this.state.rightTeam, side:"right"});
    }
    else if(this.state.scoreRight == 2){
      this.state.matchState = "finished";
      this.broadcast("winner",{players: this.state.rightTeam, side:"right"});
      this.broadcast("loser",{players: this.state.leftTeam, side:"left"});
    }
    else{
      this.clock.setTimeout(() => {
        this.kickOff();
      }, 3000);
    }
    if(this.state.matchState=="finished"){
      this.state.leftTeam.clear();
      this.state.rightTeam.clear();
      this.resetField();
      this.clock.setTimeout(() => {
        this.state.matchState = "waiting";
      }, 10000);
    }
  }
  resetBallPosition(){
    //set ball to the center of the field
    var input = {
      ballPositionX: 16 * 11,
      ballPositionY: 16 * 5,
      ballVelocityX: 0,
      ballVelocityY: 0,
    }
    this.broadcast("ballPosition", input);
    this.state.lastBallPositionId = "server";
  }
  resetField(){
    //Set score to zero
    (this.state.scoreLeft = 0), (this.state.scoreRight = 0);
    this.resetBallPosition();
  }
  kickOff(){
    this.state.matchState = "playing";
    var angle = (Math.floor(Math.random() * 360)) * (Math.PI/180);
    var velocityX = (60*Math.cos(angle));
    var velocityY = (60*Math.sin(angle));
    var input = {
      ballPositionX: 16 * 11,
      ballPositionY: 16 * 5,
      ballVelocityX: velocityX,
      ballVelocityY: velocityY,
    }
    this.broadcast("ballPosition", input);
    this.state.lastBallPositionId = "server";
    this.broadcast("whistle",1);
  }
  // This method is called every fixed time step (1000 / 60)
  fixedTick(timeStep: number) {
    const velocity = 1.68;
    if(this.state.leftTeam.size == 0 && this.state.leftQueue.size > 0){
      var first = this.state.leftQueue.at(0);
      this.state.leftTeamConfirmed = false
      this.state.leftTeam.add(first);
      this.state.leftQueue.delete(first);
    }
    if(this.state.rightTeam.size == 0 && this.state.rightQueue.size > 0){
      var first = this.state.rightQueue.at(0);
      this.state.rightTeamConfirmed = false;
      this.state.rightTeam.add(first);
      this.state.rightQueue.delete(first);
    }
    switch(this.state.matchState){
      case "playing":
        if(this.state.leftTeam.size == 0){
          if(this.state.leftTeam.size == 0){
            this.resetField();
            this.state.matchState="leftAbandon";
            this.state.leftTeamConfirmed = false;
            this.state.rightTeamConfirmed = false;
            this.clock.setTimeout(() => {
              this.state.matchState = "waiting";
            }, 10000);
            this.broadcast("abandon", "left");
          }
          if(this.state.rightTeam.size == 0){
            this.resetField();
            this.state.matchState="rightAbandon";
            this.state.leftTeamConfirmed = false;
            this.state.rightTeamConfirmed = false;
            this.clock.setTimeout(() => {
              this.state.matchState = "waiting";
            }, 10000);
            this.broadcast("abandon", "right");
          }
        }
        break;
      case "waiting":
          if(this.state.leftTeam.size == 1 && this.state.rightTeam.size == 1){
            this.state.leftTeamConfirmed = false;
            this.state.rightTeamConfirmed = false;
            this.state.matchState = "starting";
            this.state.confirmationTime = this.clock.currentTime;
          }
          break;
        case "starting":
          if(((this.clock.currentTime - this.state.confirmationTime) / 1000) > 30){
            if(this.state.leftTeamConfirmed == false){
              this.state.leftTeam.clear();
            }
            if(this.state.rightTeamConfirmed == false){
              this.state.rightTeam.clear();
            }
          }
          if(this.state.leftTeam.size == 0){
            this.resetField();
            this.state.matchState="leftAbandon";
            this.state.leftTeamConfirmed = false;
            this.state.rightTeamConfirmed = false;
            this.clock.setTimeout(() => {
              this.state.matchState = "waiting";
            }, 10000);
            this.broadcast("abandon", "left");
          }
          if(this.state.rightTeam.size == 0){
            this.resetField();
            this.state.matchState="rightAbandon";
            this.state.leftTeamConfirmed = false;
            this.state.rightTeamConfirmed = false;
            this.clock.setTimeout(() => {
              this.state.matchState = "waiting";
            }, 10000);
            this.broadcast("abandon", "right");
          }
          if(this.state.leftTeamConfirmed && this.state.rightTeamConfirmed){
            this.resetField();
            this.state.matchState = "counting";
            this.countdown = 6;
            this.delayedInterval = this.clock.setInterval(() => {
              this.countdown--;
              this.broadcast("countdown", this.countdown);
              if(this.countdown<0){
                this.delayedInterval.clear();
                this.kickOff();
              }
            }, 1000);
          }

          break;
    }
    if(this.state.leftTeam.size == 0 || this.state.rightTeam.size == 0){      
      this.resetField();
    }

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
        this.state.players.get(client.sessionId)?.sceneId === "farmer_football"
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
    if(this.state.matchState=="playing" || this.state.matchState=="counting"){      
      if(this.state.leftTeam.has(client.sessionId)){
        this.resetField();
        this.state.matchState="leftAbandon";
        this.clock.setTimeout(() => {
          this.state.matchState = "waiting";
        }, 10000);
        this.broadcast("abandon", "left");
      }
      if(this.state.rightTeam.has(client.sessionId)){
        this.resetField();
        this.state.matchState="rightAbandon";
        this.clock.setTimeout(() => {
          this.state.matchState = "waiting";
        }, 10000);
        this.broadcast("abandon", "right");
      }
    }
    this.state.players.delete(client.sessionId);
    this.state.buds.delete(client.sessionId);
    this.state.rightQueue.delete(client.sessionId);
    this.state.leftQueue.delete(client.sessionId);
    this.state.leftTeam.delete(client.sessionId);
    this.state.rightTeam.delete(client.sessionId);
    console.log('leave ' + client.sessionId);
  }

  // This method is called when the room is disposed
  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
