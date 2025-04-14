// Correct code for frontend/src/app/components/cancel-appointment/cancel-appointment.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; 
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'; 

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Services
import { AppointmentService } from '../../services/appointment.service'; // Import the FRONTEND service

@Component({
  selector: 'app-cancel-appointment',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule, 
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './cancel-appointment.component.html', // Ensure these are correct
  styleUrls: ['./cancel-appointment.component.css']
})
export class CancelAppointmentComponent { // Ensure class name is correct

  cancelForm = inject(FormBuilder).group({
      cancellationCode: ['', [Validators.required, Validators.minLength(32), Validators.maxLength(32), Validators.pattern(/^[a-fA-F0-9]+$/)]] 
  });
  isLoading = false;

  private appointmentService = inject(AppointmentService);
  private snackBar = inject(MatSnackBar);
  // No need for fb injection here if already done in group creation

  get f() { return this.cancelForm.controls; }

  onSubmit(): void {
    if (this.cancelForm.invalid) {
        this.cancelForm.markAllAsTouched();
        return;
    }

    this.isLoading = true;
    const code = this.f['cancellationCode'].value ?? ''; 

    this.appointmentService.cancelAppointmentByCode(code).subscribe({ // Call the FRONTEND service method
        next: (response) => {
            this.isLoading = false;
            console.log('Cancellation response:', response);
            this.snackBar.open(response.message || 'Appointment cancelled successfully!', 'OK', { duration: 5000 });
            this.cancelForm.reset(); 
        },
        error: (err) => {
            this.isLoading = false;
            const errorMsg = err.message || 'Cancellation failed. Please check the code and try again.';
            console.error('Cancellation error:', err);
            this.snackBar.open(errorMsg, 'Error', { duration: 7000 }); 
        }
    });
  }
}