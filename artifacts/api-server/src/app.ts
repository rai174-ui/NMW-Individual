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


// ── Photo cleanup scheduler ─────────────────────────────────────────────

/** Run every hour and delete meal photos older than each center's retention setting. */
export function startPhotoCleanupScheduler(): void {
  const objectStorageService = new ObjectStorageService();

  async function tick() {
    try {
      const { rows: centers } = await pool.query(
        `SELECT id, photo_retention_days FROM centers WHERE photo_retention_days IS NOT NULL`,
      );
      for (const c of centers as Array<{
        id: string;
        photo_retention_days: number;
      }>) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - c.photo_retention_days);
        const { rows: expired } = await pool.query(
          `SELECT id, photo_url
           FROM consumption_logs
           WHERE photo_url IS NOT NULL
             AND photo_uploaded_at IS NOT NULL
             AND photo_uploaded_at < $1
             AND EXISTS (
               SELECT 1 FROM member_center_mapping mcm
               WHERE mcm.member_id = consumption_logs.member_id
                 AND mcm.center_id = $2
             )`,
          [cutoff.toISOString(), c.id],
        );
        const ids: number[] = [];
        for (const row of expired as Array<{ id: number; photo_url: string }>) {
          try {
            await objectStorageService.deleteObjectEntity(row.photo_url);
            logger.info(
              { logId: row.id, photo_url: row.photo_url },
              "Deleted expired meal photo",
            );
          } catch (err) {
            if (err instanceof ObjectNotFoundError) {
              logger.info(
                { logId: row.id },
                "Photo already missing in object storage, clearing DB reference",
              );
            } else {
              logger.error(
                { err, logId: row.id },
                "Failed to delete expired meal photo, skipping",
              );
              continue;
            }
          }
          ids.push(row.id);
        }
        if (ids.length > 0) {
          await pool.query(
            `UPDATE consumption_logs SET photo_url = NULL, photo_uploaded_at = NULL WHERE id = ANY($1)`,
            [ids],
          );
        }
      }
    } catch (err) {
      logger.error({ err }, "Photo cleanup tick failed");
    }
  }

  // Run every hour
  tick();
  setInterval(tick, 60 * 60_000);
  logger.info("Photo cleanup scheduler started (checking every hour)");
}

// Start AI Tips cron job
initAiTipsJob();

export default app;
