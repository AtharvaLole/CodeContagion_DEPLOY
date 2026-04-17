import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initializeRealtimeServer } from "./realtime/misinfo-multiplayer.gateway.js";

const server = createServer(app);
initializeRealtimeServer(server);

server.listen(env.PORT, env.HOST, () => {
  console.log(
    `[codecontagion-backend] listening on http://${env.HOST}:${env.PORT} in ${env.NODE_ENV} mode`
  );
});
