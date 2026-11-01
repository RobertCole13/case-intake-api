import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { workload } from "../services/reports";

export const reportsRouter = Router();

reportsRouter.get(
  "/workload",
  asyncHandler(async (_req, res) => {
    const report = await workload();
    res.json(report);
  }),
);
