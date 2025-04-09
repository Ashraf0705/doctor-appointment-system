import pool from '../config/database';
import { RowDataPacket, OkPacket } from 'mysql2/promise';
import { Doctor } from './doctor.service'; // Import Doctor interface if needed for context, though not strictly used here yet

// --- Helper function to get Doctor ID from Token (to avoid repetition) ---
// We might move this to a dedicated auth/doctor service later if it grows
const getDoctorIdByToken = async (token: string): Promise<number | null> => {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM Doctors WHERE management_token = ?', [token]);
    return rows.length > 0 ? rows[0].id : null;
};

// --- Interfaces ---
export interface AvailabilityBlock {
    id: number;
    doctor_id: number;
    day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time: string; // Format: HH:MM:SS
    end_time: string;   // Format: HH:MM:SS
    created_at?: Date;
    updated_at?: Date;
}

export interface AvailabilityBlockInput {
    day_of_week: number;
    start_time: string; // Expecting format like '09:00' or '14:30' from input
    end_time: string;   // Expecting format like '12:00' or '17:00' from input
}

// --- GET ALL BLOCKS FOR A DOCTOR ---
export const getAvailabilityBlocksByToken = async (token: string): Promise<AvailabilityBlock[]> => {
    try {
        const doctorId = await getDoctorIdByToken(token);
        if (!doctorId) {
            // If doctor not found by token, return empty array or throw specific error
            console.warn(`[Service Warning]: No doctor found for token provided in getAvailabilityBlocksByToken.`);
            return []; 
        }

        const query = 'SELECT * FROM AvailabilityBlocks WHERE doctor_id = ? ORDER BY day_of_week, start_time';
        const [rows] = await pool.query<RowDataPacket[]>(query, [doctorId]);
        return rows as AvailabilityBlock[];
    } catch (error) {
        console.error(`[Service Error]: Error fetching availability blocks for doctor (token: ${token}):`, error);
        throw new Error('Failed to fetch availability blocks.');
    }
};

// --- ADD A NEW BLOCK FOR A DOCTOR ---
export const addAvailabilityBlock = async (token: string, blockInput: AvailabilityBlockInput): Promise<AvailabilityBlock> => {
    const { day_of_week, start_time, end_time } = blockInput;
     // Basic time format validation (HH:MM) - more robust needed in real app
     const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
     if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
         throw new Error("Invalid time format. Use HH:MM (e.g., 09:00, 14:30).");
     }
     // Ensure start time is before end time (simple string comparison works for HH:MM)
     if (start_time >= end_time) {
          throw new Error("Start time must be before end time.");
     }


    try {
        const doctorId = await getDoctorIdByToken(token);
        if (!doctorId) {
            throw new Error('Invalid management token. Doctor not found.');
        }

        // TODO: Add check for overlapping blocks for the same doctor/day later if needed

        const query = `
            INSERT INTO AvailabilityBlocks (doctor_id, day_of_week, start_time, end_time) 
            VALUES (?, ?, ?, ?)
        `;
        // Append ':00' for seconds to store consistently as TIME type in MySQL
        const values = [doctorId, day_of_week, `${start_time}:00`, `${end_time}:00`];

        const [result] = await pool.query<OkPacket>(query, values);

        if (result.insertId) {
            // Fetch the newly created block
            const [newBlockRows] = await pool.query<RowDataPacket[]>(
                'SELECT * FROM AvailabilityBlocks WHERE id = ?',
                [result.insertId]
            );
            if (newBlockRows.length > 0) {
                return newBlockRows[0] as AvailabilityBlock;
            } else {
                throw new Error('Failed to retrieve newly created availability block.');
            }
        } else {
            throw new Error('Failed to insert new availability block.');
        }
    } catch (error) {
        console.error(`[Service Error]: Error adding availability block for doctor (token: ${token}):`, error);
        // Re-throw specific validation errors
        if (error instanceof Error && (error.message.includes("Invalid time format") || error.message.includes("Start time must be before end time"))) {
             throw error;
        }
        // Handle potential DB errors (like constraint violations if added later)
        throw new Error('Failed to add availability block to database.');
    }
};

// --- DELETE A SPECIFIC BLOCK FOR A DOCTOR ---
export const deleteAvailabilityBlock = async (token: string, blockId: number): Promise<boolean> => {
    try {
        const doctorId = await getDoctorIdByToken(token);
        if (!doctorId) {
            console.warn(`[Service Warning]: No doctor found for token provided in deleteAvailabilityBlock.`);
            return false; // Treat as not found / not authorized
        }

        const query = `
            DELETE FROM AvailabilityBlocks 
            WHERE id = ? AND doctor_id = ? 
        `; // Crucially check both blockId AND doctorId
        const [result] = await pool.query<OkPacket>(query, [blockId, doctorId]);

        return result.affectedRows > 0; // True if deleted, false if blockId didn't exist or didn't belong to doctor

    } catch (error) {
        console.error(`[Service Error]: Error deleting availability block ${blockId} (token: ${token}):`, error);
        throw new Error('Failed to delete availability block from database.');
    }
};