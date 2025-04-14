import pool from '../config/database';
import { RowDataPacket, OkPacket } from 'mysql2/promise';
import { randomBytes } from 'crypto'; 

// --- Helper function to get Doctor ID from Token ---
const getDoctorIdByToken = async (token: string): Promise<number | null> => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM Doctors WHERE management_token = ?', [token]);
        return rows.length > 0 ? rows[0].id : null;
    } catch (error) {
        console.error(`[Service Error]: Error fetching doctor ID for token ${token}:`, error);
        return null; 
    }
};

// --- Interfaces ---
export interface Appointment {
    id: number;
    doctor_id: number;
    patient_name: string;
    patient_contact_info: string;
    appointment_time: Date | string; 
    status: 'Pending' | 'Confirmed' | 'Cancelled';
    cancellation_code?: string | null; 
    created_at?: Date;
    updated_at?: Date;
    // We add doctor_name dynamically in getAllAppointments, so it doesn't strictly need to be here
    // but the frontend interface should expect it optionally.
}

export interface AppointmentInput {
    doctorId: number;
    patientName: string;
    patientContactInfo: string;
    appointmentTime: string; 
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
        if (blocks.length === 0) return false;

        const appointmentQuery = `
            SELECT 1 FROM Appointments 
            WHERE doctor_id = ? AND appointment_time = ? AND status != 'Cancelled' 
            LIMIT 1
        `;
        const [appointments] = await pool.query<RowDataPacket[]>(appointmentQuery, [doctorId, appointmentTime]);
        if (appointments.length > 0) return false;

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
    if (!slotIsAvailable) throw new Error(`Slot at ${appointmentTime} is not available for booking.`);

    const cancellationCode = randomBytes(16).toString('hex');

    try {
        const query = `INSERT INTO Appointments (doctor_id, patient_name, patient_contact_info, appointment_time, status, cancellation_code) VALUES (?, ?, ?, ?, 'Pending', ?)`;
        const values = [doctorId, patientName, patientContactInfo, appointmentTime, cancellationCode];
        const [result] = await pool.query<OkPacket>(query, values);

        if (result.insertId) {
            const [newApptRows] = await pool.query<RowDataPacket[]>('SELECT * FROM Appointments WHERE id = ?', [result.insertId]);
            if (newApptRows.length > 0) {
                 const createdAppointment = newApptRows[0] as Appointment; 
                 console.log(`\n--- SIMULATED EMAIL/SMS ---`);
                 console.log(`To: ${createdAppointment.patient_contact_info}`);
                 console.log(`Subject: Appointment Confirmation`);
                 console.log(`Your appointment with Doctor ID ${createdAppointment.doctor_id} at ${createdAppointment.appointment_time} is booked.`);
                 console.log(`>>> Your Cancellation Code: ${createdAppointment.cancellation_code} <<<`); 
                 console.log(`---------------------------\n`);
                return createdAppointment; 
            } else { throw new Error('Failed to retrieve newly created appointment.'); }
        } else { throw new Error('Failed to insert new appointment.'); }
    } catch (error) {
        console.error('[Service Error]: Error booking appointment:', error);
        if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') throw new Error(`Slot at ${appointmentTime} was booked by another user just now. Please try a different slot.`);
        if (error instanceof Error && error.message.includes('not available for booking')) throw error;
        throw new Error('Failed to book appointment in database.');
    }
};

// --- GET ALL APPOINTMENTS (with optional token filter AND Doctor Name) --- // *** MODIFIED ***
export const getAllAppointments = async (filterToken?: string): Promise<Appointment[]> => {
    console.log(`\n--- [Backend Appt Service - getAllAppointments] ---`);
    console.log(`[Backend Appt Service] Received filterToken:`, filterToken); 
    try {
        // Select appointment fields AND doctor's name using JOIN
        let query = `
            SELECT 
                A.id, A.doctor_id, A.patient_name, A.patient_contact_info, 
                A.appointment_time, A.status, A.created_at, A.updated_at,
                D.name as doctor_name 
            FROM Appointments A 
            JOIN Doctors D ON A.doctor_id = D.id 
        `; // Base query with JOIN
        const queryParams: (string | number)[] = [];

        if (filterToken) {
            // If token provided, filter by doctor_id associated with that token
            const doctorId = await getDoctorIdByToken(filterToken);
            console.log(`[Backend Appt Service] Doctor ID found for token:`, doctorId); 
            if (doctorId) {
                query += ` WHERE A.doctor_id = ?`; // Add WHERE clause (prefix with table alias A)
                queryParams.push(doctorId);
            } else {
                console.warn(`[Backend Appt Service] Invalid token provided for filtering appointments.`);
                console.log(`--- [Backend Appt Service End] ---\n`);
                return []; // Return empty if token invalid
            }
        }
        
        query += ` ORDER BY A.appointment_time DESC`; // Add ORDER BY at the end, prefix with alias

        console.log(`[Backend Appt Service] Executing Query: ${query.replace(/\s+/g, ' ')} with params:`, queryParams); 

        const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);
        console.log(`[Backend Appt Service] Query returned ${rows.length} rows.`); 
        console.log(`--- [Backend Appt Service End] ---\n`);
        // Rows now include doctor_name. Cast to Appointment[] which frontend expects.
        return rows as Appointment[]; 
    } catch (error) {
        console.error('[Service Error]: Error fetching appointments:', error);
        console.log(`--- [Backend Appt Service End with Error] ---\n`);
        throw new Error('Failed to fetch appointments.');
    }
};
// --- End Modified Function ---

// --- GET APPOINTMENT BY ID --- // *** MODIFIED to potentially include doctor_name ***
export const getAppointmentById = async (id: number): Promise<Appointment | null> => {
    try {
        // Also join with Doctors table here to get name
        const query = `
            SELECT 
                A.id, A.doctor_id, A.patient_name, A.patient_contact_info, 
                A.appointment_time, A.status, A.created_at, A.updated_at,
                D.name as doctor_name 
            FROM Appointments A
            JOIN Doctors D ON A.doctor_id = D.id 
            WHERE A.id = ?
        `; 
        const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
        return rows.length > 0 ? (rows[0] as Appointment) : null; 
    } catch (error) {
        console.error(`[Service Error]: Error fetching appointment with ID ${id}:`, error);
        throw new Error('Failed to fetch appointment.');
    }
};
// --- End Modified Function ---


// --- CANCEL APPOINTMENT BY CANCELLATION CODE ---
export const cancelAppointmentByCode = async (code: string): Promise<boolean> => {
    try {
        const query = `UPDATE Appointments SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE cancellation_code = ? AND status != 'Cancelled'`; 
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
     doctorToken: string 
    ): Promise<boolean> => { 
     try {
         const requestingDoctorId = await getDoctorIdByToken(doctorToken);
         if (!requestingDoctorId) {
             console.warn(`[Auth Warn]: Invalid management token provided for status update.`);
             return false; 
         }
         const query = `UPDATE Appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND doctor_id = ?`;          
         const [result] = await pool.query<OkPacket>(query, [status, appointmentId, requestingDoctorId]);
         return result.affectedRows > 0;
     } catch(error) {
           console.error(`[Service Error]: Error updating status for appointment ${appointmentId}:`, error);
           throw new Error('Failed to update appointment status.');
     }
};