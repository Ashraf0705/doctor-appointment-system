import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

// Services & Interfaces
import { AppointmentService, Appointment } from '../../../services/appointment.service';
// Import Doctor Service if needed later for profile editing
// import { DoctorService, Doctor } from '../../../services/doctor.service';

@Component({
  selector: 'app-manage-doctor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  providers: [DatePipe],
  templateUrl: './manage-doctor.component.html',
  styleUrls: ['./manage-doctor.component.css']
})
export class ManageDoctorComponent implements OnInit {

  appointments: Appointment[] = [];
  isLoadingAppointments = true;
  errorMessage: string | null = null;
  managementToken: string | null = null;
  // doctor: Doctor | null = null; // For displaying doctor info later

  private appointmentService = inject(AppointmentService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private datePipe = inject(DatePipe);

  ngOnInit(): void {
    // Get token from route parameter
    this.route.paramMap.pipe(
      tap(params => {
        this.managementToken = params.get('token');
        console.log('[ManageDoctor] Token from route:', this.managementToken);
        this.isLoadingAppointments = true; // Start loading
        this.errorMessage = null;
        if (!this.managementToken) {
          this.handleError('Management token not found in URL.');
          // Optionally redirect or show permanent error
        }
      }),
      // Only proceed if token exists
      switchMap(params => {
        const token = params.get('token');
        if (token) {
          // Fetch appointments specifically for this doctor using the token
          return this.appointmentService.getAllAppointments(token);
        } else {
          return of([]); // Return empty observable if no token
        }
      })
    ).subscribe({
      next: (data) => {
        this.appointments = data;
        if (this.managementToken && data.length === 0) {
             console.log('[ManageDoctor] No appointments found for this doctor.');
             // Optionally show a message in the template instead of just empty list
        }
        this.isLoadingAppointments = false;
      },
      error: (err) => {
        this.handleError(err.message || 'Failed to load appointments.');
      }
    });

    // Optional: Fetch doctor details using the token here too if needed
  }

  // --- Method to Confirm Appointment ---
  confirmAppointment(appointmentId: number): void {
    if (!this.managementToken) {
      this.snackBar.open('Authorization token is missing.', 'Error', { duration: 3000 });
      return;
    }
    // Optimistic UI update (optional) - visually change status immediately
    // const apptIndex = this.appointments.findIndex(a => a.id === appointmentId);
    // if (apptIndex > -1) this.appointments[apptIndex].status = 'Confirmed';

    this.appointmentService.updateAppointmentStatus(appointmentId, 'Confirmed', this.managementToken).subscribe({
      next: (response) => {
        this.snackBar.open(response.message, 'OK', { duration: 3000 });
        this.refreshAppointments(); // Refresh the list to show updated status
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Failed to confirm appointment.', 'Error', { duration: 5000 });
        // Revert optimistic update if it failed
        // this.refreshAppointments(); // Refresh to get actual status back
      }
    });
  }

  // --- Method to Cancel Appointment (by Doctor) ---
  cancelAppointment(appointmentId: number): void {
     if (!this.managementToken) {
      this.snackBar.open('Authorization token is missing.', 'Error', { duration: 3000 });
      return;
    }
    this.appointmentService.updateAppointmentStatus(appointmentId, 'Cancelled', this.managementToken).subscribe({
      next: (response) => {
        this.snackBar.open(response.message, 'OK', { duration: 3000 });
        this.refreshAppointments(); 
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Failed to cancel appointment.', 'Error', { duration: 5000 });
      }
    });
  }

  // --- Method to refresh the appointment list ---
  refreshAppointments(): void {
      if (this.managementToken) {
          this.isLoadingAppointments = true;
          this.errorMessage = null;
          this.appointmentService.getAllAppointments(this.managementToken).subscribe({
               next: (data) => {
                  this.appointments = data;
                  this.isLoadingAppointments = false;
               },
               error: (err) => this.handleError(err.message || 'Failed to refresh appointments.')
          });
      }
  }


  // --- Centralized Error Handling for this component ---
   private handleError(message: string): void {
      this.errorMessage = message;
      this.isLoadingAppointments = false; // Ensure loading stops on error
      console.error('[ManageDoctor Error]:', message);
   }

    // Helper function to determine chip color based on status
   getStatusColor(status: 'Pending' | 'Confirmed' | 'Cancelled'): string {
       switch (status) {
           case 'Confirmed': return 'primary'; 
           case 'Pending': return 'accent';  
           case 'Cancelled': return 'warn';    
           default: return ''; 
       }
   }
}