import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router'; // Import RouterLink

// Import Material Modules for Toolbar
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // <-- Make sure this is imported

@Component({
  selector: 'app-root',
  standalone: true,
  // Add modules to imports array
  imports: [
      RouterOutlet, 
      RouterLink, // Add RouterLink
      MatToolbarModule,
      MatButtonModule,
      MatIconModule // <-- Make sure it is included in this imports array
    ], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Doctor Appointment System'; // You can use this title in the template
}