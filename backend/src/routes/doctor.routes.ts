import { Router, RequestHandler } from 'express';
import {
    getAllDoctorsController,
    getDoctorByIdController,
    createDoctorController, // <-- Make sure this is imported
    updateDoctorByTokenController, 
    deleteDoctorByTokenController  
} from '../controllers/doctor.controller'; // Correct path

const router = Router();

// --- Doctor Routes ---

router.get('/', getAllDoctorsController);
router.post('/', createDoctorController as RequestHandler); // <-- Make sure this POST route exists
router.get('/:id', getDoctorByIdController as RequestHandler);
router.put('/manage/:managementToken', updateDoctorByTokenController as RequestHandler); 
router.delete('/manage/:managementToken', deleteDoctorByTokenController as RequestHandler); 

export default router;