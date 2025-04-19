// Corrected backend/src/auth/auth.routes.ts
import { Router, RequestHandler } from 'express'; // <-- Import RequestHandler
import { signupController } from './auth.controller'; 
// Import login controller later

const router = Router();

// --- Authentication Routes ---

// POST /api/auth/signup - Register a new Doctor
router.post('/signup', signupController as RequestHandler); // <-- Add 'as RequestHandler'

// POST /api/auth/login - Login Doctor (To be implemented)
// router.post('/login', loginController);


export default router;