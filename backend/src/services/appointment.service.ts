import pool from '../config/database';
import { RowDataPacket, OkPacket } from 'mysql2/promise';
import { randomBytes } from 'crypto'; // For cancellation code
// No need to import slot service here anymore

// --- Helper function to get Doctor ID from Token ---
// Moved near top for clarity or could be imported from doctor.service if preferred
const getDoctorIdByToken = async (token: string): Promise<number | null> => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM Doctors WHERE management_token = ?', [token]);
        return rows.length > 0 ? rows[0].id : null;
    } catch (error) {
        console.error(`[Service Error]: Error fetching doctor ID for token ${token}:`, error);
        // Propagate error or handle as needed, returning null indicates failure here
        return null; 
    }
};


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

// --- Helper: Check Slot Availability ---
const isSlotAvailable = async (doctorId: number, appointmentTime: string): Promise<boolean> => {
    try {
        const targetDateTime = new Date(appointmentTime);
        const dateStr = appointmentTime.split(' ')[0];
        const timeStr = appointmentTime.split(' ')[1];
        const dayOfWeek = targetDateTime.getDay();

        const blockQuery = `
            SELECT 1 FROM AvailabilityBlocks 
            WHERE doctor_id = ? AND day_of_week = ? AND TIME(?) BETWEEN start_time AND TIME(SUBTIME(end_time, '0:0:1'))
            LIMIT 1 
        `;
        const [blocks] = await pool.query<RowDataPacket[]>(blockQuery, [doctorId, dayOfWeek, timeStr]);

        if (blocks.length === 0) {
            console.log(`[Validation]: Slot ${appointmentTime} is outside availability blocks.`);
            return false;
        }

        const appointmentQuery = `
            SELECT 1 FROM Appointments 
            WHERE doctor_id = ? AND appointment_time = ? AND status != 'Cancelled' 
            LIMIT 1
        `;
        const [appointments] = await pool.query<RowDataPacket[]>(appointmentQuery, [doctorId, appointmentTime]);

        if (appointments.length > 0) {
             console.log(`[Validation]: Slot ${appointmentTime} is already booked.`);
            return false;
        }

        return true;

    } catch (error) {
         console.error(`[Validation Error]: Error checking slot availability for Dr ${doctorId} at ${appointmentTime}:`, error);
         return false; 
    }
};


// --- BOOK APPOINTMENT ---
export const bookAppointment = async (input: AppointmentInput): Promise<Appointment> => {
    const { doctorId, patientName, patientContactInfo, appointmentTime } = input;
    
    const slotIsAvailable = await isSlotAvailable(doctorId, appointmentTime);
    if (!slotIsAvailable) {
        throw new Error(`Slot at ${appointmentTime} is not available for booking.`);
    }

    const cancellationCode = randomBytes(16).toString('hex');

    try {
        const query = `
            INSERT INTO Appointments (doctor_id, patient_name, patient_contact_info, appointment_time, status, cancellation_code)
            VALUES (?, ?, ?, ?, 'Pending', ?) 
        `;
        const values = [doctorId, patientName, patientContactInfo, appointmentTime, cancellationCode];

        const [result] = await pool.query<OkPacket>(query, values);

        if (result.insertId) {
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
        if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
             throw new Error(`Slot at ${appointmentTime} was booked by another user just now. Please try a different slot.`);
        }
         if (error instanceof Error && error.message.includes('not available for booking')) {
              throw error;
         }
        throw new Error('Failed to book appointment in database.');
    }
};

// --- GET ALL APPOINTMENTS ---
export const getAllAppointments = async (): Promise<Appointment[]> => {
    try {
        const query = `
            SELECT id, doctor_id, patient_name, patient_contact_info, appointment_time, status, created_at, updated_at 
            FROM Appointments 
            ORDER BY appointment_time DESC 
        `; 
        const [rows] = await pool.query<RowDataPacket[]>(query);
        return rows as Appointment[];
    } catch (error) {
        console.error('[Service Error]: Error fetching all appointments:', error);
        throw new Error('Failed to fetch appointments.');
    }
};

// --- GET APPOINTMENT BY ID ---
export const getAppointmentById = async (id: number): Promise<Appointment | null> => {
    try {
        const query = `
            SELECT id, doctor_id, patient_name, patient_contact_info, appointment_time, status, created_at, updated_at 
            FROM Appointments 
            WHERE id = ?
        `; 
        const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
        return rows.length > 0 ? (rows[0] as Appointment) : null;
    } catch (error) {
        console.error(`[Service Error]: Error fetching appointment with ID ${id}:`, error);
        throw new Error('Failed to fetch appointment.');
    }
};


// --- CANCEL APPOINTMENT BY CANCELLATION CODE ---
export const cancelAppointmentByCode = async (code: string): Promise<boolean> => {
    try {
        const query = `
            UPDATE Appointments 
            SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP 
            WHERE cancellation_code = ? AND status != 'Cancelled' 
        `; 
        const [result] = await pool.query<OkPacket>(query, [code]);
        return result.affectedRows > 0; 
    } catch (error) {
        console.error(`[Service Error]: Error cancelling appointment with code ${code}:`, error);
        throw new Error('Failed to cancel appointment.');
    }
};

// --- UPDATE STATUS (for doctor/admin - Refined with Token Auth Check) ---
export const updateAppointmentStatus = async (
     appointmentId: number, 
     status: 'Confirmed' | 'Cancelled', 
     doctorToken: string // Require the token for authorization
    ): Promise<boolean> => { 
     
     try {
         // 1. Verify the token and get the doctor's ID
         const requestingDoctorId = await getDoctorIdByToken(doctorToken);
         if (!requestingDoctorId) {
             console.warn(`[Auth Warn]: Invalid management token provided for status update.`);
             // Return false indicates failure, controller should send appropriate response (e.g., 404/403)
             return false; 
         }

         // 2. Update status ONLY IF the appointment belongs to the requesting doctor
         const query = `
            UPDATE Appointments 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND doctor_id = ? 
         `; // Add check for doctor_id
         
         const [result] = await pool.query<OkPacket>(query, [status, appointmentId, requestingDoctorId]);
         
         // result.affectedRows will be 0 if appointmentId doesn't exist OR if it doesn't belong to requestingDoctorId
         return result.affectedRows > 0;

     } catch(error) {
           console.error(`[Service Error]: Error updating status for appointment ${appointmentId}:`, error);
           throw new Error('Failed to update appointment status.'); // Let controller handle generic DB errors
     }
};