import { Router, type IRouter } from "express";
import authRouter from "./auth";
import cardsRouter from "./cards";
import healthRouter from "./health";
import insightsRouter from "./insights";
import pnrRouter from "./pnr";
import walletRouter from "./wallet";
import paymentsRouter from "./payments";
import documentsRouter from "./documents";
import ticketsRouter from "./tickets";
import transportRouter from "./transport";
import rewardsRouter from "./rewards";
import notificationsRouter from "./notifications";
import budgetsRouter from "./budgets";
import subscriptionsRouter from "./subscriptions";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(insightsRouter);
router.use(pnrRouter);
router.use(authRouter);
router.use(cardsRouter);
router.use(walletRouter);
router.use(paymentsRouter);
router.use(documentsRouter);
router.use(ticketsRouter);
router.use(transportRouter);
router.use(rewardsRouter);
router.use(notificationsRouter);
router.use(budgetsRouter);
router.use(subscriptionsRouter);
router.use(analyticsRouter);

export default router;