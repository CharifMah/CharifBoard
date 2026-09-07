import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';

/**
 * Section du playground démontrant le composant Button (variants, tailles, icônes, états, groupes, gradients).
 * La palette de couleurs est dans l'onglet dedie : /playground?playground=palette.
 */
@Component({
  selector: 'app-playground-buttons-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, ButtonComponent, InputComponent],
  templateUrl: './playground-buttons-section.component.html',
  styleUrls: ['./playground-buttons-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundButtonsSectionComponent extends BaseComponent
{
  //#region Attributes
  /** Active l'état loading sur les boutons de démo. */
  public readonly IsLoading = signal(false);
  /** Active l'état disabled sur les boutons de démo. */
  public readonly IsDisabled = signal(false);
  /** Active l'apparence d'erreur sur les boutons de démo. */
    public readonly IsError = signal(false);

    // - cm - Toggles locaux a la section "Gradients animes" pour voir loading/disabled/error
    // - cm - en parallele sur des boutons plein gradient.
    public readonly IsGradientLoading = signal(false);
    public readonly IsGradientDisabled = signal(false);
    public readonly IsGradientError = signal(false);

    public ToggleGradientLoading(pValue?: boolean): void
    {
      if (typeof pValue === 'boolean') { this.IsGradientLoading.set(pValue); return; }
      this.IsGradientLoading.update((pC: boolean): boolean => !pC);
    }
    public ToggleGradientDisabled(pValue?: boolean): void
    {
      if (typeof pValue === 'boolean') { this.IsGradientDisabled.set(pValue); return; }
      this.IsGradientDisabled.update((pC: boolean): boolean => !pC);
    }
    public ToggleGradientError(pValue?: boolean): void
    {
      if (typeof pValue === 'boolean') { this.IsGradientError.set(pValue); return; }
      this.IsGradientError.update((pC: boolean): boolean => !pC);
    }

  /** Snippet copiable du bouton. */
  public readonly ButtonCode: string = `<app-button variant="primary" icon="save" (ButtonClick)="onSave()">Enregistrer</app-button>
<app-button variant="danger" icon="delete" size="sm" [loading]="isLoading">Supprimer</app-button>
<app-button variant="ghost" icon="close" [circle]="true" ariaLabel="Fermer" />
<app-button variant="primary" [outline]="true" [rounded]="true">Outline</app-button>
<app-button variant="primary" routerLink="/dashboard" routerLinkActive="active">Tableau de bord</app-button>
<app-button gradient="default" icon="auto_awesome">Gradient</app-button>`;
  //#endregion

  //#region Methods
  /**
   * Active ou désactive l'état loading sur les boutons de démo.
   * @param pValue Nouvelle valeur de la checkbox.
   */
  public ToggleLoading(pValue?: boolean): void
  {
    if (typeof pValue === 'boolean')
    {
      this.IsLoading.set(pValue);
      return;
    }
    this.IsLoading.update((pCurrent: boolean): boolean => !pCurrent);
  }

  /**
   * Active ou désactive l'état disabled sur les boutons de démo.
   * @param pValue Nouvelle valeur de la checkbox.
   */
  public ToggleDisabled(pValue?: boolean): void
  {
    if (typeof pValue === 'boolean')
    {
      this.IsDisabled.set(pValue);
      return;
    }
    this.IsDisabled.update((pCurrent: boolean): boolean => !pCurrent);
  }

  /**
   * Active ou désactive l'apparence d'erreur sur les boutons de démo.
   * @param pValue Nouvelle valeur de la checkbox.
   */
  public ToggleError(pValue?: boolean): void
  {
    if (typeof pValue === 'boolean')
    {
      this.IsError.set(pValue);
      return;
    }
    this.IsError.update((pCurrent: boolean): boolean => !pCurrent);
  }
  //#endregion
}