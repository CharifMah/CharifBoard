import { Component, ChangeDetectionStrategy, OnInit, PLATFORM_ID, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { BaseComponent } from '@base/BaseComponent';
import { TacheGridComponent } from './grids/tache-grid.component';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { SupportedLanguage } from '@core/services/i18n/TranslationService';

/**
 * Page Tâches du CRM.
 * La grille enfant gère elle-même : chargement server-side, pagination, tri, filtres,
 * référentiels, création, édition, suppression simple et en lot.
 */
@Component({
  selector: 'app-crm-taches',
  standalone: true,
  imports: [DashboardHeaderComponent, TacheGridComponent, TranslateKeyPipe],
  templateUrl: './crm-taches.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-taches.component.scss'
})
export class CrmTachesComponent extends BaseComponent implements OnInit {
  private readonly _PlatformId: object = inject(PLATFORM_ID);
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);

  /** @inheritdoc */
  public ngOnInit(): void {
    if (isPlatformBrowser(this._PlatformId)) {
      void this.Translate.loadPageTranslations('taches');
      void this.Translate.preloadRefTable('ref_priorite_tache');
      // - cm - Re-fetch OBLIGATOIRE au changement de langue (cf. PITFALL CRITIQUE
      // loadPageTranslations ne charge QUE la langue courante). Sans ça, le H1
      // et les LabelCle des colonnes restent figés sur la langue du boot.
      this.Translate.LanguageChanged
        .pipe(takeUntilDestroyed(this._DestroyRef))
        .subscribe((pLang: SupportedLanguage) => {
          void this.Translate.loadPageTranslations('taches', pLang);
        });
    }
  }
}