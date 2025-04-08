import mysql from 'mysql2/promise'; // Use the promise-based interface of mysql2
import dotenv from 'dotenv';

// Load environment variables from .env file (optional but good practice)
dotenv.config(); 

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',       // Database host (localhost is default)
    user: process.env.DB_USER || 'root',            // Your MySQL username (default is often root)
    password: process.env.DB_PASSWORD || 'Ashraf@75@sql',        // Your MySQL password (!!! ENTER YOURS HERE OR IN .env !!!)
    database: process.env.DB_NAME || 'doctor_appointments_db', // The database name we created
    waitForConnections: true,
    connectionLimit: 10, // Adjust as needed
    queueLimit: 0
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Function to test the connection
export const testConnection = async () => {
    try {
        const connection = await pool.getConnection(); // Try to get a connection
        console.log('[Database]: Successfully connected to MySQL database.');
        connection.release(); // Release the connection back to the pool
        return true;
    } catch (error) {
        console.error('[Database]: Error connecting to MySQL:', error);
        return false;
    }
};

// Export the pool for use in services
export default pool;