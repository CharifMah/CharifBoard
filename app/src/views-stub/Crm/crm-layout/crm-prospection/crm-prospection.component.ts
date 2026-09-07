import { Component, ChangeDetectionStrategy, OnInit, PLATFORM_ID, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { BaseComponent } from '@base/BaseComponent';
import { ProspectionGridComponent } from './grids/prospection-grid.component';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';
import { SupportedLanguage } from '@core/services/i18n/TranslationService';

/**
 * Page Prospection du CRM.
 * La grille enfant gère elle-même : chargement server-side, pagination, tri, filtres,
 * référentiels, création, édition, suppression simple et en lot.
 */
@Component({
  selector: 'app-crm-prospection',
  standalone: true,
  imports: [DashboardHeaderComponent, ProspectionGridComponent, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-prospection.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-prospection.component.scss'
})
export class CrmProspectionComponent extends BaseComponent implements OnInit {
  private readonly _PlatformId: object = inject(PLATFORM_ID);
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);

  /** @inheritdoc */
  public ngOnInit(): void {
    if (isPlatformBrowser(this._PlatformId)) {
      void this.Translate.loadPageTranslations('crm.prospection');
      // - cm - Re-fetch OBLIGATOIRE au changement de langue (cf. PITFALL CRITIQUE
      // loadPageTranslations ne charge QUE la langue courante). Sans ça, le H1
      // et les LabelCle des colonnes restent figés sur la langue du boot.
      this.Translate.LanguageChanged
        .pipe(takeUntilDestroyed(this._DestroyRef))
        .subscribe((pLang: SupportedLanguage) => {
          void this.Translate.loadPageTranslations('crm.prospection', pLang);
        });
    }
  }
}
