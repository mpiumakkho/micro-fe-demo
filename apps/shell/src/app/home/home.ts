import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { authStore } from '@mfe-demo/platform';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly isAuthenticated = authStore.isAuthenticated;
}
