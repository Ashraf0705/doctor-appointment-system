import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Interface for the backend response structure
interface ApiResponse<T> {
  status: string;
  count?: number;
  data: T;
}

// Interface for an available slot
export interface AvailableSlot {
  start_time: string; // Format: YYYY-MM-DD HH:MM:SS
  end_time: string;   // Format: YYYY-MM-DD HH:MM:SS
}

@Injectable({
  providedIn: 'root'
})
export class SlotService {
  private apiUrl = 'http://localhost:3000/api/slots'; // Base URL for slot API
  private http = inject(HttpClient);

  // Get available slots for a doctor on a specific date
  getAvailableSlots(doctorId: number, date: string): Observable<AvailableSlot[]> {
    // Use HttpParams for query parameters
    let params = new HttpParams().set('date', date);
    const url = `${this.apiUrl}/doctor/${doctorId}`;

    return this.http.get<ApiResponse<{ availableSlots: AvailableSlot[] }>>(url, { params })
      .pipe(
        map(response => response.data.availableSlots),
        catchError(this.handleError)
      );
  }

  // Basic error handler (can be shared in a base service later)
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred fetching slots!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      errorMessage = `Server error: ${error.status} - ${error.error?.message || error.statusText}`;
    }
    console.error(`SlotService Error: ${errorMessage}`, error);
    return throwError(() => new Error(`Could not load available slots. ${errorMessage}`));
  }
}