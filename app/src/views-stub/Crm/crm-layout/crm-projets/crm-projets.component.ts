import { Component, ChangeDetectionStrategy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BaseComponent } from '@base/BaseComponent';
import { ProjetGridComponent } from './grids/projet-grid.component';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';

/**
 * Page Projets du CRM.
 * La grille enfant gère elle-même : chargement server-side, pagination, tri, filtres,
 * référentiels, création, édition, suppression simple et en lot.
 */
@Component({
  selector: 'app-crm-projets',
  standalone: true,
  imports: [DashboardHeaderComponent, ProjetGridComponent, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-projets.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-projets.component.scss'
})
export class CrmProjetsComponent extends BaseComponent implements OnInit {
  private readonly _PlatformId: object = inject(PLATFORM_ID);

  /** @inheritdoc */
  public ngOnInit(): void {
    if (isPlatformBrowser(this._PlatformId)) {
      void this.Translate.loadPageTranslations('crm.projets');
    }
  }
}