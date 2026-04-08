import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import gameRoutes from "./routes/gameRoutes.js";

const app = new Hono();

// CORS
app.use("/*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (c.req.method === "OPTIONS") return c.text("", 200);
  await next();
});

// Logger
app.use("*", async (_c, next) => {
  await next();
});

// REST routes
app.route("/api", gameRoutes);

// Health check
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString(), database: "connected" }),
);

// Static files (production)
app.use("/*", serveStatic({ root: "./public" }));

export { app };
