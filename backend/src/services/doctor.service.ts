import pool from '../config/database';
// Import RowDataPacket from mysql2 to be more explicit
import { RowDataPacket } from 'mysql2/promise'; 

// Define an interface for the Doctor object
// We can keep this interface definition as it represents our desired *application* object structure.
export interface Doctor {
    id: number;
    name: string;
    specialization: string;
    experience: number;
    contact_info: string;
    management_token?: string; 
    created_at?: Date;
    updated_at?: Date;
}

export const getAllDoctors = async (): Promise<Doctor[]> => {
    try {
        const query = 'SELECT id, name, specialization, experience, contact_info, created_at, updated_at FROM Doctors';
        
        // 1. Tell query we expect RowDataPacket[] which is what SELECT returns
        // 2. The result is actually a tuple [rows, fields], so we destructure `rows`
        const [rows] = await pool.query<RowDataPacket[]>(query); 

        // 3. Now, 'rows' is typed as RowDataPacket[]. 
        // Since our Doctor interface structure matches the selected columns,
        // TypeScript allows this assignment or return.
        // For stricter type safety, you *could* map it, but this is often sufficient:
        // return rows.map(row => ({ ...row } as Doctor)); 
        
        return rows as Doctor[]; // Assert that these RowDataPackets fit our Doctor interface

    } catch (error) {
        console.error('[Service Error]: Error fetching all doctors:', error);
        throw new Error('Failed to fetch doctors from database.');
    }
};

// --- We will add functions for create, getById, update, delete later ---