import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';

/**
 * Section dediee du playground : composant Badge.
 * Variants, compteur, icone, pulse, shape, removable.
 */
@Component({
  selector: 'app-playground-badge-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, BadgeComponent],
  templateUrl: './playground-badge-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundBadgeSectionComponent extends BaseComponent
{
  /** Snippet copiable du composant Badge. */
  public readonly BadgeCode: string = `<app-badge type="success" label="Validé" icon="check" />
<app-badge type="error" [count]="5" label="Alertes" [pulse]="true" />
<app-badge type="success" label="En ligne" [shape]="'circle'" />
<app-badge type="default" label="Outline" [variant]="'outline'" />`;
}