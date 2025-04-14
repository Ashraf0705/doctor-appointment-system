import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// --- Interfaces ---
export interface Appointment {
    id: number;
    doctor_id: number;
    patient_name: string;
    patient_contact_info: string;
    appointment_time: string; 
    status: 'Pending' | 'Confirmed' | 'Cancelled';
    cancellation_code?: string | null; 
    created_at?: string;
    updated_at?: string;
    doctor_name?: string; // <-- ADDED Property to expect doctor's name
}

export interface AppointmentInput {
    doctorId: number;
    patientName: string;
    patientContactInfo: string;
    appointmentTime: string; 
}

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
        map(response => response.data.appointment), 
        catchError(this.handleError)
      );
  }

  // --- GET All Appointments --- 
  getAllAppointments(managementToken?: string): Observable<Appointment[]> {
     let params = new HttpParams();
     if (managementToken) {
        params = params.set('managementToken', managementToken); 
     }
     console.log(`[Frontend Appt Service] Fetching appointments. Token provided: ${managementToken ? 'Yes' : 'No'}`);
     // The backend now returns doctor_name, the interface expects it, map extracts it.
     return this.http.get<ApiResponse<{ appointments: Appointment[] }>>(this.apiUrl, { params }) 
       .pipe(
         map(response => response.data.appointments),
         catchError(this.handleError)
       );
   }

   // --- GET Appointment By ID ---
   getAppointmentById(id: number): Observable<Appointment> {
     const url = `${this.apiUrl}/${id}`;
      // Backend now returns doctor_name, interface expects it, map extracts it.
     return this.http.get<ApiResponse<{ appointment: Appointment }>>(url)
       .pipe(
         map(response => response.data.appointment),
         catchError(this.handleError)
       );
   }

  // --- CANCEL Appointment By Code ---
   cancelAppointmentByCode(code: string): Observable<{ status: string; message: string }> {
     const url = `${this.apiUrl}/cancel/${code}`;
     return this.http.delete<ApiResponse<null>>(url) 
       .pipe(
          map(response => ({ status: response.status, message: response.message || 'Cancelled' })), 
         catchError(this.handleError) 
       );
   }

  // --- UPDATE Appointment Status (By Doctor/Admin) ---
   updateAppointmentStatus(id: number, status: 'Confirmed' | 'Cancelled', managementToken: string): Observable<{ status: string; message: string }> {
       const url = `${this.apiUrl}/${id}/status`;
       let params = new HttpParams().set('managementToken', managementToken);
       const body = { status };
       console.log(`[Frontend Appt Service] Updating status for Appt ID: ${id} to ${status} using token.`);
       return this.http.put<ApiResponse<null>>(url, body, { params })
       .pipe(
            map(response => ({ status: response.status, message: response.message || 'Status updated' })),
           catchError(this.handleError)
       );
   }

   // --- Private Error Handling ---
   private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown appointment operation error occurred!';
    if (error.error instanceof ErrorEvent) errorMessage = `Network error: ${error.error.message}`;
    else errorMessage = `Server error: ${error.status} - ${error.error?.message || error.statusText}`;
    if ((error.status === 409 || error.status === 404 || error.status === 401) && error.error?.message) errorMessage = error.error.message; 
    console.error(`AppointmentService Error: ${errorMessage}`, error);
    return throwError(() => new Error(`Appointment operation failed: ${errorMessage}`)); 
  }
}