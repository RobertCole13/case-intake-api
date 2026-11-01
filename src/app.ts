import express, { Express } from "express";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { casesRouter } from "./routes/cases";
import { filingsRouter } from "./routes/filings";
import { reportsRouter } from "./routes/reports";

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.use("/cases", authMiddleware, casesRouter);
  app.use("/filings", authMiddleware, filingsRouter);
  app.use("/reports", authMiddleware, reportsRouter);

  // Error middleware must be registered last.
  app.use(errorHandler);
  return app;
}
