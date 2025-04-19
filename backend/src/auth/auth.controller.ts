import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { SignupInput } from './auth.service'; // Import the input type

// --- SIGNUP CONTROLLER ---
export const signupController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, specialization, experience, contact_info, email, password } = req.body;

        // --- Basic Input Validation ---
        if (!name || !specialization || experience === undefined || !contact_info || !email || !password) {
            // Check if required fields are present
            return res.status(400).json({ status: 'error', message: 'Missing required fields for registration.' });
        }
        if (typeof experience !== 'number' || !Number.isInteger(experience) || experience < 0) {
             return res.status(400).json({ status: 'error', message: 'Experience must be a non-negative integer.'});
        }
        // Add basic password length check
         if (typeof password !== 'string' || password.length < 6) { // Example: minimum 6 characters
             return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters long.'});
         }
         // Basic email format check (can be improved)
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         if (typeof email !== 'string' || !emailRegex.test(email)) {
              return res.status(400).json({ status: 'error', message: 'Invalid email format.'});
         }
         // --- End Validation ---

        const signupInput: authService.SignupInput = {
            name, specialization, experience: Number(experience), contact_info, email, password
        };

        const newDoctor = await authService.registerDoctor(signupInput);

        // Send success response (don't send back password hash!)
        res.status(201).json({
            status: 'success',
            message: 'Doctor registered successfully!',
            data: {
                doctor: newDoctor // Contains ID, name, email etc. but NO password
            }
        });

    } catch (error) {
         // Handle specific errors from service (like duplicate email)
        if (error instanceof Error && error.message.includes('Email address is already in use')) {
            return res.status(409).json({ status: 'fail', message: error.message }); // 409 Conflict
        }
        // Pass other errors (like DB connection issues) to global handler
        next(error); 
    }
};

// --- LOGIN CONTROLLER will be added later ---