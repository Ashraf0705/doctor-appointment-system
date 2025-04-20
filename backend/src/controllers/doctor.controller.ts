import { Request, Response, NextFunction } from 'express';
import * as doctorService from '../services/doctor.service'; // Assuming interfaces are here too

// --- GET ALL DOCTORS CONTROLLER ---
export const getAllDoctorsController = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const doctors = await doctorService.getAllDoctors();
        res.status(200).json({ status: 'success', count: doctors.length, data: { doctors } });
    } catch (error) { next(error); }
};

// --- GET DOCTOR BY ID CONTROLLER ---
export const getDoctorByIdController = async (req: Request, res: Response, next: NextFunction) => { 
    try {
        const id = parseInt(req.params.id, 10); 
        if (isNaN(id) || id <= 0) return res.status(400).json({ status: 'error', message: 'Invalid doctor ID provided.' });
        
        const doctor = await doctorService.getDoctorById(id);
        if (doctor) { res.status(200).json({ status: 'success', data: { doctor } }); } 
        else { res.status(404).json({ status: 'fail', message: `Doctor with ID ${id} not found.` }); }
    } catch (error) { next(error); }
};

// --- CREATE DOCTOR CONTROLLER (Token version) --- // *** ENSURE THIS IS PRESENT ***
export const createDoctorController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Basic input validation (Only expect fields for DoctorInput)
        const { name, specialization, experience, contact_info } = req.body;

        if (!name || !specialization || experience === undefined || !contact_info) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields: name, specialization, experience, contact_info' });
        }
        if (typeof experience !== 'number' || !Number.isInteger(experience) || experience < 0) {
            return res.status(400).json({ status: 'error', message: 'Experience must be a non-negative integer.' });
        }
        // Add any other specific validation if needed

        // Prepare input for the service (matches DoctorInput interface)
        const doctorInput: doctorService.DoctorInput = { name, specialization, experience, contact_info };
        // Call the token-generating createDoctor service method
        const newDoctor = await doctorService.createDoctor(doctorInput); 

        // Send successful response (201 Created) including the new doctor object which has the token
        res.status(201).json({
            status: 'success',
            message: 'Doctor created successfully!',
            data: {
                doctor: newDoctor, 
            },
        });
    } catch (error) {
         // Handle potential duplicate token error? Unlikely but possible.
          if (error instanceof Error && error.message.includes('duplicate entry')) {
              return res.status(409).json({ status: 'fail', message: error.message }); // 409 Conflict
          }
        next(error); // Pass other errors to global handler
    }
};
// --- End Create Doctor Controller ---


// --- UPDATE DOCTOR BY TOKEN CONTROLLER --- // Ensure this uses token correctly
export const updateDoctorByTokenController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { managementToken } = req.params; 
        const updateData = req.body; 

        if (!managementToken) return res.status(400).json({ status: 'error', message: 'Management token is required.' });
        if (Object.keys(updateData).length === 0) return res.status(400).json({ status: 'error', message: 'No update data provided.' });
        if (updateData.experience !== undefined) {
             if (typeof updateData.experience !== 'number' || !Number.isInteger(updateData.experience) || updateData.experience < 0) {
                 return res.status(400).json({ status: 'error', message: 'Experience must be a non-negative integer.' });
             }
         }

        const allowedUpdateInput: Partial<doctorService.DoctorInput> = {};
        if (updateData.name !== undefined) allowedUpdateInput.name = updateData.name;
        if (updateData.specialization !== undefined) allowedUpdateInput.specialization = updateData.specialization;
        if (updateData.experience !== undefined) allowedUpdateInput.experience = updateData.experience;
        if (updateData.contact_info !== undefined) allowedUpdateInput.contact_info = updateData.contact_info;

        const updatedDoctor = await doctorService.updateDoctorByToken(managementToken, allowedUpdateInput); // Call token version

        if (updatedDoctor) {
            res.status(200).json({ status: 'success', message: 'Doctor updated successfully!', data: { doctor: updatedDoctor } });
        } else {
            res.status(404).json({ status: 'fail', message: `Doctor with provided management token not found or no update was needed.` });
        }
    } catch (error) { next(error); }
};


// --- DELETE DOCTOR BY TOKEN CONTROLLER --- // Ensure this uses token correctly
export const deleteDoctorByTokenController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { managementToken } = req.params; 
        if (!managementToken) return res.status(400).json({ status: 'error', message: 'Management token is required.' });

        const deleted = await doctorService.deleteDoctorByToken(managementToken); // Call token version

        if (deleted) {
            res.status(204).send(); 
        } else {
            res.status(404).json({ status: 'fail', message: `Doctor with provided management token not found.` });
        }
    } catch (error) {
         if (error instanceof Error && error.message.includes('existing appointments')) {
             return res.status(409).json({ status: 'fail', message: error.message });
         }
        next(error); 
    }
};