import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import {
  EStatCardVariant,
  STAT_CARD_VARIANTS,
  StatCardVariantService
} from '@core/services/ui/stat-card-variant.service';

/**
 * Une démo de carte, utilisée pour afficher une même donnée sous plusieurs variantes
 * et tester rapidement les accents disponibles.
 */
interface IStatCardDemo {
  /** Clé i18n (ex: 'caEncaisse') pour retrouver le label/hint traduit. */
  Key: string;
  /** Valeur principale (texte déjà formaté). */
  Value: string;
  /** Icône Material Icons. */
  Icon: string;
  /** Accent sémantique. */
  Accent: 'success' | 'info' | 'danger' | 'warning' | 'primary' | 'neutral';
}

/**
 * Section du playground démontrant le composant `app-stat-card` :
 * - 4 variantes visuelles côte à côte (minimal-flat, glass-morphism, duotone-modern, outline-tech)
 * - Sélecteur global de variante appliqué à toute l'app via `StatCardVariantService`
 * - Accents `success`, `info`, `danger`, `warning`, `primary`, `neutral`
 */
@Component({
  selector: 'app-playground-stat-card-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, StatCardComponent, TranslatePipe],
  templateUrl: './playground-stat-card-section.component.html',
  styleUrl: './playground-stat-card-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundStatCardSectionComponent extends BaseComponent
{
  //#region Attributes
  /** Service global de variante (signal + localStorage). */
  public readonly VariantService: StatCardVariantService = inject(StatCardVariantService);
  //#endregion

  //#region Properties
  /** Liste des variantes disponibles pour le sélecteur. */
  public readonly Variants: ReadonlyArray<EStatCardVariant> = STAT_CARD_VARIANTS;

  /** Démos alignées sur les 6 cartes actuelles du dashboard CRM. */
  public readonly Demos: IStatCardDemo[] = [
    { Key: 'caEncaisse', Value: '246 €', Icon: 'payments', Accent: 'success' },
    { Key: 'caPotentiel', Value: '0 €', Icon: 'savings', Accent: 'info' },
    { Key: 'caPerdu', Value: '0 €', Icon: 'trending_down', Accent: 'danger' },
    { Key: 'mandatsActifs', Value: '0', Icon: 'assignment', Accent: 'primary' },
    { Key: 'compromis', Value: '0', Icon: 'handshake', Accent: 'warning' },
    { Key: 'contacts', Value: '13', Icon: 'contacts', Accent: 'neutral' }
  ];

  /** Snippet copiable du composant. */
  public readonly StatCardCode: string = `<app-stat-card
  label="CA encaissé"
  value="246 €"
  icon="payments"
  hint="Chiffre d'affaires encaissé (Réalisé)"
  formula="Σ(honorairesEncaisses + revenuTotalEncaisse) de toutes les transactions"
  accent="success"
  [clickable]="true"
  (cardClick)="OnCardClick()">
</app-stat-card>

<!-- Variante contrôlée globalement via StatCardVariantService -->
<!-- (les 4 variantes sont : minimal-flat | glass-morphism | duotone-modern | outline-tech) -->`;
  //#endregion

  //#region Methods
  /**
   * Bascule la variante globale de toutes les `<app-stat-card>` de l'application.
   * Le choix est persisté en localStorage par le service.
   * @param pVariant La variante à appliquer globalement.
   */
  public OnVariantChange(pVariant: EStatCardVariant): void
  {
    this.VariantService.SetVariant(pVariant);
    this.PostHog.Capture(this.BuildTrackingName('stat_card_variant_change', 'tracking'), { variant: pVariant });
  }

  /**
   * Retourne la classe d'item actif pour le bouton de variante correspondant.
   * @param pVariant La variante à tester.
   * @returns La classe CSS à appliquer.
   */
  public ActiveClass(pVariant: EStatCardVariant): string
  {
    return this.VariantService.Variant() === pVariant ? 'playground-stat-card__variant-btn--active' : '';
  }
  //#endregion
}
