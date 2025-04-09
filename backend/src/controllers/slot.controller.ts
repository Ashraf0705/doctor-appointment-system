import { Request, Response, NextFunction } from 'express';
import * as slotService from '../services/slot.service';

export const getAvailableSlotsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const doctorId = parseInt(req.params.doctorId, 10);
        const date = req.query.date as string; // Get date from query parameter

        // Validation
        if (isNaN(doctorId) || doctorId <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid doctor ID provided.' });
        }
        if (!date) {
             return res.status(400).json({ status: 'error', message: 'Date query parameter is required (YYYY-MM-DD).' });
        }
        // Date format validation happens in the service

        const availableSlots = await slotService.getAvailableSlots(doctorId, date);

        res.status(200).json({
            status: 'success',
            count: availableSlots.length,
            data: {
                availableSlots,
            },
        });

    } catch (error) {
         // Handle specific validation errors from service
         if (error instanceof Error && error.message.includes("Invalid date format")) {
             return res.status(400).json({ status: 'error', message: error.message });
         }
        next(error); // Pass other errors to global handler
    }
};