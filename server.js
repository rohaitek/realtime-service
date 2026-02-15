const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ✅ CORS recomendado (producción + dev)
// Si aún no tiene localhost en uso, puede quitarlo.
const allowedOrigins = [
  "https://cisasolutions.cloud",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: false, // póngalo true SOLO si usa cookies/sesión
  },
});

// ✅ helper para obtener tenantId de forma segura
function getTenantId(socket) {
  const raw = socket.handshake.auth?.tenantId;

  // acepta number o string numérica
  if (raw === undefined || raw === null) return null;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;

  return String(n); // lo dejamos como string para armar room estable
}

io.on("connection", (socket) => {
  const tenantId = getTenantId(socket);

  if (!tenantId) {
    console.log("cliente conectado SIN tenant", socket.id);
    // Si prefiere bloquear conexiones sin tenant, descomente:
    // socket.disconnect(true);
    // return;
  } else {
    const room = `tenant:${tenantId}`;
    socket.join(room);
    console.log("cliente conectado", socket.id, "→", room);
  }

  // ✅ evento de prueba: reenvía SOLO al tenant del emisor
  socket.on("test", (payload) => {
    const tId = getTenantId(socket);
    if (!tId) return;

    const room = `tenant:${tId}`;
    io.to(room).emit("test:echo", {
      from: socket.id,
      tenantId: tId,
      payload: payload ?? null,
      at: new Date().toISOString(),
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("cliente desconectado", socket.id, reason);
  });
});

app.get("/", (req, res) => {
  res.send("Realtime service running");
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
