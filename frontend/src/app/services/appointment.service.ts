import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// --- Interfaces ---
// Matches backend Appointment structure
export interface Appointment {
    id: number;
    doctor_id: number;
    patient_name: string;
    patient_contact_info: string;
    appointment_time: string; // Comes as string/Date from backend
    status: 'Pending' | 'Confirmed' | 'Cancelled';
    cancellation_code?: string | null; // Returned on creation/specific get maybe
    created_at?: string;
    updated_at?: string;
    // Optionally include doctor details if backend joins them
    // doctor?: { name: string; specialization: string; }; 
}

// Input for booking
export interface AppointmentInput {
    doctorId: number;
    patientName: string;
    patientContactInfo: string;
    appointmentTime: string; // Format: 'YYYY-MM-DD HH:MM:SS'
}

// Matches backend success response structure
interface ApiResponse<T> {
  status: string;
  count?: number;
  message?: string;
  data: T;
}


@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = 'http://localhost:3000/api/appointments';
  private http = inject(HttpClient);

  // --- BOOK Appointment ---
  bookAppointment(bookingData: AppointmentInput): Observable<Appointment> {
    return this.http.post<ApiResponse<{ appointment: Appointment }>>(this.apiUrl, bookingData)
      .pipe(
        map(response => response.data.appointment), // Extract appointment details
        catchError(this.handleError)
      );
  }

  // --- GET All Appointments ---
  // Optional query params for filtering can be added later
  getAllAppointments(filters?: { doctorId?: number; date?: string }): Observable<Appointment[]> {
     let params = new HttpParams();
     if (filters?.doctorId) {
       params = params.set('doctorId', filters.doctorId.toString());
     }
      if (filters?.date) {
       params = params.set('date', filters.date);
     }
     // Backend needs to support these filters if used
     return this.http.get<ApiResponse<{ appointments: Appointment[] }>>(this.apiUrl, { params })
       .pipe(
         map(response => response.data.appointments),
         catchError(this.handleError)
       );
   }

   // --- GET Appointment By ID ---
   getAppointmentById(id: number): Observable<Appointment> {
     const url = `${this.apiUrl}/${id}`;
     return this.http.get<ApiResponse<{ appointment: Appointment }>>(url)
       .pipe(
         map(response => response.data.appointment),
         catchError(this.handleError)
       );
   }

  // --- CANCEL Appointment By Code ---
  // Returns observable indicating success/failure message from backend potentially
   cancelAppointmentByCode(code: string): Observable<{ status: string; message: string }> {
     const url = `${this.apiUrl}/cancel/${code}`;
     // Backend returns 200 OK with JSON body for this one
     return this.http.delete<ApiResponse<null>>(url) // Expecting {status, message} in body now
       .pipe(
         // Map the successful response {status, message}
          map(response => ({ status: response.status, message: response.message || 'Cancelled' })), 
         catchError(this.handleError) 
       );
   }


  // --- UPDATE Appointment Status (By Doctor/Admin) ---
   updateAppointmentStatus(id: number, status: 'Confirmed' | 'Cancelled', managementToken: string): Observable<{ status: string; message: string }> {
       const url = `${this.apiUrl}/${id}/status`;
       let params = new HttpParams().set('managementToken', managementToken);
       const body = { status };

       return this.http.put<ApiResponse<null>>(url, body, { params })
       .pipe(
           // Map the successful response {status, message}
            map(response => ({ status: response.status, message: response.message || 'Status updated' })),
           catchError(this.handleError)
       );
   }


  // --- Private Error Handling ---
   private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown appointment operation error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network error: ${error.error.message}`;
    } else {
       errorMessage = `Server error: ${error.status} - ${error.error?.message || error.statusText}`;
       // Handle specific backend errors cleanly
        if (error.status === 409 && error.error?.message) { // e.g., Slot unavailable, Race condition
            errorMessage = error.error.message; // Use backend message directly
        } else if (error.status === 404 && error.error?.message) { // e.g., Invalid cancellation code
             errorMessage = error.error.message;
        }
    }
    console.error(`AppointmentService Error: ${errorMessage}`, error);
    // Return user-friendly error
    // For specific errors like 409, just return the message from backend
     if (error.status === 409 || error.status === 404) {
          return throwError(() => new Error(errorMessage));
     }
    return throwError(() => new Error(`Appointment operation failed. ${errorMessage}`)); 
  }

}