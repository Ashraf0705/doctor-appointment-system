import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, WeekDay } from '@angular/common'; 
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; 

// --- Material Modules ---
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field'; 
import { MatInputModule } from '@angular/material/input';          
import { MatSelectModule } from '@angular/material/select';       
import { MatDialog, MatDialogModule, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog'; // Added specific dialog imports
import { MatTooltipModule } from '@angular/material/tooltip'; 

// --- Services & Interfaces ---
import { AppointmentService, Appointment } from '../../../services/appointment.service';
import { AvailabilityService, AvailabilityBlock, AvailabilityBlockInput } from '../../../services/availability.service'; 
// import { DoctorService, Doctor } from '../../../services/doctor.service';

// --- Confirmation Dialog Component ---
import { ChangeDetectionStrategy } from '@angular/core'; 
import { MatButton } from '@angular/material/button'; 
@Component({
    selector: 'app-confirm-dialog',
    template: `
        <h2 mat-dialog-title>{{ title }}</h2>
        <mat-dialog-content>{{ message }}</mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button mat-dialog-close>Cancel</button>
            <button mat-button [mat-dialog-close]="true" color="warn">Delete</button> 
        </mat-dialog-actions>
    `,
    standalone: true,
     imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton], 
    changeDetection: ChangeDetectionStrategy.OnPush, 
})
export class ConfirmDialogComponent {
    title = 'Confirm Deletion';
    message = 'Are you sure you want to delete this item? This action cannot be undone.';
}
// --- End Confirmation Dialog Component ---


@Component({
  selector: 'app-manage-doctor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule, 
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDividerModule,
    MatFormFieldModule, 
    MatInputModule,
    MatSelectModule,    
    MatDialogModule,    
    MatTooltipModule,   
    ConfirmDialogComponent 
  ],
  providers: [DatePipe],
  templateUrl: './manage-doctor.component.html',
  styleUrls: ['./manage-doctor.component.css']
})
export class ManageDoctorComponent implements OnInit {

  // --- Properties ---
  appointments: Appointment[] = [];
  availabilityBlocks: AvailabilityBlock[] = []; 
  addBlockForm!: FormGroup; 
  
  isLoadingAppointments = true;
  isLoadingAvailability = true; 
  isSubmittingBlock = false; 
  errorMessage: string | null = null;
  managementToken: string | null = null;

  daysOfWeek = [
      { value: 1, viewValue: 'Monday' }, { value: 2, viewValue: 'Tuesday' },
      { value: 3, viewValue: 'Wednesday' }, { value: 4, viewValue: 'Thursday' },
      { value: 5, viewValue: 'Friday' }, { value: 6, viewValue: 'Saturday' },
      { value: 0, viewValue: 'Sunday' }
  ];

  // --- Injected Services ---
  private appointmentService = inject(AppointmentService);
  private availabilityService = inject(AvailabilityService); 
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private datePipe = inject(DatePipe);
  private fb = inject(FormBuilder); 
  private dialog = inject(MatDialog); 


  ngOnInit(): void {
    this.initializeAddBlockForm(); 

    this.route.paramMap.pipe(
      tap(params => {
        this.managementToken = params.get('token');
        console.log('[ManageDoctor] ngOnInit: Token from route:', this.managementToken);
        this.resetLoadingAndErrors(); // Reset flags here
        if (!this.managementToken) {
          this.handleError('Management token not found in URL.');
        }
      }),
      switchMap(params => {
        const token = params.get('token');
        if (token) {
            this.loadAppointments(token); 
            this.loadAvailability(token); 
            return of(true); 
        } else {
          return of(false); 
        }
      })
    ).subscribe(); 
  }

  initializeAddBlockForm(): void {
      this.addBlockForm = this.fb.group({
         day_of_week: [null, Validators.required],
         start_time: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]], 
         end_time: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]]   
      });
  }

  // --- Load Appointments ---
  loadAppointments(token: string): void {
      this.isLoadingAppointments = true;
      this.appointmentService.getAllAppointments(token).subscribe({
        next: (data) => { this.appointments = data; this.isLoadingAppointments = false; },
        error: (err) => this.handleError(err.message || 'Failed to load appointments.')
      });
  }

  // --- Load Availability Blocks ---
  loadAvailability(token: string): void {
       this.isLoadingAvailability = true;
       this.availabilityService.getAvailabilityBlocks(token).subscribe({
           next: (data) => { this.availabilityBlocks = data; this.isLoadingAvailability = false; },
           error: (err) => this.handleError(err.message || 'Failed to load availability blocks.')
       });
  }

  // --- Add Availability Block ---
  onAddBlockSubmit(): void {
       this.errorMessage = null;
       if (this.addBlockForm.invalid || !this.managementToken) {
           this.addBlockForm.markAllAsTouched(); return;
       }
        const start = this.addBlockForm.value.start_time;
        const end = this.addBlockForm.value.end_time;
        if (start && end && start >= end) {
            this.snackBar.open('Start time must be before end time.', 'Error', { duration: 4000 }); return;
        }

       this.isSubmittingBlock = true;
       const blockInput: AvailabilityBlockInput = {
            day_of_week: this.addBlockForm.value.day_of_week,
            start_time: start, end_time: end
       };

       this.availabilityService.addAvailabilityBlock(this.managementToken, blockInput).subscribe({
           next: (newBlock) => {
                this.isSubmittingBlock = false;
                this.snackBar.open('Availability block added successfully!', 'OK', { duration: 3000 });
                this.availabilityBlocks.push(newBlock); 
                this.availabilityBlocks.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
                this.addBlockForm.reset(); 
           },
           error: (err) => {
                this.isSubmittingBlock = false;
                this.snackBar.open(err.message || 'Failed to add block.', 'Error', { duration: 5000 });
                this.handleError(err.message); 
           }
       });
  }

  // --- Delete Availability Block ---
   deleteBlock(blockId: number): void {
       if (!this.managementToken) return;
        const dialogRef = this.dialog.open(ConfirmDialogComponent); 
        dialogRef.afterClosed().subscribe(result => {
            if (result === true) { 
                 console.log(`[ManageDoctor] User confirmed deletion for block ID: ${blockId}`);
                 this.availabilityService.deleteAvailabilityBlock(this.managementToken!, blockId).subscribe({
                     next: () => {
                         this.snackBar.open('Availability block deleted successfully.', 'OK', { duration: 3000 });
                         this.availabilityBlocks = this.availabilityBlocks.filter(b => b.id !== blockId);
                     },
                     error: (err) => {
                          this.snackBar.open(err.message || 'Failed to delete block.', 'Error', { duration: 5000 });
                         this.handleError(err.message);
                     }
                 });
            } else { console.log(`[ManageDoctor] User cancelled deletion for block ID: ${blockId}`); }
        });
   }

  // --- Confirm/Cancel Appointment Methods ---
   confirmAppointment(appointmentId: number): void {
    if (!this.managementToken) return;
    this.appointmentService.updateAppointmentStatus(appointmentId, 'Confirmed', this.managementToken).subscribe({
      next: (response) => { this.snackBar.open(response.message, 'OK', { duration: 3000 }); this.refreshAppointments(); },
      error: (err) => { this.snackBar.open(err.message || 'Failed to confirm appointment.', 'Error', { duration: 5000 }); }
    });
  }
   cancelAppointment(appointmentId: number): void {
     if (!this.managementToken) return;
    this.appointmentService.updateAppointmentStatus(appointmentId, 'Cancelled', this.managementToken).subscribe({
      next: (response) => { this.snackBar.open(response.message, 'OK', { duration: 3000 }); this.refreshAppointments(); },
      error: (err) => { this.snackBar.open(err.message || 'Failed to cancel appointment.', 'Error', { duration: 5000 }); }
    });
  }
   refreshAppointments(): void { if (this.managementToken) this.loadAppointments(this.managementToken); }

  // --- Helper to Reset Flags --- // ADDED
  private resetLoadingAndErrors(): void {
      this.isLoadingAppointments = true;
      this.isLoadingAvailability = true;
      this.isSubmittingBlock = false;
      this.errorMessage = null;
  }

  // --- Error Handling ---
   private handleError(message: string): void {
      this.errorMessage = message; 
      this.isLoadingAppointments = false; 
      this.isLoadingAvailability = false;
      this.isSubmittingBlock = false;
      console.error('[ManageDoctor Error]:', message);
   }
   
   // --- Helper function to determine chip color based on status --- // ADDED IMPLEMENTATION
   getStatusColor(status: 'Pending' | 'Confirmed' | 'Cancelled'): string {
       switch (status) {
           case 'Confirmed': return 'primary'; 
           case 'Pending': return 'accent';  
           case 'Cancelled': return 'warn';    
           default: return ''; 
       }
   }
}