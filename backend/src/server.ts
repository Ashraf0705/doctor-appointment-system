import express, { Express, Request, Response } from 'express';

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

// Start the server
app.listen(PORT, () => {
  console.log(`[Server]: Backend server is running at http://localhost:${PORT}`);
});

export default app; // Export for potential testing later