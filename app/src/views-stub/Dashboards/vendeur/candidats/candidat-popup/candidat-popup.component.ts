import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, AfterViewChecked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@core/base/BaseComponent';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ApplicationsDTO } from '@core/sellmatchdb/dto';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@core/consts/const';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button.component';

interface ServicesByCategory
{
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  services: string[];
}

@Component({
  selector: 'app-candidat-popup',
  standalone: true,
  templateUrl: './candidat-popup.component.html',
  styleUrls: ['./candidat-popup.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, PopupComponent, RouterLink, ButtonComponent]
})
export class CandidatPopupComponent extends BaseComponent implements OnChanges, AfterViewChecked
{
  //#region Attributes
  private readonly _CategoryOrder: string[] = ['visuels', 'prises_vue', 'diffusion', 'strategie'];
  private _WidgetInitialized: boolean = false;
  //#endregion

  //#region Properties
  @Input() isOpen: boolean = false;
  @Input() candidat: ApplicationsDTO | null = null;

  @Output() isOpenChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() selectionner: EventEmitter<ApplicationsDTO> = new EventEmitter<ApplicationsDTO>();
  @Output() annulerSelection: EventEmitter<ApplicationsDTO> = new EventEmitter<ApplicationsDTO>();
  @Output() refuser: EventEmitter<ApplicationsDTO> = new EventEmitter<ApplicationsDTO>();

  get candidatNom(): string
  {
    const lPro = this.candidat?.professional;
    if (!lPro)
    {
      return '';
    }
    return `${lPro.firstName ?? ''} ${lPro.lastName ?? ''}`.trim();
  }

  get candidatCompany(): string
  {
    return this.candidat?.professional?.companyName ?? '';
  }

  get hasServices(): boolean
  {
    return (this.candidat?.applicationServices?.length ?? 0) > 0;
  }

  get servicesCount(): number
  {
    return this.candidat?.applicationServices?.length ?? 0;
  }

  get hasImmodvisor(): boolean
  {
    return !!(this.candidat?.professional?.immodvisorCid && this.candidat?.professional?.immodvisorApiKey);
  }

  get servicesByCategory(): ServicesByCategory[]
  {
    if (!this.candidat?.applicationServices)
    {
      return [];
    }

    const lGrouped = new Map<string, string[]>();

    for (const lAppService of this.candidat.applicationServices)
    {
      const lService = lAppService.service;
      if (!lService)
      {
        continue;
      }

      const lCategory = lService.category || 'other';
      const lLabel = lService.serviceLabel || '';

      if (!lLabel)
      {
        continue;
      }

      if (!lGrouped.has(lCategory))
      {
        lGrouped.set(lCategory, []);
      }
      lGrouped.get(lCategory)!.push(lLabel);
    }

    return Array.from(lGrouped.entries())
      .map(([pCategory, pServices]) => ({
        category: pCategory,
        categoryLabel: CATEGORY_LABELS[pCategory] || pCategory,
        categoryIcon: CATEGORY_ICONS[pCategory] || 'category',
        services: pServices.sort((a, b) => a.localeCompare(b, 'fr'))
      }))
      .sort((a, b) =>
      {
        const lOrderA = this._CategoryOrder.indexOf(a.category);
        const lOrderB = this._CategoryOrder.indexOf(b.category);
        return (lOrderA === -1 ? 99 : lOrderA) - (lOrderB === -1 ? 99 : lOrderB);
      });
  }

  //#endregion

  //#region Lifecycle
  ngOnChanges(pChanges: SimpleChanges): void
  {
    if (pChanges['isOpen'] || pChanges['candidat'])
    {
      this._WidgetInitialized = false;
    }
  }

  ngAfterViewChecked(): void
  {
    if (this.isOpen && !this._WidgetInitialized && this.hasImmodvisor)
    {
      this._InitImmodvisorWidget();
    }
  }
  //#endregion

  private _InitImmodvisorWidget(): void
  {
    const lPortal = document.querySelector('.popup-portal-container');
    const lWidget = lPortal?.querySelector('.imdw-widget');

    if (!lWidget)
    {
      return;
    }

    this._WidgetInitialized = true;

    const lImdw = (window as any).imdw;
    if (lImdw?.run)
    {
      lImdw.run();
    }
  }

  //#region Events
  onPopupChange(pIsOpen: boolean): void
  {
    this.isOpenChange.emit(pIsOpen);
  }

  onSelectionner(): void
  {
    if (this.candidat)
    {
      this.selectionner.emit(this.candidat);
      this.isOpen = false;
    }
  }

  onAnnulerSelection(): void
  {
    if (this.candidat)
    {
      this.annulerSelection.emit(this.candidat);
    }
  }

  onRefuser(): void
  {
    if (this.candidat)
    {
      this.refuser.emit(this.candidat);
    }
  }
  //#endregion
}
