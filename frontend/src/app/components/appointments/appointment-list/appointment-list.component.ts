import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Import DatePipe
import { RouterLink } from '@angular/router';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips'; // To display status nicely

// Services & Interfaces
import { AppointmentService, Appointment } from '../../../services/appointment.service';
// Optional: Import DoctorService if we want to fetch doctor names (more complex)
// import { DoctorService, Doctor } from '../../../services/doctor.service';

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule // Add MatChipsModule
    ],
    providers: [DatePipe], // Provide DatePipe
  templateUrl: './appointment-list.component.html',
  styleUrls: ['./appointment-list.component.css']
})
export class AppointmentListComponent implements OnInit {

  appointments: Appointment[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  // Optional: Store doctor names if fetched
  // doctorMap = new Map<number, string>(); 

  private appointmentService = inject(AppointmentService);
  // Optional: Inject DoctorService
  // private doctorService = inject(DoctorService); 

  ngOnInit(): void {
    this.loadAppointments();
    // Optional: Fetch doctors if needed to display names
    // this.loadDoctors(); 
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.appointmentService.getAllAppointments().subscribe({
      next: (data) => {
        this.appointments = data;
        this.isLoading = false;
        console.log('Appointments loaded:', this.appointments);
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to load appointments.';
        this.isLoading = false;
        console.error('Error loading appointments:', err);
      }
    });
  }

   // Optional: Method to load doctors into a map for easy lookup by ID
   /*
   loadDoctors(): void {
     this.doctorService.getDoctors().subscribe(doctors => {
       doctors.forEach(doc => this.doctorMap.set(doc.id, doc.name));
     });
   }
   */

   // Optional: Method to get doctor name from map
   /*
   getDoctorName(doctorId: number): string {
     return this.doctorMap.get(doctorId) || `Doctor ID: ${doctorId}`; // Fallback to ID
   }
   */

   // Helper function to determine chip color based on status
   getStatusColor(status: 'Pending' | 'Confirmed' | 'Cancelled'): string {
       switch (status) {
           case 'Confirmed': return 'primary'; // Material 'primary' color (usually blue/indigo)
           case 'Pending': return 'accent';  // Material 'accent' color (often pink/teal)
           case 'Cancelled': return 'warn';    // Material 'warn' color (usually red)
           default: return ''; // Default/no specific color
       }
   }
}