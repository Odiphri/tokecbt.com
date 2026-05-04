import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentRouter from "./student";
import teacherRouter from "./teacher";
import adminRouter from "./admin";
import attendanceRouter from "./attendance";
import bursaryRouter from "./bursary";
import directoryRouter from "./directory";
import aiQuestionsRouter from "./ai-questions";
import schoolSettingsRouter from "./school-settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentRouter);
router.use(teacherRouter);
router.use(adminRouter);
router.use(attendanceRouter);
router.use(bursaryRouter);
router.use(directoryRouter);
router.use(aiQuestionsRouter);
router.use(schoolSettingsRouter);

export default router;
