import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// --- Interfaces ---
// Matches backend AvailabilityBlock structure
export interface AvailabilityBlock {
    id: number;
    doctor_id: number;
    day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
    start_time: string; // Format: HH:MM:SS
    end_time: string;   // Format: HH:MM:SS
    created_at?: string;
    updated_at?: string;
}

// Input for creating a block
export interface AvailabilityBlockInput {
    day_of_week: number;
    start_time: string; // Format: HH:MM
    end_time: string;   // Format: HH:MM
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
export class AvailabilityService {
  private apiUrl = 'http://localhost:3000/api/availability'; // Base URL for availability API
  private http = inject(HttpClient);

  // --- GET Doctor's Availability Blocks ---
  getAvailabilityBlocks(managementToken: string): Observable<AvailabilityBlock[]> {
      const url = `${this.apiUrl}/manage/${managementToken}`;
      console.log(`[Frontend Avail Service] Getting blocks for token: ${managementToken}`);
      return this.http.get<ApiResponse<{ availabilityBlocks: AvailabilityBlock[] }>>(url)
          .pipe(
              map(response => response.data.availabilityBlocks),
              catchError(this.handleError)
          );
  }

  // --- ADD Availability Block ---
  addAvailabilityBlock(managementToken: string, blockData: AvailabilityBlockInput): Observable<AvailabilityBlock> {
      const url = `${this.apiUrl}/manage/${managementToken}`;
      console.log(`[Frontend Avail Service] Adding block for token: ${managementToken}`, blockData);
      return this.http.post<ApiResponse<{ availabilityBlock: AvailabilityBlock }>>(url, blockData)
          .pipe(
              map(response => response.data.availabilityBlock),
              catchError(this.handleError)
          );
  }

  // --- DELETE Availability Block ---
  deleteAvailabilityBlock(managementToken: string, blockId: number): Observable<void> {
       const url = `${this.apiUrl}/manage/${managementToken}/${blockId}`;
       console.log(`[Frontend Avail Service] Deleting block ID: ${blockId} for token: ${managementToken}`);
       // Expect 204 No Content on success
       return this.http.delete<void>(url, { observe: 'response' })
        .pipe(
            map((response: HttpResponse<void>) => {
                if (response.status === 204) { return; } // Success
                else { throw new Error(`Unexpected status code: ${response.status}`); }
            }),
            catchError(this.handleError)
        );
  }


  // --- Private Error Handling ---
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown availability operation error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network error: ${error.error.message}`;
    } else {
       errorMessage = `Server error: ${error.status} - ${error.error?.message || error.statusText}`;
        if ((error.status === 404 || error.status === 401 || error.status === 400) && error.error?.message) {
           errorMessage = error.error.message; // Use specific backend message
        }
    }
    console.error(`AvailabilityService Error: ${errorMessage}`, error);
    return throwError(() => new Error(`Availability operation failed: ${errorMessage}`)); 
  }
}