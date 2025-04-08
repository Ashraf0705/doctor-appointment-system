import express, { Express, Request, Response } from 'express';
import { testConnection } from './config/database'; // <-- Ensure this import is present

// Basic configuration (replace with actual config later)
const PORT = process.env.PORT || 3000;

// Create Express app instance
const app: Express = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Simple Root Route for testing
app.get('/', (req: Request, res: Response) => {
  res.send('Doctor Appointment API is running!');
});

// Function to start the server after DB check
const startServer = async () => {
  console.log('[Server]: Attempting database connection...'); // Add this for debugging
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

// Call the start function
startServer();

export default app;