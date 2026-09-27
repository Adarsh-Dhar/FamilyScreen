import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sportsRouter from "./sports";
import agentRouter from "./agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sportsRouter);
router.use(agentRouter);

export default router;
