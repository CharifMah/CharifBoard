import { Component, inject } from '@angular/core';
import { WindowsService } from '../../services/WindowsService';

interface CardLink {
  Title: string;
  CssClass: string;
  /** URL externe si carte-lien. */
  Href?: string;
  /** Identifiant de fenêtre si carte modale. */
  WindowId?: 'cvWindows' | 'Comp';
}

/**
 * Cartes d'action : CV, Langages/Outils, Association Okonda, LinkedIn.
 */
@Component({
  selector: 'app-cards',
  standalone: true,
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
})
export class CardsComponent {
  /** Service d'état des fenêtres. */
  public readonly Windows = inject(WindowsService);

  /** Cartes affichées. */
  public readonly Cards: CardLink[] = [
    { Title: 'Mon CV', CssClass: 'CVIcon', WindowId: 'cvWindows' },
    { Title: 'Languages/Outils', CssClass: 'Tools', WindowId: 'Comp' },
    { Title: 'Association Okonda', CssClass: 'Okonda', Href: 'https://okonda.fr/' },
    { Title: 'LinkedIn', CssClass: 'Tools', Href: 'https://www.linkedin.com/in/charif-mahmoud-11b53b18a/' },
  ];

  /**
   * Ouvre la fenêtre liée à la carte (si modale).
   * @param pCard Carte cliquée.
   */
  public OnCardClick(pCard: CardLink): void {
    if (pCard.WindowId) {
      this.Windows.Open(pCard.WindowId);
    }
  }
}