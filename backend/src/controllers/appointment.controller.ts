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

// --- GET ALL APPOINTMENTS CONTROLLER ---
export const getAllAppointmentsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // TODO: Add query parameter handling for filtering later (e.g., ?doctorId=1&date=...)
        const appointments = await appointmentService.getAllAppointments();
        res.status(200).json({
            status: 'success',
            count: appointments.length,
            data: { appointments },
        });
    } catch (error) {
        next(error);
    }
};

// --- GET APPOINTMENT BY ID CONTROLLER ---
export const getAppointmentByIdController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid appointment ID.' });
        }
        const appointment = await appointmentService.getAppointmentById(id);
        if (appointment) {
            res.status(200).json({ status: 'success', data: { appointment } });
        } else {
            res.status(404).json({ status: 'fail', message: `Appointment with ID ${id} not found.` });
        }
    } catch (error) {
        next(error);
    }
};

// --- CANCEL APPOINTMENT BY CODE CONTROLLER ---
export const cancelAppointmentByCodeController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { cancellationCode } = req.params;
        if (!cancellationCode) {
            return res.status(400).json({ status: 'error', message: 'Cancellation code is required.' });
        }

        const cancelled = await appointmentService.cancelAppointmentByCode(cancellationCode);

        if (cancelled) {
            res.status(200).json({ status: 'success', message: 'Appointment cancelled successfully.' }); // Use 200 OK with message for clarity
        } else {
            // Code not found or appointment already cancelled
            res.status(404).json({ status: 'fail', message: 'Invalid or expired cancellation code.' });
        }
    } catch (error) {
        next(error);
    }
};

// --- UPDATE STATUS CONTROLLER (Placeholder) ---
export const updateAppointmentStatusController = async (req: Request, res: Response, next: NextFunction) => {
     try {
         const id = parseInt(req.params.id, 10);
         const { status } = req.body;
         const { managementToken } = req.query; // Or from auth header later

         if (isNaN(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid appointment ID.'});
         if (status !== 'Confirmed' && status !== 'Cancelled') return res.status(400).json({ status: 'error', message: 'Invalid status. Must be "Confirmed" or "Cancelled".'});
         if (!managementToken) return res.status(401).json({ status: 'error', message: 'Authorization required (management token).'}); // Basic check

         // TODO: Validate managementToken actually belongs to the appointment's doctor
         console.warn("Authorization check for management token needed here!");

         const updated = await appointmentService.updateAppointmentStatus(id, status);
         if(updated) {
             res.status(200).json({ status: 'success', message: `Appointment status updated to ${status}.`});
         } else {
             res.status(404).json({ status: 'fail', message: `Appointment with ID ${id} not found.`});
         }
     } catch (error) {
         next(error);
     }
};