import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; // Import Router for navigation after submit
// Import Reactive Forms building blocks
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; 

// Import Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
// Optional: For success/error messages
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; 

// Import Service
import { DoctorService, DoctorInput } from '../../../services/doctor.service';

@Component({
  selector: 'app-doctor-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule, // <-- Add ReactiveFormsModule
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule // <-- Add MatSnackBarModule
  ],
  templateUrl: './doctor-form.component.html',
  styleUrls: ['./doctor-form.component.css']
})
export class DoctorFormComponent implements OnInit { // Implement OnInit (optional here, but good practice)

  doctorForm!: FormGroup; // Definite assignment assertion (!) - will be initialized in ngOnInit/constructor
  isLoading = false;
  errorMessage: string | null = null;

  // Inject services
  private fb = inject(FormBuilder); // FormBuilder service to create forms
  private doctorService = inject(DoctorService);
  private router = inject(Router); // Router service for navigation
  private snackBar = inject(MatSnackBar); // SnackBar for notifications

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.doctorForm = this.fb.group({
      // Define form controls, initial values, and validators
      name: ['', [Validators.required, Validators.minLength(3)]],
      specialization: ['', [Validators.required, Validators.minLength(3)]],
      // Ensure experience is treated as a number and required
      experience: [null, [Validators.required, Validators.min(0), Validators.pattern("^[0-9]*$")]], 
      contact_info: ['', [Validators.required, Validators.email]] // Basic email validation
    });
  }

  // Helper getter for easy access to form controls in the template
  get f() { return this.doctorForm.controls; }

  onSubmit(): void {
    this.errorMessage = null; // Clear previous errors

    // Stop here if form is invalid
    if (this.doctorForm.invalid) {
        console.log("Form is invalid:", this.doctorForm.value);
        this.doctorForm.markAllAsTouched(); // Mark fields as touched to show errors
        return;
    }

    this.isLoading = true;

    // Prepare data for the service (matches DoctorInput interface)
    const formData: DoctorInput = {
        name: this.f['name'].value,
        specialization: this.f['specialization'].value,
        // Ensure experience is sent as a number
        experience: Number(this.f['experience'].value), 
        contact_info: this.f['contact_info'].value
    };

    this.doctorService.createDoctor(formData).subscribe({
      next: (newDoctor) => {
        this.isLoading = false;
        console.log('Doctor created:', newDoctor);
        // Show success message
        this.snackBar.open(`Doctor "${newDoctor.name}" created successfully!`, 'Close', { duration: 5000 });
        // Navigate back to the doctor list page
        this.router.navigate(['/doctors']); 
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Failed to create doctor. Please try again.';
        console.error('Error creating doctor:', err);
        // Optionally show error in snackbar too
        // this.snackBar.open(this.errorMessage, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }
}