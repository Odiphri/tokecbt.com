import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentRouter from "./student";
import teacherRouter from "./teacher";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentRouter);
router.use(teacherRouter);

export default router;
