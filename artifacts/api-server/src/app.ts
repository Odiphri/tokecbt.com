import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { seedRoles } from "./lib/seed-roles";
import { runMigrations } from "./lib/migrate";

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

runMigrations()
  .then(() => seedRoles())
  .catch(err => logger.error({ err }, "Startup tasks failed"));

  import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.resolve(__dirname, "../../cbt-portal/dist");
app.use(express.static(frontendPath));
app.get("/{path*}", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
