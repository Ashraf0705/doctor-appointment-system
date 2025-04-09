// Add NextFunction to the import
import { Request, Response, NextFunction } from 'express'; 
import * as doctorService from '../services/doctor.service';

export const getAllDoctorsController = async (req: Request, res: Response, next: NextFunction) => { // Add next
    try {
        const doctors = await doctorService.getAllDoctors();
        res.status(200).json({
            status: 'success',
            count: doctors.length,
            data: {
                doctors,
            },
        });
    } catch (error) {
        // Pass error to Express error handler
        next(error); // <-- Use next(error)
    }
};


export const createDoctorController = async (req: Request, res: Response, next: NextFunction) => { // Add next
    const { name, specialization, experience, contact_info } = req.body;

    // --- Keep the validation logic ---
    if (!name || !specialization || experience === undefined || !contact_info) {
       // ... return 400 status ...
    }
     if (typeof experience !== 'number' || !Number.isInteger(experience) || experience < 0) {
        // ... return 400 status ...
    }
    // --- End validation ---

    try {
        const doctorInput: doctorService.DoctorInput = {
             name,
             specialization,
             experience,
             contact_info
        };
        const newDoctor = await doctorService.createDoctor(doctorInput);
        res.status(201).json({
            status: 'success',
            message: 'Doctor created successfully!',
            data: {
                doctor: newDoctor,
            },
        });
    } catch (error) {
         // Pass error to Express error handler
        next(error); // <-- Use next(error)
    }
};

// --- GET DOCTOR BY ID CONTROLLER ---
export const getDoctorByIdController = async (req: Request, res: Response, next: NextFunction) => { // Ensure next is here
    try {
        const id = parseInt(req.params.id, 10); 

        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid doctor ID provided.' });
        }

        const doctor = await doctorService.getDoctorById(id);

        if (doctor) {
            res.status(200).json({
                status: 'success',
                data: {
                    doctor,
                },
            });
        } else {
            res.status(404).json({
                status: 'fail', 
                message: `Doctor with ID ${id} not found.`,
            });
        }
    } catch (error) {
        next(error); // Ensure errors are passed to next()
    }
};