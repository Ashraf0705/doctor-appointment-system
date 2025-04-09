import express, { Express, Request, Response, NextFunction } from 'express'; // Import NextFunction
import { testConnection } from './config/database';
import doctorRoutes from './routes/doctor.routes';
import availabilityRoutes from './routes/availability.routes';
import slotRoutes from './routes/slot.routes';
// Import other route files here as you create them (e.g., appointmentRoutes)

// Basic configuration (replace with actual config later)
const PORT = process.env.PORT || 3000;

// Create Express app instance
const app: Express = express();

// Core Middleware
app.use(express.json()); // Parse JSON request bodies

// --- API Routes ---
// Mount the doctor routes
app.use('/api/doctors', doctorRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/slots', slotRoutes);

// Mount other routes here (e.g., app.use('/api/appointments', appointmentRoutes);)

// --- Simple Root Route (Optional) ---
app.get('/', (req: Request, res: Response) => {
  res.send('Doctor Appointment API is running!');
});


// --- Global Error Handling Middleware (Must come AFTER routes) ---
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("[Global Error Handler]:", err.stack || err); // Log the error stack

    // Avoid sending response headers multiple times
    if (res.headersSent) {
        return next(err); // Pass to default Express error handler if headers already sent
    }

    // Send generic JSON error response
    res.status(500).json({
        status: 'error',
        message: err.message || 'Something went wrong!', // Use error message if available
    });
});


// --- Server Startup Logic ---
const startServer = async () => {
  console.log('[Server]: Attempting database connection...');
  const dbConnected = await testConnection(); // Test DB connection

  if (dbConnected) {
    app.listen(PORT, () => {
      console.log(`[Server]: Backend server is running at http://localhost:${PORT}`);
    });
  } else {
    console.error('[Server]: Database connection failed, server not started.');
    process.exit(1); // Exit the process if DB connection fails
  }
};

// --- Start the Server ---
startServer();

// Export the app (optional, useful for testing)
export default app;