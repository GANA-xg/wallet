import { Router, type IRouter } from "express";
import authRouter from "./auth";
import cardsRouter from "./cards";
import healthRouter from "./health";
import insightsRouter from "./insights";
import pnrRouter from "./pnr";

const router: IRouter = Router();

router.use(healthRouter);
router.use(insightsRouter);
router.use(pnrRouter);
router.use(authRouter);
router.use(cardsRouter);

export default router;
