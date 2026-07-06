import { Router, type IRouter } from "express";
import cardsRouter from "./cards";
import healthRouter from "./health";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(insightsRouter);
router.use(cardsRouter);

export default router;
