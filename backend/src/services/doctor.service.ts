import pool from '../config/database';
import { RowDataPacket, OkPacket } from 'mysql2/promise';
import { randomBytes } from 'crypto';

// Define an interface for the Doctor object
// Make management_token explicitly optional string | undefined
export interface Doctor {
    id: number;
    name: string;
    specialization: string;
    experience: number;
    contact_info: string;
    management_token?: string | undefined; // Explicitly allow undefined
    created_at?: Date;
    updated_at?: Date;
}

// Interface for incoming data (token generated internally)
export interface DoctorInput {
    name: string;
    specialization: string;
    experience: number;
    contact_info: string;
}

// --- GET ALL DOCTORS ---
// Ensure this function has its full body and returns correctly
export const getAllDoctors = async (): Promise<Doctor[]> => {
    try {
        const query = 'SELECT id, name, specialization, experience, contact_info, created_at, updated_at FROM Doctors';
        const [rows] = await pool.query<RowDataPacket[]>(query);
        return rows as Doctor[]; // Return the rows
    } catch (error) {
        console.error('[Service Error]: Error fetching all doctors:', error);
        throw new Error('Failed to fetch doctors from database.');
    }
}; // <-- Make sure the closing brace } is here


// --- CREATE DOCTOR ---
export const createDoctor = async (doctorInput: DoctorInput): Promise<Doctor> => {
    const { name, specialization, experience, contact_info } = doctorInput;
    const managementToken = randomBytes(32).toString('hex');

    try {
        const query = `
            INSERT INTO Doctors (name, specialization, experience, contact_info, management_token)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [name, specialization, experience, contact_info, managementToken];

        const [result] = await pool.query<OkPacket>(query, values);

        if (result.insertId) {
            const [newDoctorRows] = await pool.query<RowDataPacket[]>(
                'SELECT id, name, specialization, experience, contact_info, created_at, updated_at FROM Doctors WHERE id = ?',
                [result.insertId]
            );
            if (newDoctorRows.length > 0) {
                // Cast the retrieved row to Doctor first
                const createdDoctor = newDoctorRows[0] as Doctor;
                // Now assign the token (TS allows assigning to optional properties)
                createdDoctor.management_token = managementToken;
                return createdDoctor; // Return the complete object
            } else {
                 throw new Error('Failed to retrieve newly created doctor.');
            }
        } else {
            throw new Error('Failed to insert new doctor.');
        }
    } catch (error) {
        console.error('[Service Error]: Error creating doctor:', error);
        if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
             throw new Error('Failed to create doctor due to a duplicate entry. Please try again.');
        }
        throw new Error('Failed to create doctor in database.');
    }
}; // <-- Make sure the closing brace } is here

// --- GET DOCTOR BY ID ---
export const getDoctorById = async (id: number): Promise<Doctor | null> => {
    try {
        // Select all fields EXCEPT management_token for public view
        const query = `
            SELECT id, name, specialization, experience, contact_info, created_at, updated_at 
            FROM Doctors 
            WHERE id = ?
        `;
        const [rows] = await pool.query<RowDataPacket[]>(query, [id]);

        if (rows.length > 0) {
            return rows[0] as Doctor; // Return the found doctor
        } else {
            return null; // Return null if no doctor found with that ID
        }
    } catch (error) {
        console.error(`[Service Error]: Error fetching doctor with ID ${id}:`, error);
        throw new Error('Failed to fetch doctor from database.');
    }
};