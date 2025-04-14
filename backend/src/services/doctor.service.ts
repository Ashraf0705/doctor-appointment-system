import pool from '../config/database';
import { RowDataPacket, OkPacket } from 'mysql2/promise'; 
import { randomBytes } from 'crypto'; // For generating the management token

// --- Interfaces ---
export interface Doctor {
    id: number;
    name: string;
    specialization: string;
    experience: number;
    contact_info: string;
    management_token?: string | undefined; 
    created_at?: Date;
    updated_at?: Date;
}

export interface DoctorInput { 
    name: string;
    specialization: string;
    experience: number;
    contact_info: string;
}

// --- Helper function (ensure it's defined or imported) ---
const getDoctorIdByToken = async (token: string): Promise<number | null> => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM Doctors WHERE management_token = ?', [token]);
        return rows.length > 0 ? rows[0].id : null;
    } catch (error) {
        console.error(`[Service Error]: Error fetching doctor ID for token ${token}:`, error);
        return null; 
    }
};

// --- GET ALL DOCTORS ---
export const getAllDoctors = async (): Promise<Doctor[]> => { 
    try {
        const query = 'SELECT id, name, specialization, experience, contact_info, created_at, updated_at FROM Doctors';
        const [rows] = await pool.query<RowDataPacket[]>(query);
        return rows as Doctor[]; 
    } catch (error) {
        console.error('[Service Error]: Error fetching all doctors:', error);
        throw new Error('Failed to fetch doctors from database.');
    }
};

// --- CREATE DOCTOR (with Default Availability Blocks) ---
export const createDoctor = async (doctorInput: DoctorInput): Promise<Doctor> => {
    const { name, specialization, experience, contact_info } = doctorInput;
    const managementToken = randomBytes(32).toString('hex'); 

    // Use a transaction to ensure doctor and blocks are created together or not at all
    const connection = await pool.getConnection(); // Get a connection from the pool
    await connection.beginTransaction(); // Start transaction

    try {
        // 1. Insert Doctor
        const doctorQuery = `
            INSERT INTO Doctors (name, specialization, experience, contact_info, management_token) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const doctorValues = [name, specialization, experience, contact_info, managementToken];
        const [result] = await connection.query<OkPacket>(doctorQuery, doctorValues); // Use connection for query

        if (!result.insertId) {
             throw new Error('Failed to insert new doctor.');
        }
        
        const newDoctorId = result.insertId;

        // 2. Add Default Availability Blocks (Mon-Sat, 9am-5pm) using the same connection
        console.log(`[Service Info] Adding default availability blocks for new doctor ID: ${newDoctorId}`);
        const defaultStartTime = '09:00:00';
        const defaultEndTime = '17:00:00'; // 5 PM
        const blockQuery = `
            INSERT INTO AvailabilityBlocks (doctor_id, day_of_week, start_time, end_time) 
            VALUES (?, ?, ?, ?)
        `;
        // Loop through Monday (1) to Saturday (6)
        for (let day = 1; day <= 6; day++) {
            try {
                // Use connection.query within the transaction
                await connection.query(blockQuery, [newDoctorId, day, defaultStartTime, defaultEndTime]); 
                console.log(`[Service Info] Added block for Dr ${newDoctorId}, Day: ${day}`);
            } catch (blockError) {
                // If adding a block fails, log it, but we might still commit the doctor record
                // Or choose to rollback the entire transaction by re-throwing
                console.error(`[Service Error] Failed to add default block for Dr ${newDoctorId}, Day: ${day}:`, blockError);
                 // OPTIONAL: Decide if block failure should prevent doctor creation
                 // throw new Error(`Failed to add default availability block for day ${day}.`); 
            }
        }
        
        // 3. Commit Transaction
        await connection.commit(); 
        console.log(`[Service Info] Doctor ${newDoctorId} and default blocks committed.`);

        // 4. Fetch and return the created doctor (optional but good practice)
        // We can use the main pool now, or keep using the connection
        const [newDoctorRows] = await pool.query<RowDataPacket[]>(
             'SELECT id, name, specialization, experience, contact_info, created_at, updated_at FROM Doctors WHERE id = ?',
             [newDoctorId]
         );
         if (newDoctorRows.length > 0) {
              const createdDoctor = newDoctorRows[0] as Doctor;
              createdDoctor.management_token = managementToken; // Add token back for response
              return createdDoctor;
         } else {
              // This shouldn't happen if insert succeeded, but handle defensively
              throw new Error('Failed to retrieve newly created doctor after commit.');
         }

    } catch (error) {
        // If any error occurred during the transaction, rollback changes
        await connection.rollback(); 
        console.error('[Service Error]: Error creating doctor or default blocks, transaction rolled back:', error);
        // Refine error message based on type if needed
        if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
             throw new Error('Failed to create doctor due to a duplicate entry (possibly token collision). Please try again.');
        }
        throw new Error('Failed to create doctor in database.');
    } finally {
         // VERY Important: Release the connection back to the pool
         connection.release(); 
         console.log("[DB Info] Connection released.");
    }
};


// --- GET DOCTOR BY ID ---
export const getDoctorById = async (id: number): Promise<Doctor | null> => {
    try {
        const query = `
            SELECT id, name, specialization, experience, contact_info, created_at, updated_at 
            FROM Doctors 
            WHERE id = ?
        `; 
        const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
        return rows.length > 0 ? (rows[0] as Doctor) : null; 
    } catch (error) {
        console.error(`[Service Error]: Error fetching doctor with ID ${id}:`, error);
        throw new Error('Failed to fetch doctor from database.');
    }
};

// --- UPDATE DOCTOR BY TOKEN ---
export const updateDoctorByToken = async (token: string, doctorUpdateInput: Partial<DoctorInput>): Promise<Doctor | null> => {
    const { name, specialization, experience, contact_info } = doctorUpdateInput;
    const setClauses: string[] = [];
    const values: (string | number | undefined)[] = [];

    if (name !== undefined) { setClauses.push('name = ?'); values.push(name); }
    if (specialization !== undefined) { setClauses.push('specialization = ?'); values.push(specialization); }
    if (experience !== undefined) { setClauses.push('experience = ?'); values.push(experience); }
    if (contact_info !== undefined) { setClauses.push('contact_info = ?'); values.push(contact_info); }

    if (setClauses.length === 0) {
        console.warn(`[Service Warning]: No valid fields provided for update with token ${token}`);
         const [currentDoctorRows] = await pool.query<RowDataPacket[]>('SELECT id, name, specialization, experience, contact_info, created_at, updated_at FROM Doctors WHERE management_token = ?', [token]);
         return currentDoctorRows.length > 0 ? (currentDoctorRows[0] as Doctor) : null;
    }
    values.push(token); // Add token for WHERE clause

    try {
        const query = `
            UPDATE Doctors 
            SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP 
            WHERE management_token = ?
        `;
        const [result] = await pool.query<OkPacket>(query, values);

        if (result.affectedRows > 0) {
            const [updatedDoctorRows] = await pool.query<RowDataPacket[]>(
                'SELECT id, name, specialization, experience, contact_info, created_at, updated_at FROM Doctors WHERE management_token = ?',
                [token]
            );
            return updatedDoctorRows.length > 0 ? (updatedDoctorRows[0] as Doctor) : null; 
        } else {
            return null; // Token invalid / no update occurred
        }
    } catch (error) {
        console.error(`[Service Error]: Error updating doctor with token ${token}:`, error);
        throw new Error('Failed to update doctor in database.');
    }
};


// --- DELETE DOCTOR BY TOKEN ---
export const deleteDoctorByToken = async (token: string): Promise<boolean> => {
    try {
        const query = `DELETE FROM Doctors WHERE management_token = ?`;
        const [result] = await pool.query<OkPacket>(query, [token]);
        return result.affectedRows > 0; 
    } catch (error) {
        console.error(`[Service Error]: Error deleting doctor with token ${token}:`, error);
        if (error instanceof Error && 'code' in error && (error as any).errno === 1451) {
             console.warn(`[Service Warning]: Attempted to delete doctor with token ${token} who has existing appointments.`);
             throw new Error('Cannot delete doctor: Doctor has existing appointments. Please cancel or reassign appointments first.'); 
        }
        throw new Error('Failed to delete doctor from database.');
    }
};