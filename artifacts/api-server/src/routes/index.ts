import { Router, type IRouter } from "express";
import healthRouter from "./health";
import familyRouter from "./family";

const router: IRouter = Router();

router.use(healthRouter);
router.use(familyRouter);

export default router;
