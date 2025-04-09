import pool from '../config/database';
import { RowDataPacket, OkPacket } from 'mysql2/promise';
import { randomBytes } from 'crypto'; // For cancellation code
import { getAvailableSlots } from './slot.service'; // Import to reuse validation logic concept

// --- Interfaces ---
export interface Appointment {
    id: number;
    doctor_id: number;
    patient_name: string;
    patient_contact_info: string;
    appointment_time: Date | string; // Use Date for internal logic, string for DB interaction
    status: 'Pending' | 'Confirmed' | 'Cancelled';
    cancellation_code?: string | null; // Make it optional here too
    created_at?: Date;
    updated_at?: Date;
}

// Input structure for booking
export interface AppointmentInput {
    doctorId: number;
    patientName: string;
    patientContactInfo: string;
    appointmentTime: string; // Expecting 'YYYY-MM-DD HH:MM:SS' from client request
}

// --- Helper: Check Slot Availability (More specific than getAvailableSlots) ---
// Checks if a SINGLE specific slot is available for booking
const isSlotAvailable = async (doctorId: number, appointmentTime: string): Promise<boolean> => {
    // 1. Basic time validation might be useful here too, or rely on DB constraints
    
    // 2. Get the specific date and day of week
    try {
        const targetDateTime = new Date(appointmentTime);
        const dateStr = appointmentTime.split(' ')[0]; // 'YYYY-MM-DD'
        const timeStr = appointmentTime.split(' ')[1]; // 'HH:MM:SS'
        const dayOfWeek = targetDateTime.getDay();

        // 3. Check if time falls within any availability block for that day
        const blockQuery = `
            SELECT 1 FROM AvailabilityBlocks 
            WHERE doctor_id = ? AND day_of_week = ? AND TIME(?) BETWEEN start_time AND TIME(SUBTIME(end_time, '0:0:1'))
            LIMIT 1 
        `; // Check if time is >= start_time and < end_time
        const [blocks] = await pool.query<RowDataPacket[]>(blockQuery, [doctorId, dayOfWeek, timeStr]);

        if (blocks.length === 0) {
            console.log(`[Validation]: Slot ${appointmentTime} is outside availability blocks.`);
            return false; // Not within any block
        }

        // 4. Check if the exact slot is already booked (and not cancelled)
        const appointmentQuery = `
            SELECT 1 FROM Appointments 
            WHERE doctor_id = ? AND appointment_time = ? AND status != 'Cancelled' 
            LIMIT 1
        `;
        const [appointments] = await pool.query<RowDataPacket[]>(appointmentQuery, [doctorId, appointmentTime]);

        if (appointments.length > 0) {
             console.log(`[Validation]: Slot ${appointmentTime} is already booked.`);
            return false; // Slot already booked
        }

        return true; // Slot is within a block and not booked

    } catch (error) {
         console.error(`[Validation Error]: Error checking slot availability for Dr ${doctorId} at ${appointmentTime}:`, error);
         // Treat validation errors as slot being unavailable for safety
         return false; 
    }
};


// --- BOOK APPOINTMENT ---
export const bookAppointment = async (input: AppointmentInput): Promise<Appointment> => {
    const { doctorId, patientName, patientContactInfo, appointmentTime } = input;
    
    // **Crucial Validation Step**
    const slotIsAvailable = await isSlotAvailable(doctorId, appointmentTime);
    if (!slotIsAvailable) {
        throw new Error(`Slot at ${appointmentTime} is not available for booking.`);
    }

    // Generate unique cancellation code
    const cancellationCode = randomBytes(16).toString('hex'); // 32 hex chars, shorter is okay here

    try {
        const query = `
            INSERT INTO Appointments (doctor_id, patient_name, patient_contact_info, appointment_time, status, cancellation_code)
            VALUES (?, ?, ?, ?, 'Pending', ?) 
        `;
        const values = [doctorId, patientName, patientContactInfo, appointmentTime, cancellationCode];

        const [result] = await pool.query<OkPacket>(query, values);

        if (result.insertId) {
            // Fetch the newly created appointment to return
            const [newApptRows] = await pool.query<RowDataPacket[]>(
                'SELECT * FROM Appointments WHERE id = ?',
                [result.insertId]
            );
            if (newApptRows.length > 0) {
                return newApptRows[0] as Appointment;
            } else {
                 throw new Error('Failed to retrieve newly created appointment.');
            }
        } else {
            throw new Error('Failed to insert new appointment.');
        }
    } catch (error) {
        console.error('[Service Error]: Error booking appointment:', error);
         // Handle potential duplicate entry from unique constraint (race condition)
        if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
            // This likely means the unique_doctor_time constraint was hit
             throw new Error(`Slot at ${appointmentTime} was booked by another user just now. Please try a different slot.`);
        }
         // Re-throw validation error
         if (error instanceof Error && error.message.includes('not available for booking')) {
              throw error;
         }
        throw new Error('Failed to book appointment in database.');
    }
};

// --- Other service functions (get, delete, update status) will go here ---