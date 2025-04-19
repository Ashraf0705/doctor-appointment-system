import pool from '../config/database';
import { OkPacket, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcrypt'; // Import bcrypt
import { Doctor, DoctorInput } from '../services/doctor.service'; // Assuming DoctorInput includes all necessary fields EXCEPT password

// Define interface for Signup data including password
export interface SignupInput extends DoctorInput {
    email: string;
    password: string;
}

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// --- REGISTER/SIGNUP DOCTOR ---
export const registerDoctor = async (input: SignupInput): Promise<Omit<Doctor, 'password'>> => {
    // Omit<Doctor, 'password'> means return type is Doctor object WITHOUT password field
    const { name, specialization, experience, contact_info, email, password } = input;

    // ** 1. Hash the password **
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log(`[Auth Service] Hashing password for email: ${email}`);

    // Use a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // ** 2. Insert Doctor with HASHED password **
        const query = `
            INSERT INTO Doctors (name, specialization, experience, contact_info, email, password) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [name, specialization, experience, contact_info, email, hashedPassword]; // Use hashed password

        const [result] = await connection.query<OkPacket>(query, values);

        if (!result.insertId) {
            throw new Error('Failed to insert new doctor during registration.');
        }
        const newDoctorId = result.insertId;
        console.log(`[Auth Service] Doctor inserted with ID: ${newDoctorId}`);

        // ** 3. Add Default Availability Blocks (using the existing logic) **
        // (Assuming default blocks should still be added on signup)
        console.log(`[Auth Service] Adding default availability blocks for new doctor ID: ${newDoctorId}`);
        const defaultStartTime = '09:00:00';
        const defaultEndTime = '17:00:00';
        const blockQuery = `INSERT INTO AvailabilityBlocks (doctor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)`;
        for (let day = 1; day <= 6; day++) {
            try {
                await connection.query(blockQuery, [newDoctorId, day, defaultStartTime, defaultEndTime]);
            } catch (blockError) {
                console.error(`[Auth Service Error] Failed to add default block for Dr ${newDoctorId}, Day: ${day}:`, blockError);
                // Decide if this should cause a rollback
                 throw new Error(`Failed to add default availability block for day ${day}. Rolled back.`); 
            }
        }

        // ** 4. Commit Transaction **
        await connection.commit();
        console.log(`[Auth Service] Doctor ${newDoctorId} and blocks committed.`);

        // ** 5. Fetch and return new doctor details (excluding password) **
         const [newDoctorRows] = await pool.query<RowDataPacket[]>(
             'SELECT id, name, specialization, experience, contact_info, email, created_at, updated_at FROM Doctors WHERE id = ?',
             [newDoctorId]
         ); // Select everything EXCEPT password
         if (newDoctorRows.length > 0) {
             return newDoctorRows[0] as Omit<Doctor, 'password'>; // Cast to Doctor type without password
         } else {
             throw new Error('Failed to retrieve newly registered doctor after commit.');
         }

    } catch (error) {
        await connection.rollback(); // Rollback on any error
        console.error('[Auth Service Error]: Error registering doctor, transaction rolled back:', error);
        if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
             // Check if it's the email constraint
             if (error.message.includes('doctors.email')) {
                  throw new Error('Registration failed: Email address is already in use.');
             }
             // Handle other potential duplicate entries if necessary
             throw new Error('Registration failed due to a duplicate entry.');
        }
        // Re-throw other errors or specific validation errors
        throw error; 
    } finally {
        connection.release(); // Always release connection
    }
};

// --- LOGIN DOCTOR function will be added here later ---