import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';
import { HelpCardComponent } from '@shared/components/help-card/help-card.component';
import { ScrollIndicatorComponent } from '@shared/components/scroll-indicator/scroll-indicator.component';
import { ButtonComponent } from '@shared/components/button/button.component';

/**
 * Section dediee du playground : cartes reutilisables.
 * Regroupe SectionCard (mode statique + mode collapsible), HelpCard, ScrollIndicator.
 */
@Component({
  selector: 'app-playground-cards-section',
  standalone: true,
  imports: [
    PlaygroundSectionComponent,
    SectionCardComponent,
    HelpCardComponent,
    ScrollIndicatorComponent,
    ButtonComponent
  ],
  templateUrl: './playground-cards-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundCardsSectionComponent extends BaseComponent
{
  /** Snippet copiable SectionCard (mode statique). */
  public readonly SectionCardCode: string = `<app-section-card Title="Mes contacts" Icon="contacts" [ShowSeeAll]="true"
  SeeAllLabel="Voir tout" SeeAllLink="/crm/contacts">
  <!-- contenu -->
</app-section-card>`;

  /** Snippet copiable SectionCard (mode collapsible + slot header-title + slot header-actions). */
  public readonly SectionCardCollapsibleCode: string = `<app-section-card [Collapsible]="true" [Collapsed]="false"
  (CollapsedChange)="onToggle($event)" Icon="folder">
  <div slot="header-title"><strong>Titre personnalise</strong></div>
  <div slot="header-actions">
    <app-button variant="ghost" size="sm" [circle]="true" icon="edit"
      (ButtonClick)="onAction('edit')" />
  </div>
  <p>Contenu de la carte repliable.</p>
</app-section-card>`;

  /** Snippet copiable HelpCard. */
  public readonly HelpCardCode: string = `<app-help-card title="Besoin d'aide ?"
  message="Consultez notre documentation."
  buttonText="Voir l'aide" />`;

  /** Snippet copiable ScrollIndicator. */
  public readonly ScrollIndicatorCode: string = `<app-scroll-indicator label="Remonter" />`;

  /**
   * Gere le clic sur une action d'en-tete de la SectionCard repliable demo.
   * @param pAction Identifiant de l'action declenchee.
   */
  public OnCollapsibleAction(pAction: string): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_collapsible_action', 'tracking'), { action: pAction });
  }
}
