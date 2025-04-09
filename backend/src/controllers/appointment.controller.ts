import { Request, Response, NextFunction } from 'express';
import * as appointmentService from '../services/appointment.service';

// --- BOOK APPOINTMENT CONTROLLER ---
export const bookAppointmentController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { doctorId, patientName, patientContactInfo, appointmentTime } = req.body;

        // Basic Validation
        if (!doctorId || !patientName || !patientContactInfo || !appointmentTime) {
             return res.status(400).json({ status: 'error', message: 'Missing required fields: doctorId, patientName, patientContactInfo, appointmentTime.' });
        }
        if (typeof doctorId !== 'number' || doctorId <= 0) {
             return res.status(400).json({ status: 'error', message: 'Invalid doctorId.' });
        }
        // Basic datetime format check (YYYY-MM-DD HH:MM:SS) - more robust needed in real app
        const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        if (typeof appointmentTime !== 'string' || !dateTimeRegex.test(appointmentTime)) {
             return res.status(400).json({ status: 'error', message: 'Invalid appointmentTime format. Use "YYYY-MM-DD HH:MM:SS".' });
        }
         // Could add check: is appointmentTime in the past?

        const input: appointmentService.AppointmentInput = { doctorId, patientName, patientContactInfo, appointmentTime };
        const newAppointment = await appointmentService.bookAppointment(input);

        res.status(201).json({
            status: 'success',
            message: 'Appointment booked successfully!',
            data: {
                appointment: newAppointment, // Includes cancellation_code
            },
        });

    } catch (error) {
         // Handle specific validation/booking errors from service
         if (error instanceof Error && error.message.includes('not available for booking')) {
             return res.status(409).json({ status: 'fail', message: error.message }); // 409 Conflict
         }
          if (error instanceof Error && error.message.includes('booked by another user')) {
             return res.status(409).json({ status: 'fail', message: error.message }); // 409 Conflict
         }
        next(error); // Pass other errors to global handler
    }
};

// --- Other controllers (get, delete, update status) will go here ---