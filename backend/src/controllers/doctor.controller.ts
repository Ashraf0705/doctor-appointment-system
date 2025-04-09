import { Request, Response } from 'express';
import * as doctorService from '../services/doctor.service'; // Import service functions

export const getAllDoctorsController = async (req: Request, res: Response) => {
    try {
        const doctors = await doctorService.getAllDoctors(); // Call the service function
        
        // Send successful response with doctors data
        res.status(200).json({
            status: 'success',
            count: doctors.length,
            data: {
                doctors,
            },
        });
    } catch (error) {
        // Send error response
        // Check if error is an instance of Error to safely access message
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({
            status: 'error',
            message: `Failed to get doctors: ${message}`,
        });
    }
};

// --- We will add functions for create, getById, update, delete later ---