import { Router, RequestHandler } from 'express';
import { bookAppointmentController } from '../controllers/appointment.controller';
// Import other controllers as they are created

const router = Router();

// POST /api/appointments - Book a new appointment
router.post('/', bookAppointmentController as RequestHandler);

// Define other routes (GET, DELETE, PUT status) later

export default router;