import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
// Import HttpClient providers
import { provideHttpClient, withFetch } from '@angular/common/http'; 

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    provideAnimationsAsync(), // For Angular Material animations
    provideHttpClient(withFetch()) // <-- Ensure this line is present (withFetch is common)
  ]
};