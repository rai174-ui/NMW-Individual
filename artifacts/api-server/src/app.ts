import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "./lib/sqlite";
import { ObjectStorageService } from "./lib/objectStorage";
import { ObjectNotFoundError } from "./lib/objectStorage";
import { initAiTipsJob } from "./jobs/ai-tips";


const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Allow browser, Capacitor (Android/iOS), and dev origins
// Allow browser, Capacitor (Android/iOS), and dev origins
const ALLOWED_ORIGINS = [
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "https://nutrimyway.in",
  "https://healthlogix.nutrimyway.in",
  "https://nutrimyway-production.up.railway.app",
];

app.use(
    cors({
      origin: function (origin, cb) {
        // No origin = same-origin or server-to-server — allow
        if (!origin) return cb(null, true);

        // Allow exact matches from our list
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);

        // Allow any railway subdomain
        if (origin.endsWith(".up.railway.app")) return cb(null, true);

        // Allow local development ports (e.g., localhost:5173)
        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("https://localhost:") ||
          // Some Play Store builds change the origin to something like http://in.healthlogix.app
          // We don't want to wildcard allow everything, but since we are locking down by App ID
          origin.startsWith("http://in.healthlogix.app") ||
          origin.startsWith("https://in.healthlogix.app")
        ) {
          return cb(null, true);
        }

        cb(new Error(`CORS: origin not allowed — ${origin}`));
      },
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

// ── Static frontend serving ──────────────────────────────────────────────
// Railway runs this as a single service on one domain — there is no
// separate web server for static files, so this Express process must serve
// the built frontend(s) itself.
//
// Bundled layout (populated at deploy time, see `public/` next to index.mjs):
//   public/index.html, public/assets/*        → main frontend (served at "/")
//   public/admin/index.html, public/admin/*   → admin frontend (served at "/admin")
//
// ADMIN_STATIC can override the admin frontend location for local/ngrok dev.
const bundledPublicDir = path.resolve(__dirname, "public");
const adminStaticOverride = process.env.ADMIN_STATIC;
const adminDir = adminStaticOverride
  ? path.resolve(adminStaticOverride)
  : path.join(bundledPublicDir, "admin");

if (existsSync(adminDir)) {
  app.use("/admin", express.static(adminDir));
  // SPA fallback — all /admin/* routes serve index.html
  app.get("/admin/*splat", (_req, res) => {
    res.sendFile(path.join(adminDir, "index.html"));
  });
  logger.info({ adminDir }, "Serving admin static files");
} else if (adminStaticOverride) {
  logger.warn(
    { adminDir },
    "ADMIN_STATIC set but directory does not exist; skipping admin static serving",
  );
}

if (existsSync(bundledPublicDir)) {
  app.use(express.static(bundledPublicDir));
  // SPA fallback for the main frontend — must come last so it doesn't
  // shadow /api or /admin routes registered above.
  app.get("*splat", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/admin")) {
      next();
      return;
    }
    res.sendFile(path.join(bundledPublicDir, "index.html"));
  });
  logger.info({ bundledPublicDir }, "Serving main frontend static files");
}




// Start AI Tips cron job
initAiTipsJob();

export default app;
