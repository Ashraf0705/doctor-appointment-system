import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; 
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; 
import { switchMap } from 'rxjs/operators'; 
import { Observable, of } from 'rxjs'; 

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker'; 
import { MatNativeDateModule } from '@angular/material/core';      
import { MatFormFieldModule } from '@angular/material/form-field'; 
import { MatInputModule } from '@angular/material/input';          
import { MatChipsModule } from '@angular/material/chips'; 
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
    providers: [DatePipe], 
    templateUrl: './doctor-details.component.html',
    styleUrls: ['./doctor-details.component.css']
})
export class DoctorDetailsComponent implements OnInit {

    doctor: Doctor | null = null;
    availableSlots: AvailableSlot[] = [];
    selectedDate: Date | null = null; 
    isLoadingDoctor = true;
    isLoadingSlots = false; 
    doctorErrorMessage: string | null = null;
    slotErrorMessage: string | null = null;
    doctorId!: number; 

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private doctorService = inject(DoctorService);
    private slotService = inject(SlotService);
    private snackBar = inject(MatSnackBar);
    private datePipe = inject(DatePipe); 

    ngOnInit(): void {
        console.log('[DetailsComponent] OnInit'); // Component init log
        this.route.paramMap.pipe(
            switchMap(params => {
                const idParam = params.get('id');
                console.log('[DetailsComponent] Route param id:', idParam); // Log route param
                if (!idParam) {
                    this.handleError('Doctor ID not found in route.', 'doctor');
                    return of(null); 
                }
                this.doctorId = +idParam; 
                if (isNaN(this.doctorId)) {
                    this.handleError('Invalid Doctor ID in route.', 'doctor');
                    return of(null);
                }
                this.isLoadingDoctor = true;
                this.doctorErrorMessage = null;
                 console.log(`[DetailsComponent] Fetching doctor with ID: ${this.doctorId}`); // Log before fetch
                return this.doctorService.getDoctorById(this.doctorId); 
            })
        ).subscribe({
            next: (data) => {
                console.log('[DetailsComponent] Doctor data received:', data); // Log received doctor data
                if (data) {
                    this.doctor = data;
                } else {
                    if (!this.doctorErrorMessage) { 
                        // Corrected missing quote:
                        this.handleError(`Doctor with ID ${this.doctorId} not found.`, 'doctor'); 
                    }
                }
                this.isLoadingDoctor = false;
            },
            error: (err) => {
                console.error('[DetailsComponent] Error fetching doctor:', err); // Log full error
                this.handleError(err.message || 'Failed to load doctor details.', 'doctor');
            }
        });
    }

    onDateChange(event: any): void { 
        const date = event.value as Date | null;
        console.log('[DetailsComponent] Date selected:', date); // Log selected date object
        this.selectedDate = date;
        this.availableSlots = []; 
        this.slotErrorMessage = null;

        if (date && this.doctorId) {
            const formattedDate = this.datePipe.transform(date, 'yyyy-MM-dd');
            console.log('[DetailsComponent] Formatted date for API:', formattedDate); // Log formatted date
            if (!formattedDate) { 
                this.handleError('Invalid date selected.', 'slot');
                return;
            }
            this.isLoadingSlots = true;
            this.slotService.getAvailableSlots(this.doctorId, formattedDate).subscribe({
                next: (slots) => {
                    console.log('[DetailsComponent] Slots received from service:', slots); // Log received slots
                    this.availableSlots = slots;
                    if (slots.length === 0 && this.selectedDate) { // Only show snackbar if a date was actually selected
                        this.snackBar.open(`No available slots found for ${formattedDate}.`, 'Close', { duration: 3000 });
                    }
                    this.isLoadingSlots = false;
                },
                error: (err) => {
                     console.error('[DetailsComponent] Error fetching slots:', err); // Log full error
                    this.handleError(err.message || 'Failed to load available slots.', 'slot');
                }
            });
        }
    }

    bookSlot(slot: AvailableSlot): void {
        console.log('[DetailsComponent] Attempting to book slot:', slot); 
        this.router.navigate(['/appointments/new'], {
            queryParams: {
                doctorId: this.doctorId,
                time: slot.start_time 
            }
        });
    }

    private handleError(message: string, type: 'doctor' | 'slot'): void {
        console.error(`[DetailsComponent] Handling ${type} error:`, message); // Log error being handled
        if (type === 'doctor') {
            this.doctorErrorMessage = message;
            this.isLoadingDoctor = false;
        } else {
            this.slotErrorMessage = message;
            this.isLoadingSlots = false;
        }
        // console.error removed to avoid duplicate logging
    }
}