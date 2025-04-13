import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http'; // Import HttpResponse
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators'; // Import map operator correctly

// Define interfaces matching backend response structures
export interface Doctor {
    id: number;
    name: string;
    specialization: string;
    experience: number;
    contact_info: string;
    management_token?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DoctorInput {
  name: string;
  specialization: string;
  experience: number;
  contact_info: string;
}

interface ApiResponse<T> {
  status: string;
  count?: number;
  message?: string;
  data: T; // The core data payload
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {

  private apiUrl = 'http://localhost:3000/api/doctors';

  constructor(private http: HttpClient) { }

  // --- GET All Doctors ---
  getDoctors(): Observable<Doctor[]> {
    return this.http.get<ApiResponse<{ doctors: Doctor[] }>>(this.apiUrl)
      .pipe(
        map(response => response.data.doctors), // Use map BEFORE catchError to extract array
        catchError(this.handleError)
      );
  }

  // --- GET Doctor by ID ---
  getDoctorById(id: number): Observable<Doctor> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<ApiResponse<{ doctor: Doctor }>>(url)
     .pipe(
       map(response => response.data.doctor), // Use map BEFORE catchError to extract object
       catchError(this.handleError)
     );
  }

  // --- CREATE Doctor ---
  createDoctor(doctorData: DoctorInput): Observable<Doctor> {
    return this.http.post<ApiResponse<{ doctor: Doctor }>>(this.apiUrl, doctorData)
      .pipe(
        map(response => response.data.doctor), // Use map BEFORE catchError
        catchError(this.handleError)
      );
  }

  // --- UPDATE Doctor (using management token) ---
  updateDoctor(token: string, doctorData: Partial<DoctorInput>): Observable<Doctor> {
     const url = `${this.apiUrl}/manage/${token}`;
     return this.http.put<ApiResponse<{ doctor: Doctor }>>(url, doctorData)
      .pipe(
        map(response => response.data.doctor), // Use map BEFORE catchError
        catchError(this.handleError)
      );
  }

   // --- DELETE Doctor (using management token) ---
   // Returns Observable<void> as backend sends 204 No Content
   deleteDoctor(token: string): Observable<void> {
     const url = `${this.apiUrl}/manage/${token}`;
     // Observe 'response' to check status code, expect no body on success
     return this.http.delete<void>(url, { observe: 'response' })
       .pipe(
          map((response: HttpResponse<void>) => { // Check the HttpResponse status
             if (response.status === 204) {
                return; // Success (void)
             } else {
               // This case is unlikely if backend is correct, as HttpClient throws for non-2xx
               // But good practice to handle potential unexpected success codes
               throw new Error(`Unexpected status code: ${response.status}`);
             }
          }),
         catchError(this.handleError) // Catch HTTP errors (4xx, 5xx)
       );
   }


  // --- Private Error Handling ---
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network error: ${error.error.message}`;
    } else {
       // Use the error message from the backend if available, otherwise use statusText
       errorMessage = `Server error: ${error.status} - ${error.error?.message || error.statusText}`;
    }
    console.error(`DoctorService Error: ${errorMessage}`, error); // Log full error too
    // Return an observable with a user-facing error message
    return throwError(() => new Error(`Operation failed. ${errorMessage}`)); // Make error more user-friendly
  }
}