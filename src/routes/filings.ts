import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { optionalQueryString, parseRouteId } from "../httpError";
import { getFiling, listFilings } from "../services/filings";

export const filingsRouter = Router();

filingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filings = await listFilings(
      req.examinerId,
      optionalQueryString(req.query.status, "status"),
    );
    res.json({ filings });
  }),
);

filingsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const filing = await getFiling(req.examinerId, parseRouteId(req.params.id, "filing id"));
    res.json(filing);
  }),
);
