import { Component, Input, inject, PLATFORM_ID, ChangeDetectionStrategy, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BaseComponent } from '@base/BaseComponent';

/**
 * Section réutilisable du playground. Encadre la démo d'un composant générique
 * avec un titre, une description et un snippet de code copiable.
 * Centralise la logique de copie et le tracking PostHog.
 */
@Component({
  selector: 'app-playground-section',
  standalone: true,
  imports: [],
  templateUrl: './playground-section.component.html',
  styleUrls: ['./playground-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundSectionComponent extends BaseComponent
{
  //#region Attributes
  /** Indique si on s'exécute côté navigateur (pour l'accès au clipboard). */
  private readonly _IsBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /** Indique que le code vient d'être copié (pour le feedback visuel). */
  public readonly Copied = signal(false);
  //#endregion

  //#region Inputs
  /** Ancre de la section (attribut id). */
  @Input() public id: string = '';
  /** Nom du composant démontré (titre h2). */
  @Input() public title: string = '';
  /** Description courte du composant. */
  @Input() public description: string = '';
  /** Snippet de code à copier (texte brut, échappé automatiquement par l'interpolation). */
  @Input() public code: string = '';
  /** Libellé optionnel du bloc code (affiché au-dessus du snippet). */
  @Input() public codeLabel: string = 'Code à copier';
  /** Catégorie métier de la section (affichée comme badge de statut). */
  @Input() public category: 'Base' | 'Data' | 'Navigation' | 'Overlay' | 'AI' | 'Form' | 'Design' = 'Base';
  //#endregion

  //#region Methods
  /**
   * Copie le snippet dans le presse-papier et tracke l'action dans PostHog.
   * Affiche un feedback "Copié" pendant 2 secondes.
   */
  public CopyCode(): void
  {
    if (!this._IsBrowser) return;

    navigator.clipboard.writeText(this.code).then((): void =>
    {
      this.Copied.set(true);
      this.PostHog.Capture(this.BuildTrackingName('playground_code_copied', 'tracking'), {
        length: this.code.length,
        section: this.id
      });

      setTimeout((): void =>
      {
        this.Copied.set(false);
      }, 2000);
    });
  }
  //#endregion
}