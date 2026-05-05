import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scianalystRouter from "./scianalyst";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scianalystRouter);
router.use(aiRouter);

export default router;
