import { Router } from 'express'; // Request, Response removed as they are used in controller
import { getAllDoctorsController } from '../controllers/doctor.controller'; // <-- Import controller

const router = Router();

// Define Doctor routes
router.get('/', getAllDoctorsController);

export default router;