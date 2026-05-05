import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

function buildCorsOptions(): CorsOptions | undefined {
  if (process.env["NODE_ENV"] !== "production") {
    return undefined;
  }

  const allowed = new Set<string>();
  const addOrigin = (host: string) => {
    const trimmed = host.trim();
    if (!trimmed) return;
    if (/^https?:\/\//i.test(trimmed)) {
      allowed.add(trimmed.replace(/\/$/, ""));
    } else {
      allowed.add(`https://${trimmed}`);
    }
  };

  for (const host of (process.env["REPLIT_DOMAINS"] ?? "").split(",")) {
    addOrigin(host);
  }
  for (const host of (process.env["ALLOWED_ORIGINS"] ?? "").split(",")) {
    addOrigin(host);
  }

  const allowList = [...allowed];
  logger.info({ allowList }, "CORS allow-list configured");

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowList.includes(origin)) return callback(null, true);
      logger.warn({ origin }, "Blocked CORS request from disallowed origin");
      return callback(null, false);
    },
    credentials: true,
  };
}

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
const corsOptions = buildCorsOptions();
app.use(corsOptions ? cors(corsOptions) : cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env["NODE_ENV"] === "production") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const staticDir = path.resolve(here, "../../scianalyst/dist/public");
  const indexHtml = path.join(staticDir, "index.html");

  if (existsSync(indexHtml)) {
    logger.info({ staticDir }, "Serving Vite static assets");

    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path === "/api" || req.path.startsWith("/api/")) return next();
      res.sendFile(indexHtml);
    });
  } else {
    logger.warn(
      { staticDir },
      "Vite build output not found; static serving disabled",
    );
  }
}

export default app;
