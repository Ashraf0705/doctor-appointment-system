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

// --- UPDATE DOCTOR BY TOKEN CONTROLLER ---
export const updateDoctorByTokenController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { managementToken } = req.params; // Get token from URL parameter
        const updateData = req.body; // Get potential update fields from request body

        // Basic validation: Check if token exists and if body is not empty
        if (!managementToken) {
            return res.status(400).json({ status: 'error', message: 'Management token is required.' });
        }
        if (Object.keys(updateData).length === 0) {
             return res.status(400).json({ status: 'error', message: 'No update data provided.' });
        }
        // Add more specific validation for experience if provided
        if (updateData.experience !== undefined) {
            if (typeof updateData.experience !== 'number' || !Number.isInteger(updateData.experience) || updateData.experience < 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Experience must be a non-negative integer.',
                });
            }
        }

        // Prepare allowed update fields (avoid passing unwanted fields like id)
        const allowedUpdateInput: Partial<doctorService.DoctorInput> = {};
        if (updateData.name !== undefined) allowedUpdateInput.name = updateData.name;
        if (updateData.specialization !== undefined) allowedUpdateInput.specialization = updateData.specialization;
        if (updateData.experience !== undefined) allowedUpdateInput.experience = updateData.experience;
        if (updateData.contact_info !== undefined) allowedUpdateInput.contact_info = updateData.contact_info;


        const updatedDoctor = await doctorService.updateDoctorByToken(managementToken, allowedUpdateInput);

        if (updatedDoctor) {
            res.status(200).json({
                status: 'success',
                message: 'Doctor updated successfully!',
                data: {
                    doctor: updatedDoctor, // Return updated doctor data
                },
            });
        } else {
            // Doctor not found with that token
            res.status(404).json({
                status: 'fail',
                message: `Doctor with provided management token not found or no update was needed.`,
            });
        }
    } catch (error) {
        next(error); // Pass errors to global handler
    }
};

// --- DELETE DOCTOR BY TOKEN CONTROLLER ---
export const deleteDoctorByTokenController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { managementToken } = req.params; // Get token from URL

        if (!managementToken) {
            return res.status(400).json({ status: 'error', message: 'Management token is required.' });
        }

        const deleted = await doctorService.deleteDoctorByToken(managementToken);

        if (deleted) {
            // Send success response - 204 No Content is standard for successful DELETE
            res.status(204).send(); // No content needed in the response body
        } else {
            // Doctor not found with that token
            res.status(404).json({
                status: 'fail',
                message: `Doctor with provided management token not found.`,
            });
        }
    } catch (error) {
         // Handle specific error for appointments constraint
         if (error instanceof Error && error.message.includes('existing appointments')) {
             return res.status(409).json({ // 409 Conflict is appropriate here
                 status: 'fail',
                 message: error.message
             });
         }
        next(error); // Pass other errors to global handler
    }
};