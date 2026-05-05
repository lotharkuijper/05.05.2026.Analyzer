import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(cors());
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
