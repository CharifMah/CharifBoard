import { Component, ChangeDetectionStrategy, OnInit, PLATFORM_ID, inject, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseComponent } from '@base/BaseComponent';
import { HistoriqueGridComponent } from './grids/historique-grid.component';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';
import { SupportedLanguage } from '@core/services/i18n/TranslationService';

/**
 * Page Historique du CRM.
 * La grille enfant gère elle-même : chargement server-side, pagination, tri, filtres,
 * référentiels, création, édition, suppression simple et en lot.
 */
@Component({
  selector: 'app-crm-historique',
  standalone: true,
  imports: [DashboardHeaderComponent, HistoriqueGridComponent, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-historique.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-historique.component.scss'
})
export class CrmHistoriqueComponent extends BaseComponent implements OnInit {
  private readonly _PlatformId: object = inject(PLATFORM_ID);
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);

  /** @inheritdoc */
  public ngOnInit(): void {
    // - cm - Charge le sous-registre crm.historique pour résoudre le titre/header
    // et les colonnes/filtres de la grid (sinon la grid affiche les clés i18n brutes).
    if (isPlatformBrowser(this._PlatformId)) {
      void this.Translate.loadPageTranslations('crm.historique');
    }
    // - cm - Re-fetch OBLIGATOIRE au changement de langue : sans ça, le titre
    // du <app-dashboard-header> et les pipe tkey des enfants restent figés sur
    // la langue du boot (loadPageTranslations ne charge QUE la langue passée
    // en argument — les autres ne sont jamais fetchées).
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang: SupportedLanguage) => {
        void this.Translate.loadPageTranslations('crm.historique', pLang);
      });
  }
}
