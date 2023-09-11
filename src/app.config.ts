import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import basicAuth from "express-basic-auth";

import { LocalRoom } from "./rooms/localRoom";
import { IngalsRoom } from "./rooms/ingalsRoom";
import { ValoriaRoom } from "./rooms/valoriaRoom";
import { PropHuntRoom } from "./rooms/prophuntRoom";

import { connect } from "./db/client";

import mainRouter from "./api";

const basicAuthMiddleware = basicAuth({
  // list of users and passwords
  users: {
    admin: process.env.ADMIN_PASS,
  },
  // sends WWW-Authenticate header, which will prompt the user to fill
  // credentials in
  challenge: true,
});

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define("local", LocalRoom);
    gameServer.define("valoria", ValoriaRoom);
    gameServer.define("prop_hunt", PropHuntRoom);
    gameServer.define("ingals_room", IngalsRoom);
  },

  initializeExpress: (app) => {
    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground);
    } else {
      app.get("/", (req, res) => {
        res.redirect(
          "https://github.com/0xSacul/sacul-community-island-server"
        );
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
