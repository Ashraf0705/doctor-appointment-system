import { Router, RequestHandler } from 'express'; // Request, Response removed as they are used in controller
import { getAllDoctorsController , createDoctorController ,getDoctorByIdController , updateDoctorByTokenController ,deleteDoctorByTokenController } from '../controllers/doctor.controller'; // <-- Import controller

const router = Router();

// Define Doctor routes
router.get('/', getAllDoctorsController);
router.get('/:id', getDoctorByIdController as RequestHandler);
router.put('/manage/:managementToken', updateDoctorByTokenController as RequestHandler);  
router.delete('/manage/:managementToken', deleteDoctorByTokenController as RequestHandler);
export default router;