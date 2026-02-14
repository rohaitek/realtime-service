const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  },
});

io.on("connection", (socket) => {
  console.log("cliente conectado");

  socket.on("disconnect", () => {
    console.log("cliente desconectado");
  });
});

app.get("/", (req, res) => {
  res.send("Realtime service running");
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
