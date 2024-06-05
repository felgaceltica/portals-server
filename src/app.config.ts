import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import basicAuth from "express-basic-auth";

import { FarmerSoccerRoom } from "./rooms/farmerSoccerRoom";

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

    // Felga's Rooms
    gameServer.define("farmer_soccer", FarmerSoccerRoom);
  },

  initializeExpress: (app) => {
    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground);
    } else {
      app.get("/", (req, res) => {
        res.redirect("https://github.com/felgaceltica/portals-server");
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

});
