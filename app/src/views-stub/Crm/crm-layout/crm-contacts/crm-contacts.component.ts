import { Component, ChangeDetectionStrategy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BaseComponent } from '@base/BaseComponent';
import { ContactGridComponent } from './grids/contact-grid.component';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';

/**
 * Page Contacts du CRM.
 * La grille enfant gère elle-même : chargement server-side, pagination, tri, filtres,
 * référentiels, création, édition, suppression simple et en lot.
 */
@Component({
  selector: 'app-crm-contacts',
  standalone: true,
  imports: [DashboardHeaderComponent, ContactGridComponent, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-contacts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-contacts.component.scss'
})
export class CrmContactsComponent extends BaseComponent implements OnInit {
  private readonly _PlatformId: object = inject(PLATFORM_ID);

  /** @inheritdoc */
  public ngOnInit(): void {
    if (isPlatformBrowser(this._PlatformId)) {
      void this.Translate.loadPageTranslations('crm.contacts');
    }
  }
}