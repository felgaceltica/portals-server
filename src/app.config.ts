import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import basicAuth from "express-basic-auth";

import { PropHuntRoom } from "./rooms/prophuntRoom";
import { ValoriaRoom } from "./rooms/valoriaRoom";

import { connect } from "./db/client";

import mainRouter from "./api";
import { BaseRoom } from "./rooms/baseRoom";

const basicAuthMiddleware = basicAuth({
  users: {
    admin: process.env.ADMIN_PASS,
  },
  challenge: true,
});

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define("local", BaseRoom);

    // Sacul's Rooms
    gameServer.define("prophunt", PropHuntRoom);
    gameServer.define("valoria", ValoriaRoom);

    // Community Rooms
    gameServer.define("poker-house", BaseRoom);
  },

  initializeExpress: (app) => {
    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground);
    } else {
      app.get("/", (req, res) => {
        res.redirect("https://github.com/0xSacul/sacul-portals-server");
      });
    }

    app.use(
      "/admin",
      basicAuthMiddleware,
      monitor({
        columns: ["roomId", "name", "clients", "elapsedTime"],
      })
    );

    app.use("/api", mainRouter);
  },

  beforeListen: () => {
    connect();
  },
});
