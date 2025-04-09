import { Router } from 'express'; // Request, Response removed as they are used in controller
import { getAllDoctorsController , createDoctorController } from '../controllers/doctor.controller'; // <-- Import controller

const router = Router();

// Define Doctor routes
router.get('/', getAllDoctorsController);
router.post('/', createDoctorController);

export default router;