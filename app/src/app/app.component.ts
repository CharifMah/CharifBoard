import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StarsBackgroundComponent } from './components/stars-background/stars-background.component';
import { SocialBarComponent } from './components/social-bar/social-bar.component';

/**
 * Composant racine de CharifBoard.
 * Fond étoilé + barre sociales persistants, le routeur affiche home ou playground.
 * Les fenêtres modales (CV, compétences) sont portées par chaque page.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    StarsBackgroundComponent,
    SocialBarComponent,
  ],
  template: `
    <app-stars-background />
    <app-social-bar />
    <router-outlet />
  `,
})
export class AppComponent {}