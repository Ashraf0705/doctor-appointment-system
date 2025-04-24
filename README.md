# 🩺 Doctor Appointment Booking System

A full-stack web application built with Angular and Node.js/Express that allows patients to find doctors, check real-time availability based on schedules, and book appointments. Doctors can register and manage their weekly availability and appointments via a unique token-based system.

## 🚀 Features

**Patient Features:**

*   🧑‍⚕️ **View Doctors:** Browse a list of registered doctors and their details.
*   📅 **Check Availability:** Select a doctor and date to see dynamically calculated available appointment slots.
*   ✅ **Book Appointments:** Select an available slot and provide details to book an appointment.
*   🔑 **Get Cancellation Code:** Receive a unique code upon booking (currently logged in backend console).
*   ❌ **Cancel Bookings:** Use the unique code on a dedicated page to cancel appointments.

**Doctor Features (Management via Token):**

*   ➕ **Register Profile:** Add doctor details (name, specialty, etc.). Default Mon-Sat availability is auto-assigned. *(Signup form needs update for planned Auth)*.
*   🔗 **Unique Management Access:** Use a unique token URL (obtained post-registration from backend console/DB) to access management features.
*   📋 **View Own Appointments:** See a list of appointments booked specifically with them.
*   👍 **Confirm Appointments:** Change status of 'Pending' appointments to 'Confirmed'.
*   👎 **Cancel Appointments:** Change status of 'Pending' appointments to 'Cancelled'.
*   🗓️ **Manage Availability:** View, add, and delete weekly recurring availability time blocks.

## 🛠️ Installation and Setup

Follow these steps to set up the project locally:

1.  **Prerequisites**:
    *   Node.js (v18+ recommended) & npm
    *   MySQL Server (v8+) & MySQL Workbench (or similar client)
    *   Git
    *   Angular CLI (`npm install -g @angular/cli`)

2.  **Clone the Repository**:
    ```bash
    git clone <your-repo-url> 
    cd <your-repo-name>
    ```

3.  **Backend Setup**:
    ```bash
    # Navigate to backend folder
    cd backend 

    # Install dependencies
    npm install

    # Create .env file (copy/paste content below and fill in your DB password)
    # File: backend/.env 
    # DB_HOST=localhost
    # DB_USER=root
    # DB_PASSWORD=your_mysql_password 
    # DB_NAME=doctor_appointments_db
    # JWT_SECRET=placeholder_secret_for_later 

    # Database & Table Setup (Use MySQL Workbench)
    #   1. Connect to MySQL Server
    #   2. Run: CREATE DATABASE doctor_appointments_db;
    #   3. Run: USE doctor_appointments_db;
    #   4. Run the CREATE TABLE SQL commands for `Doctors` (with email/password, NO token), `AvailabilityBlocks`, `Appointments` (with cancellation_code). 
    #      (Provide these SQL statements separately or link to a schema file)
    ```

4.  **Frontend Setup**:
    ```bash
    # Navigate to frontend folder (from project root)
    cd ../frontend 
    # Or 'cd frontend' if in root

    # Install dependencies
    npm install
    ```

5.  **Run the Application**:
    *   **Terminal 1 (in `backend` folder)**:
        ```bash
        npm run dev
        ```
        *(Wait for DB connection & server start)*
    *   **Terminal 2 (in `frontend` folder)**:
        ```bash
        ng serve -o
        ```
        *(Opens http://localhost:4200 in your browser)*

## 🔧 How It Works (Usage)

1.  **Patient:** Access `http://localhost:4200`. Browse doctors, view details, pick a date/time slot, fill the booking form. Note the cancellation code from the **backend console** log (simulated email). Use the "Cancel Booking" link and the code to cancel.
2.  **Doctor Registration:** Use the "Add New Doctor" button on the doctors page. Fill the form. **Note:** This currently uses the old form; obtain the `management_token` from the **database** (`SELECT management_token FROM Doctors...` - requires using DB state *before* token column was dropped) for management testing of *older* doctors if needed. New doctors registered via the planned auth signup won't have a token.
3.  **Doctor Management (Token Method):** For doctors created *before* the auth changes who *have* a `management_token` in the DB: Construct the URL `http://localhost:4200/doctors/manage/{TOKEN}` (paste token without quotes). Access this URL to view/manage appointments and availability blocks.

*(**Development Note:** This README reflects the token-based management system. A planned refactor involves replacing tokens with full email/password authentication and JWT sessions).*

---
