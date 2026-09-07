import { Component, inject, signal, OnInit, PLATFORM_ID, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { ContactsService } from '@core/crm/services/contacts/contacts.service';
import { BaseComponent } from '@base/BaseComponent';
import { RecrutementGridComponent } from './grids/recrutement-grid.component';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';
import { SupportedLanguage } from '@core/services/i18n/TranslationService';

/**
 * Page Recrutement du CRM.
 * La grille enfant gère elle-même : chargement server-side, pagination, tri, filtres,
 * création, édition inline, suppression simple et en lot. Le parent ne gère que
 * le bandeau empty-state (référentiel contacts vide).
 */
@Component({
  selector: 'app-crm-recrutement',
  standalone: true,
  imports: [DashboardHeaderComponent, RecrutementGridComponent, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-recrutement.component.html',
  styleUrl: './crm-recrutement.component.scss'
})
export class CrmRecrutementComponent extends BaseComponent implements OnInit {
  /** Indique si le référentiel contacts est vide (déclenche le bandeau empty-state). */
  public readonly ContactsEmpty = signal<boolean>(false);
  private readonly _ContactsService: ContactsService = inject(ContactsService);
  private readonly _PlatformId: object = inject(PLATFORM_ID);
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);

  /** @inheritdoc */
  public ngOnInit(): void {
    // - cm - Charge le sous-registre crm.recrutement pour résoudre les colonnes/filtres
    // de la grid (sinon la grid affiche les clés i18n brutes).
    if (isPlatformBrowser(this._PlatformId)) {
      void this.Translate.loadPageTranslations('crm.recrutement');
    }
    // - cm - Re-fetch OBLIGATOIRE au changement de langue : sans ça, les pipes
    // tkey + LabelCle des enfants restent figés sur la langue du boot (loadPageTranslations
    // ne charge QUE la langue passée en argument — les autres ne sont jamais fetchées).
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang: SupportedLanguage) => {
        void this.Translate.loadPageTranslations('crm.recrutement', pLang);
      });
    void this.CheckContactsEmpty();
  }

  /**
   * Vérifie si le référentiel contacts est vide pour afficher le bandeau empty-state.
   * - cm - Si aucun contact n'existe, l'utilisateur ne peut pas créer de recrutement
   *      avec un contactId. On propose un CTA qui redirige vers la grid contacts.
   */
  private async CheckContactsEmpty(): Promise<void> {
    try {
      const lContacts = await this._ContactsService.getAll();
      this.ContactsEmpty.set((lContacts?.length ?? 0) === 0);
    } catch (pErr) {
      console.error('[crm-recrutement] check contacts failed:', pErr);
      this.ContactsEmpty.set(false);
    }
  }

  /** Navigue vers la vue `contacts` pour que l'utilisateur puisse créer le contact manquant. */
  public GoToContacts(): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_recrutement_empty_contact_cta', 'tracking'));
    this.Go('contacts');
  }
}
