import { Router, RequestHandler } from 'express';
import {
    bookAppointmentController,
    getAllAppointmentsController,    // <-- Add import
    getAppointmentByIdController,    // <-- Add import
    cancelAppointmentByCodeController, // <-- Add import
    updateAppointmentStatusController  // <-- Add import
} from '../controllers/appointment.controller';

const router = Router();

// POST /api/appointments - Book a new appointment
router.post('/', bookAppointmentController as RequestHandler);

// GET /api/appointments - Get all appointments
router.get('/', getAllAppointmentsController as RequestHandler);

// GET /api/appointments/:id - Get specific appointment by ID
router.get('/:id', getAppointmentByIdController as RequestHandler);

// DELETE /api/appointments/cancel/:cancellationCode - Cancel appointment using code
router.delete('/cancel/:cancellationCode', cancelAppointmentByCodeController as RequestHandler);

// PUT /api/appointments/:id/status - Update status (Protected - basic check)
router.put('/:id/status', updateAppointmentStatusController as RequestHandler);


export default router;