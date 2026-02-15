const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json()); // 👈 necesario para leer el body del broadcast

const server = http.createServer(app);

// 🔐 mismo secret que puso en WAUW
const BROADCAST_SECRET = process.env.REALTIME_BROADCAST_SECRET || "";

// CORS (puede ajustar luego)
const io = new Server(server, {
  cors: {
    origin: [
      "https://cisasolutions.cloud",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "POST"],
    credentials: false,
  },
});

// helper para tenant
function getTenantId(socket) {
  const raw = socket.handshake.auth?.tenantId;
  if (!raw) return null;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;

  return String(n);
}

// 🧠 conexión socket
io.on("connection", (socket) => {
  const tenantId = getTenantId(socket);

  if (tenantId) {
    const room = `tenant:${tenantId}`;
    socket.join(room);
    console.log("cliente conectado", socket.id, "→", room);
  } else {
    console.log("cliente conectado SIN tenant", socket.id);
  }

  socket.on("disconnect", (reason) => {
    console.log("cliente desconectado", socket.id, reason);
  });
});

// 📡 endpoint para que WAUW dispare eventos
app.post("/api/broadcast", (req, res) => {
  if (!BROADCAST_SECRET || req.body?.secret !== BROADCAST_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { tenantId, event, payload } = req.body || {};

  if (!tenantId || !event) {
    return res
      .status(400)
      .json({ error: "tenantId and event required" });
  }

  const room = `tenant:${String(tenantId)}`;

  console.log("📣 broadcast →", room, event);

  io.to(room).emit(event, payload ?? {});

  res.json({ ok: true });
});

// health check
app.get("/", (req, res) => {
  res.send("Realtime service running");
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
