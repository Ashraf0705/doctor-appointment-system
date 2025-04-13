import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider'; // <-- Import Added

// Services & Interfaces
import { AppointmentService, AppointmentInput } from '../../../services/appointment.service';
import { DoctorService, Doctor } from '../../../services/doctor.service';

@Component({
  selector: 'app-appointment-form',
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
    MatSnackBarModule,
    MatDividerModule // <-- Added to imports array
    ],
    providers: [DatePipe], // Provide DatePipe
    templateUrl: './appointment-form.component.html', 
    styleUrls: ['./appointment-form.component.css'] 
})
export class AppointmentFormComponent implements OnInit {

  appointmentForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  doctor: Doctor | null = null; 
  doctorId: number | null = null;
  appointmentTime: string | null = null; 

  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private doctorService = inject(DoctorService); 
  private route = inject(ActivatedRoute); 
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private datePipe = inject(DatePipe);

  ngOnInit(): void {
    this.initializeForm();
    this.getRouteData();
  }

  initializeForm(): void {
    this.appointmentForm = this.fb.group({
      patientName: ['', [Validators.required, Validators.minLength(2)]],
      patientContactInfo: ['', [Validators.required, Validators.email]]
    });
  }

  getRouteData(): void {
    this.route.queryParamMap.subscribe(params => {
      const docId = params.get('doctorId');
      const time = params.get('time'); 

      if (docId && time) {
        this.doctorId = +docId;
        this.appointmentTime = time;
        if (this.doctorId) {
            this.fetchDoctorDetails(this.doctorId);
        }
      } else {
        this.errorMessage = "Doctor ID or Appointment Time missing. Cannot book appointment.";
        console.error('Missing query parameters for booking.');
         this.snackBar.open(this.errorMessage, 'Error', { duration: 5000 });
         this.router.navigate(['/doctors']); 
      }
    });
  }

  fetchDoctorDetails(id: number): void {
      this.doctorService.getDoctorById(id).subscribe({
          next: (doc) => this.doctor = doc,
          error: (err) => console.error("Could not fetch doctor details:", err) 
      });
  }

  get f() { return this.appointmentForm.controls; }

  onSubmit(): void {
    this.errorMessage = null;

    if (this.appointmentForm.invalid || !this.doctorId || !this.appointmentTime) {
      this.appointmentForm.markAllAsTouched();
      console.error("Form invalid or missing booking info");
      return;
    }

    this.isLoading = true;

    const bookingData: AppointmentInput = {
      doctorId: this.doctorId,
      appointmentTime: this.appointmentTime,
      patientName: this.f['patientName'].value,
      patientContactInfo: this.f['patientContactInfo'].value
    };

    this.appointmentService.bookAppointment(bookingData).subscribe({
      next: (newAppointment) => {
        this.isLoading = false;
        console.log('Appointment booked:', newAppointment);
        this.snackBar.open(
          `Appointment booked successfully for ${this.datePipe.transform(newAppointment.appointment_time, 'medium')}! Cancellation Code: ${newAppointment.cancellation_code}`,
           'OK', 
           { duration: 15000 } 
           ); 
        this.router.navigate(['/appointments']); 
      },
      error: (err) => {
        this.isLoading = false;
        const errorMsg = err.message || 'Failed to book appointment.'; 
        this.errorMessage = errorMsg; 
        console.error('Error booking appointment:', err);
        this.snackBar.open(errorMsg, 'Error', { duration: 7000 }); 
      }
    });
  }
}