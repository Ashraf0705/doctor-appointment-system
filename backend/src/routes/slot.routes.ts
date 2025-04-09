import { Router, RequestHandler } from 'express';
import { getAvailableSlotsController } from '../controllers/slot.controller';

const router = Router();

// GET available slots for a specific doctor on a specific date
// Example: /api/slots/doctor/1?date=2024-05-15
router.get('/doctor/:doctorId', getAvailableSlotsController as RequestHandler);

export default router;