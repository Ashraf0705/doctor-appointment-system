import pool from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { AvailabilityBlock } from './availability.service'; // Import interface
import { Appointment } from './appointment.service'; // Import real interface

// Define structure for an available slot
export interface AvailableSlot {
    start_time: string; // Format: YYYY-MM-DD HH:MM:SS
    end_time: string;   // Format: YYYY-MM-DD HH:MM:SS
}

// Configuration
const APPOINTMENT_DURATION_MINUTES = 30;

export const getAvailableSlots = async (doctorId: number, date: string): Promise<AvailableSlot[]> => {
    console.log(`\n--- [Backend Slot Service] ---`); // Start marker
    console.log(`[Backend] Calculating slots for Dr ID: ${doctorId}, Date: ${date}`); // Log input
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        console.error(`[Backend] Invalid date format received: ${date}`);
        throw new Error('Invalid date format. Use YYYY-MM-DD.');
    }

    const targetDate = new Date(date + 'T00:00:00'); 
    const dayOfWeek = targetDate.getDay(); 
    console.log(`[Backend] Target DayOfWeek: ${dayOfWeek}`);

    try {
        // 1. Get blocks
        const blockQuery = 'SELECT start_time, end_time FROM AvailabilityBlocks WHERE doctor_id = ? AND day_of_week = ? ORDER BY start_time';
        const [blocks] = await pool.query<RowDataPacket[]>(blockQuery, [doctorId, dayOfWeek]);
        console.log(`[Backend] Found ${blocks.length} availability blocks for day ${dayOfWeek}:`, blocks.map(b => `${b.start_time}-${b.end_time}`));


        if (blocks.length === 0) {
            console.log(`[Backend] No blocks found, returning empty array.`);
            console.log(`--- [Backend Slot Service End] ---\n`);
            return []; 
        }

        // 2. Get appointments
        const appointmentQuery = `
            SELECT appointment_time 
            FROM Appointments 
            WHERE doctor_id = ? AND DATE(appointment_time) = ? AND status != 'Cancelled' 
            ORDER BY appointment_time
        `;
        const [appointments] = await pool.query<RowDataPacket[]>(appointmentQuery, [doctorId, date]);
        console.log(`[Backend] Found ${appointments.length} non-cancelled appointments for date ${date}.`);

        // 3. Create booked times Set
        const bookedStartTimes = new Set<string>();
        appointments.forEach(appt => {
            const apptDate = new Date(appt.appointment_time); 
             const formattedStartTime = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}-${String(apptDate.getDate()).padStart(2, '0')} ${String(apptDate.getHours()).padStart(2, '0')}:${String(apptDate.getMinutes()).padStart(2, '0')}:${String(apptDate.getSeconds()).padStart(2, '0')}`;
             bookedStartTimes.add(formattedStartTime);
        });
        console.log(`[Backend] Set of booked start times:`, bookedStartTimes);

        // 4. Generate potential slots and filter
        const availableSlots: AvailableSlot[] = [];
        const slotDurationMillis = APPOINTMENT_DURATION_MINUTES * 60 * 1000;
        console.log(`[Backend] Generating slots with duration: ${APPOINTMENT_DURATION_MINUTES} mins`);

        for (const block of blocks) {
             console.log(`[Backend] Processing block: ${block.start_time} - ${block.end_time}`);
            const [startH, startM] = block.start_time.split(':').map(Number);
            const [endH, endM] = block.end_time.split(':').map(Number);

            let currentSlotStart = new Date(targetDate);
            currentSlotStart.setHours(startH, startM, 0, 0); 

            let blockEnd = new Date(targetDate);
            blockEnd.setHours(endH, endM, 0, 0);

            while (currentSlotStart.getTime() < blockEnd.getTime()) {
                const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMillis);

                if (currentSlotEnd.getTime() > blockEnd.getTime()) {
                     console.log(`[Backend] Slot end ${currentSlotEnd.toISOString()} exceeds block end ${blockEnd.toISOString()}. Breaking loop.`);
                    break; 
                }

                const formattedPotentialStart = `${currentSlotStart.getFullYear()}-${String(currentSlotStart.getMonth() + 1).padStart(2, '0')}-${String(currentSlotStart.getDate()).padStart(2, '0')} ${String(currentSlotStart.getHours()).padStart(2, '0')}:${String(currentSlotStart.getMinutes()).padStart(2, '0')}:${String(currentSlotStart.getSeconds()).padStart(2, '0')}`;
                // console.log(`[Backend] Checking potential slot: ${formattedPotentialStart}`); // Can be verbose

                if (!bookedStartTimes.has(formattedPotentialStart)) {
                    const responseSlotStart = formattedPotentialStart;
                    const responseSlotEnd = `${currentSlotEnd.getFullYear()}-${String(currentSlotEnd.getMonth() + 1).padStart(2, '0')}-${String(currentSlotEnd.getDate()).padStart(2, '0')} ${String(currentSlotEnd.getHours()).padStart(2, '0')}:${String(currentSlotEnd.getMinutes()).padStart(2, '0')}:${String(currentSlotEnd.getSeconds()).padStart(2, '0')}`;
                    availableSlots.push({ start_time: responseSlotStart, end_time: responseSlotEnd });
                    // console.log(`[Backend] Added available slot: ${responseSlotStart}`); // Can be verbose
                } else {
                     console.log(`[Backend] Slot is booked, skipping: ${formattedPotentialStart}`);
                }
                currentSlotStart = currentSlotEnd;
            }
        }
        console.log(`[Backend] Total available slots calculated: ${availableSlots.length}`);
        console.log(`--- [Backend Slot Service End] ---\n`);
        return availableSlots;

    } catch (error) {
        console.error(`[Backend Service Error]: Error calculating available slots for doctor ${doctorId} on ${date}:`, error);
         console.log(`--- [Backend Slot Service End with Error] ---\n`);
        throw new Error('Failed to calculate available slots.');
    }
};