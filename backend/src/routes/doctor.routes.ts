import { Router, RequestHandler } from 'express'; // Request, Response removed as they are used in controller
import { getAllDoctorsController , createDoctorController ,getDoctorByIdController , updateDoctorByTokenController } from '../controllers/doctor.controller'; // <-- Import controller

const router = Router();

// Define Doctor routes
router.get('/', getAllDoctorsController);
router.post('/', createDoctorController);
router.get('/:id', getDoctorByIdController as RequestHandler);
router.put('/manage/:managementToken', updateDoctorByTokenController as RequestHandler);  

export default router;