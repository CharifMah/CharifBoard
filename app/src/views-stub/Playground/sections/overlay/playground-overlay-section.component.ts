import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { CookieConsentComponent } from '@shared/components/cookie-consent/cookie-consent.component';
import { ButtonComponent } from '@shared/components/button/button.component';

/**
 * Section du playground démontrant les composants d'overlay :
 * Popup, CookieConsent.
 */
@Component({
  selector: 'app-playground-overlay-section',
  standalone: true,
  imports: [
    PlaygroundSectionComponent,
    PopupComponent,
    CookieConsentComponent,
    ButtonComponent
  ],
  templateUrl: './playground-overlay-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundOverlaySectionComponent extends BaseComponent
{
  //#region Attributes
  /** Indique si la popup exemple (défaut) est ouverte. */
  public readonly ShowPopup = signal(false);

  /** Indique si la popup exemple (erreur) est ouverte. */
  public readonly ShowPopupError = signal(false);

  /** Indique si la popup large est ouverte. */
  public readonly ShowPopupLarge = signal(false);

  /** Snippet copiable Popup. */
  public readonly PopupCode: string = `<app-popup [(isOpen)]="showPopup" title="Confirmer" icon="delete"
  type="error" [showFooter]="true" confirmText="Supprimer" cancelText="Annuler"
  (confirmed)="onConfirm()">
  <p>Cette action est irréversible.</p>
</app-popup>`;

  /** Snippet copiable CookieConsent. */
  public readonly CookieConsentCode: string = `<app-cookie-consent />`;
  //#endregion

  //#region Methods
  /**
   * Gère la confirmation de la popup défaut.
   */
  public OnPopupConfirmed(): void
  {
    this.ShowPopup.set(false);
  }

  /**
   * Gère la confirmation de la popup d'erreur.
   */
  public OnPopupErrorConfirmed(): void
  {
    this.ShowPopupError.set(false);
  }

  /**
   * Gère la confirmation de la popup large.
   */
  public OnPopupLargeConfirmed(): void
  {
    this.ShowPopupLarge.set(false);
  }
  //#endregion
}