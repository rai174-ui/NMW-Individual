import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import authRouter from "./auth";
import storageRouter from "./storage";
import { router as imagesRouter } from "./images";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(storageRouter);
router.use(membersRouter);
router.use(imagesRouter);
router.use(adminRouter);

export default router;
