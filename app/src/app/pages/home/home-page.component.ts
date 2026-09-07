import { Component } from '@angular/core';
import { StarsBackgroundComponent } from '../../components/stars-background/stars-background.component';
import { TitleComponent } from '../../components/title/title.component';
import { AboutComponent } from '../../components/about/about.component';
import { CardsComponent } from '../../components/cards/cards.component';
import { SlidersComponent } from '../../components/sliders/sliders.component';
import { WindowsHostComponent } from '../../components/windows-host/windows-host.component';

/**
 * Page d'accueil du portefolio : titre, présentation, cartes, carrousels.
 * Le fond étoilé et la barre sociale restent globaux (app.component).
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [StarsBackgroundComponent, TitleComponent, AboutComponent, CardsComponent, SlidersComponent, WindowsHostComponent],
  template: `
    <div class="main">
      <app-title />
      <app-about />
    </div>

    <app-windows-host />

    <div class="container">
      <app-cards />
      <app-sliders />
    </div>
  `,
})
export class HomePageComponent {}