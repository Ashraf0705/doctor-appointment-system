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
        console.log(`[Frontend SlotService] Fetching slots for Dr ID: ${doctorId}, Date: ${date}`); // Log input
        let params = new HttpParams().set('date', date);
        const url = `${this.apiUrl}/doctor/${doctorId}`;
        console.log(`[Frontend SlotService] Requesting URL: ${url} with params:`, params.toString()); // Log URL & Params

        return this.http.get<ApiResponse<{ availableSlots: AvailableSlot[] }>>(url, { params })
            .pipe(
                map(response => {
                    console.log('[Frontend SlotService] Raw API Response:', response); // Log raw response
                    // Basic check for expected structure before accessing data
                    if (response && response.status === 'success' && response.data && Array.isArray(response.data.availableSlots)) {
                       console.log('[Frontend SlotService] Extracted Slots:', response.data.availableSlots);
                       return response.data.availableSlots;
                    } else {
                       console.error('[Frontend SlotService] Unexpected API response structure:', response);
                       throw new Error('Invalid data structure received from server for available slots.'); // Throw specific error
                    }
                 }),
                catchError(this.handleError) // Catch HTTP errors or errors from map
            );
    }

    // Basic error handler
    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'An unknown error occurred fetching slots!';
        if (error.error instanceof ErrorEvent) {
            errorMessage = `Network error: ${error.error.message}`;
        } else {
            errorMessage = `Server error: ${error.status} - ${error.error?.message || error.statusText}`;
        }
        console.error(`[Frontend SlotService] Error: ${errorMessage}`, error); // Log full error
        // Return a user-friendly error message
        // Use the already formatted message if it came from map operator
        const finalMessage = error.message.startsWith('Invalid data structure') ? error.message : `Could not load available slots. ${errorMessage}`;
        return throwError(() => new Error(finalMessage));
    }
}