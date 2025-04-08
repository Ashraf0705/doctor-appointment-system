-- Ensure you are using the correct database
USE doctor_appointments_db;

-- Table: Doctors
-- Stores doctor profile information and management token
CREATE TABLE Doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    experience INT NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    management_token VARCHAR(64) NOT NULL UNIQUE, -- For unique edit access link
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Add index for faster lookups by specialization if needed frequently
    INDEX idx_specialization (specialization)
);

-- Table: AvailabilityBlocks
-- Stores the recurring weekly availability of doctors
CREATE TABLE AvailabilityBlocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week INT NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Link to the Doctors table
    FOREIGN KEY (doctor_id) REFERENCES Doctors(id) ON DELETE CASCADE,

    -- Ensure end time is after start time
    CHECK (end_time > start_time),
    -- Ensure day_of_week is valid
    CHECK (day_of_week >= 0 AND day_of_week <= 6),
    -- Ensure a doctor doesn't define overlapping blocks for the same day (optional but good practice)
    -- This is complex to enforce purely in SQL, often handled in application logic or more advanced constraints/triggers
    -- Basic index for faster lookup by doctor
    INDEX idx_doctor_day (doctor_id, day_of_week)
);

-- Table: Appointments
-- Stores booked appointment details
CREATE TABLE Appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_contact_info VARCHAR(255) NOT NULL,
    appointment_time DATETIME NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Link to the Doctors table
    FOREIGN KEY (doctor_id) REFERENCES Doctors(id) ON DELETE RESTRICT, -- Prevent deleting doctor with appointments

    -- Prevent booking the same doctor at the exact same time slot
    UNIQUE KEY unique_doctor_time (doctor_id, appointment_time),

    -- Indexes for faster lookups
    INDEX idx_appointment_time (appointment_time),
    INDEX idx_status (status)
);

-- Optional: Add a comment to describe the database overall
-- ALTER DATABASE doctor_appointments_db COMMENT = 'Database for the Doctor Appointment Booking System';