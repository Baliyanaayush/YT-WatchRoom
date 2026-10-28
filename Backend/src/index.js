const express = require("express")
const http = require("http")
const cors = require("cors")
const { Server } = require("socket.io")

require("dotenv").config()
const router = require("../routes/healthRoutes")
const registerRoomSocket = require("../sockets/roomSockets")

const app = express();
const httpServer = http.createServer(app);

   app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
   )

  app.use(express.json());

         app.use("/", router);



         
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
})

    registerRoomSocket(io);

   const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`)
})