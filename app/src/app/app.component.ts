import { Component } from '@angular/core';
import { StarsBackgroundComponent } from './components/stars-background/stars-background.component';
import { SocialBarComponent } from './components/social-bar/social-bar.component';
import { TitleComponent } from './components/title/title.component';
import { AboutComponent } from './components/about/about.component';
import { WindowsHostComponent } from './components/windows-host/windows-host.component';
import { CardsComponent } from './components/cards/cards.component';
import { SlidersComponent } from './components/sliders/sliders.component';

/**
 * Composant racine de CharifBoard.
 * Assemble le fond étoilé, la barre sociale, le titre, la présentation,
 * les cartes, les fenêtres modales et les carrousels de créations.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    StarsBackgroundComponent,
    SocialBarComponent,
    TitleComponent,
    AboutComponent,
    WindowsHostComponent,
    CardsComponent,
    SlidersComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}