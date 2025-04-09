import pool from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { AvailabilityBlock } from './availability.service'; // Import interface

// --- TEMPORARY Placeholder until appointment.service.ts is created ---
// This defines the basic structure we expect from an Appointment record for now
interface Appointment {
    id: number;
    doctor_id: number;
    appointment_time: Date | string; // DB returns string/Date object
    status?: 'Pending' | 'Confirmed' | 'Cancelled'; // Added status for filtering
    // other fields like patient_name etc. might exist but aren't needed for this specific calculation
}
// --- End Temporary Placeholder ---


// Define structure for an available slot
export interface AvailableSlot {
    start_time: string; // Format: YYYY-MM-DD HH:MM:SS
    end_time: string;   // Format: YYYY-MM-DD HH:MM:SS
}

// Configuration
const APPOINTMENT_DURATION_MINUTES = 30;

export const getAvailableSlots = async (doctorId: number, date: string): Promise<AvailableSlot[]> => {
    // Validate date format (basic)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD.');
    }

    const targetDate = new Date(date + 'T00:00:00'); // Use local time context for day/date parts
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ...

    try {
        // 1. Get doctor's availability blocks for that day of the week
        const blockQuery = 'SELECT start_time, end_time FROM AvailabilityBlocks WHERE doctor_id = ? AND day_of_week = ? ORDER BY start_time';
        const [blocks] = await pool.query<RowDataPacket[]>(blockQuery, [doctorId, dayOfWeek]);

        if (blocks.length === 0) {
            return []; // Doctor is not available on this day
        }

        // 2. Get existing NON-CANCELLED appointments for that doctor on that specific date
        const appointmentQuery = `
            SELECT appointment_time 
            FROM Appointments 
            WHERE doctor_id = ? AND DATE(appointment_time) = ? AND status != 'Cancelled' 
            ORDER BY appointment_time
        `;
        const [appointments] = await pool.query<RowDataPacket[]>(appointmentQuery, [doctorId, date]);

        // Create a set of booked start times (as strings 'YYYY-MM-DD HH:MM:SS') for quick lookup
        const bookedStartTimes = new Set<string>();
        appointments.forEach(appt => {
            // Convert DATETIME from DB to a consistent string format
            // Important: Ensure this parsing handles potential timezone offsets correctly if DB/server differ.
            // Using standard Date object, relies on server's locale interpretation unless explicitly handled.
            const apptDate = new Date(appt.appointment_time); 
             const formattedStartTime = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}-${String(apptDate.getDate()).padStart(2, '0')} ${String(apptDate.getHours()).padStart(2, '0')}:${String(apptDate.getMinutes()).padStart(2, '0')}:${String(apptDate.getSeconds()).padStart(2, '0')}`;
             bookedStartTimes.add(formattedStartTime);
        });

        // 3. Generate potential slots and filter
        const availableSlots: AvailableSlot[] = [];
        const slotDurationMillis = APPOINTMENT_DURATION_MINUTES * 60 * 1000;

        for (const block of blocks) {
            // Parse block start/end times (HH:MM:SS) and combine with target date
            const [startH, startM] = block.start_time.split(':').map(Number);
            const [endH, endM] = block.end_time.split(':').map(Number);

            let currentSlotStart = new Date(targetDate);
            currentSlotStart.setHours(startH, startM, 0, 0); // Set hours/minutes from block start

            let blockEnd = new Date(targetDate);
            blockEnd.setHours(endH, endM, 0, 0); // Set hours/minutes from block end

            while (currentSlotStart.getTime() < blockEnd.getTime()) {
                const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMillis);

                // Ensure the slot ENDS within the block (or exactly at the end)
                if (currentSlotEnd.getTime() > blockEnd.getTime()) {
                    break;
                }

                // Format potential slot start time to match booked set format
                const formattedPotentialStart = `${currentSlotStart.getFullYear()}-${String(currentSlotStart.getMonth() + 1).padStart(2, '0')}-${String(currentSlotStart.getDate()).padStart(2, '0')} ${String(currentSlotStart.getHours()).padStart(2, '0')}:${String(currentSlotStart.getMinutes()).padStart(2, '0')}:${String(currentSlotStart.getSeconds()).padStart(2, '0')}`;

                // Check if this slot is already booked
                if (!bookedStartTimes.has(formattedPotentialStart)) {
                    // Format for response (using the same consistent format)
                    const responseSlotStart = formattedPotentialStart;
                    const responseSlotEnd = `${currentSlotEnd.getFullYear()}-${String(currentSlotEnd.getMonth() + 1).padStart(2, '0')}-${String(currentSlotEnd.getDate()).padStart(2, '0')} ${String(currentSlotEnd.getHours()).padStart(2, '0')}:${String(currentSlotEnd.getMinutes()).padStart(2, '0')}:${String(currentSlotEnd.getSeconds()).padStart(2, '0')}`;

                    availableSlots.push({
                        start_time: responseSlotStart,
                        end_time: responseSlotEnd
                    });
                }

                // Move to the next potential slot start time
                currentSlotStart = currentSlotEnd;
            }
        }

        return availableSlots;

    } catch (error) {
        console.error(`[Service Error]: Error calculating available slots for doctor ${doctorId} on ${date}:`, error);
        throw new Error('Failed to calculate available slots.');
    }
};