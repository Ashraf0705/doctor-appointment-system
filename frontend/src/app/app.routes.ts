import { Routes } from '@angular/router';

// Import the generated components
import { DoctorListComponent } from './components/doctors/doctor-list/doctor-list.component';
import { DoctorFormComponent } from './components/doctors/doctor-form/doctor-form.component';
import { DoctorDetailsComponent } from './components/doctors/doctor-details/doctor-details.component';
import { AppointmentListComponent } from './components/appointments/appointment-list/appointment-list.component';
import { AppointmentFormComponent } from './components/appointments/appointment-form/appointment-form.component';
import { CancelAppointmentComponent } from './components/cancel-appointment/cancel-appointment.component';
import { ManageDoctorComponent } from './components/doctors/manage-doctor/manage-doctor.component';

export const routes: Routes = [
    // Redirect base path to doctors list for now
    { path: '', redirectTo: '/doctors', pathMatch: 'full' },

    // Doctor Routes
    { path: 'doctors', component: DoctorListComponent },
    { path: 'doctors/new', component: DoctorFormComponent }, // Route for registering new doctor
    { path: 'doctors/:id', component: DoctorDetailsComponent }, // Route for specific doctor details
    { path: 'doctors/manage/:token', component: ManageDoctorComponent },

    // Appointment Routes
    { path: 'appointments', component: AppointmentListComponent },
    { path: 'appointments/new', component: AppointmentFormComponent },
    { path: 'cancel-appointment', component: CancelAppointmentComponent }, // Route for booking new appointment

    // TODO: Add routes for doctor management (editing profiles/availability) using token later
    // TODO: Add route for patient cancellation using code later
    // TODO: Add a wildcard route for 404 Not Found page later
    // { path: '**', component: NotFoundComponent }, 
];