import { Component } from '@angular/core';
import { SkeletonComponent, BadgeComponent } from '@sellmatch/ui';

/**
 * Page playground : démo live des composants du package @sellmatch/ui.
 */
@Component({
  selector: 'app-playground-page',
  standalone: true,
  imports: [SkeletonComponent, BadgeComponent],
  templateUrl: './playground-page.component.html',
  styleUrl: './playground-page.component.scss',
})
export class PlaygroundPageComponent {
  /** Badges de démo. */
  public readonly Badges = [
    { type: 'new' as const, label: 'Nouveau' },
    { type: 'hot' as const, label: 'Tendance' },
    { type: 'premium' as const, label: 'Premium' },
    { type: 'success' as const, label: 'Actif' },
    { type: 'info' as const, label: 'Info' },
  ];
}