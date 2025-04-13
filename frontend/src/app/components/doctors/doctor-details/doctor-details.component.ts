import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Import DatePipe
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; // Import ActivatedRoute, Router
import { switchMap } from 'rxjs/operators'; // Import switchMap
import { Observable, of } from 'rxjs'; // Import Observable, of

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker'; // Date picker
import { MatNativeDateModule } from '@angular/material/core';      // Required for datepicker
import { MatFormFieldModule } from '@angular/material/form-field'; // Required for datepicker input
import { MatInputModule } from '@angular/material/input';          // Required for datepicker input
import { MatChipsModule } from '@angular/material/chips'; // For displaying slots
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';


// Services and Interfaces
import { DoctorService, Doctor } from '../../../services/doctor.service';
import { SlotService, AvailableSlot } from '../../../services/slot.service';

@Component({
  selector: 'app-doctor-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatSnackBarModule
    ],
   providers: [DatePipe], // Provide DatePipe for formatting
  templateUrl: './doctor-details.component.html',
  styleUrls: ['./doctor-details.component.css']
})
export class DoctorDetailsComponent implements OnInit {

  // Component Properties
  doctor: Doctor | null = null;
  availableSlots: AvailableSlot[] = [];
  selectedDate: Date | null = null; // Store the selected date
  isLoadingDoctor = true;
  isLoadingSlots = false; // Separate loading indicator for slots
  doctorErrorMessage: string | null = null;
  slotErrorMessage: string | null = null;
  doctorId!: number; // Will be initialized from route

  // Inject services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private doctorService = inject(DoctorService);
  private slotService = inject(SlotService);
  private snackBar = inject(MatSnackBar);
  private datePipe = inject(DatePipe); // Inject DatePipe

  ngOnInit(): void {
    // Get the doctor ID from the route parameters
    // Using switchMap to handle observable from route params
    this.route.paramMap.pipe(
        switchMap(params => {
            const idParam = params.get('id');
            if (!idParam) {
                this.handleError('Doctor ID not found in route.', 'doctor');
                return of(null); // Return observable of null if no ID
            }
            this.doctorId = +idParam; // Convert string param to number
            if (isNaN(this.doctorId)) {
               this.handleError('Invalid Doctor ID in route.', 'doctor');
               return of(null);
            }
            this.isLoadingDoctor = true;
            this.doctorErrorMessage = null;
            return this.doctorService.getDoctorById(this.doctorId); // Fetch doctor
        })
    ).subscribe({
        next: (data) => {
            if (data) {
                this.doctor = data;
            } else {
                // Handle case where service might return null or error occurred before service call
                 if (!this.doctorErrorMessage) { // Avoid overwriting specific errors
                    this.handleError(`Doctor with ID ${this.doctorId} not found.`, 'doctor');
                 }
            }
            this.isLoadingDoctor = false;
        },
        error: (err) => {
            this.handleError(err.message || 'Failed to load doctor details.', 'doctor');
        }
    });
  }

  // --- Method to fetch slots when date changes ---
  onDateChange(event: any): void { // Use 'any' for event type for simplicity here
     const date = event.value as Date | null;
     this.selectedDate = date;
     this.availableSlots = []; // Clear previous slots
     this.slotErrorMessage = null;

     if (date && this.doctorId) {
         // Format date to 'yyyy-MM-dd' string required by backend
         const formattedDate = this.datePipe.transform(date, 'yyyy-MM-dd');
         if (!formattedDate) {
             this.handleError('Invalid date selected.', 'slot');
             return;
         }

         this.isLoadingSlots = true;
         this.slotService.getAvailableSlots(this.doctorId, formattedDate).subscribe({
             next: (slots) => {
                 this.availableSlots = slots;
                 if (slots.length === 0) {
                    this.snackBar.open(`No available slots for ${formattedDate}.`, 'Close', { duration: 3000 });
                 }
                 this.isLoadingSlots = false;
             },
             error: (err) => {
                 this.handleError(err.message || 'Failed to load available slots.', 'slot');
             }
         });
     }
  }

 // --- Method to handle navigation to booking form ---
 bookSlot(slot: AvailableSlot): void {
     console.log('Attempting to book slot:', slot);
     // Navigate to the booking form, passing doctorId and slot info
     // Use query parameters or state for passing data
     this.router.navigate(['/appointments/new'], { 
         queryParams: { 
             doctorId: this.doctorId, 
             time: slot.start_time // Pass the specific start time
         } 
     });
 }

  // --- Centralized Error Handling ---
  private handleError(message: string, type: 'doctor' | 'slot'): void {
     if (type === 'doctor') {
         this.doctorErrorMessage = message;
         this.isLoadingDoctor = false;
     } else {
         this.slotErrorMessage = message;
         this.isLoadingSlots = false;
     }
     console.error(`Error loading ${type}:`, message);
  }
}