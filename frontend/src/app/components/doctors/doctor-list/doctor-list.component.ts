import { Component, OnInit, inject } from '@angular/core'; // Import OnInit
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngIf, *ngFor
import { RouterLink } from '@angular/router'; // Import RouterLink for navigation

// Import Angular Material modules needed for the list display
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon'; // For potential icons
import { MatButtonModule } from '@angular/material/button'; // For "Add Doctor" button
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // For loading indicator

// Import the service and the Doctor interface
import { DoctorService, Doctor } from '../../../services/doctor.service';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  // Add necessary imports for template directives and Material modules
  imports: [
    CommonModule,
    RouterLink, // Import RouterLink for the Add Doctor button link
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './doctor-list.component.html',
  styleUrls: ['./doctor-list.component.css'] // Use styleUrls (plural)
})
export class DoctorListComponent implements OnInit { // Implement OnInit

  // --- Component Properties ---
  doctors: Doctor[] = []; // Array to hold the list of doctors
  isLoading = true;       // Flag for loading state
  errorMessage: string | null = null; // To store potential error messages

  // Inject the DoctorService using Angular's inject function (modern way)
  private doctorService = inject(DoctorService);

  // ngOnInit is a lifecycle hook called once after the component is initialized
  ngOnInit(): void {
    this.loadDoctors();
  }

  // --- Method to Load Doctors ---
  loadDoctors(): void {
    this.isLoading = true; // Set loading true before fetching
    this.errorMessage = null; // Clear previous errors

    this.doctorService.getDoctors().subscribe({
      next: (data) => {
        // SUCCESS: Data received from the service
        this.doctors = data;
        this.isLoading = false; // Turn off loading indicator
        console.log('Doctors loaded:', this.doctors); // Log for debugging
      },
      error: (err) => {
        // ERROR: Handle error from the service
        this.errorMessage = err.message || 'Failed to load doctors. Please try again later.';
        this.isLoading = false; // Turn off loading indicator
        console.error('Error loading doctors:', err); // Log the full error
      },
      // 'complete' callback is optional, usually not needed for one-off fetches
      // complete: () => { console.log('Doctor fetch completed'); }
    });
  }
}