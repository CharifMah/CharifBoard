import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OpportunitiesDTO } from '@core/sellmatchdb/dto';
import { BaseComponent } from '@core/base/BaseComponent';
import { BadgeComponent, BadgeType } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';


@Component({
  selector: 'app-dossier-item',
  standalone: true,
  imports: [CommonModule, BadgeComponent, ButtonComponent],
  templateUrl: './dossier-item.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dossier-item.component.scss']
})
export class DossierItemComponent extends BaseComponent
{
  //#region Inputs
  @Input() Dossier: OpportunitiesDTO | null = null;
  @Input() IsSelected: boolean = false;
  @Input() ShowDeleteButton: boolean = true;
  //#endregion

  //#region Outputs
  @Output() CardClick: EventEmitter<OpportunitiesDTO> = new EventEmitter<OpportunitiesDTO>();
  @Output() DeleteClick: EventEmitter<OpportunitiesDTO> = new EventEmitter<OpportunitiesDTO>();
  //#endregion

  //#region Public Methods
  public OnCardClick(): void
  {
    if (this.Dossier)
    {
      this.CardClick.emit(this.Dossier);
    }
  }

  public OnDeleteClick(pEvent: Event): void
  {
    pEvent.stopPropagation();
    if (this.Dossier)
    {
      this.DeleteClick.emit(this.Dossier);
    }
  }

  /**
   * Mappe le statut du dossier (valeur BDD) vers un type de badge réutilisable.
   * @param pStatus Le statut brut issu de idStatusNavigation.status
   * @returns Le BadgeType correspondant pour app-badge
   */
  public GetStatutBadgeType(pStatus: string | undefined): BadgeType // - cm - Mapping statut → badge
  {
    const lStatus: string = (pStatus ?? '').toLowerCase();

    const lMapping: Record<string, BadgeType> = {
      'en_cours': 'info',
      'attente': 'warning',
      'vendu': 'success',
      'annule': 'error'
    };

    return lMapping[lStatus] ?? 'default';
  }

  /**
   * Mappe le statut du dossier (valeur BDD) vers un libellé affichable.
   * @param pStatus Le statut brut issu de idStatusNavigation.status
   * @returns Le libellé formaté pour le badge (ex : "En cours")
   */
  public GetStatutLabel(pStatus: string | undefined): string // - cm - Mapping statut → libellé
  {
    const lStatus: string = (pStatus ?? '').toLowerCase();

    const lMapping: Record<string, string> = {
      'en_cours': 'En cours',
      'attente': 'En attente',
      'vendu': 'Vendu',
      'annule': 'Annulé'
    };

    return lMapping[lStatus] ?? (pStatus ?? '');
  }

  //#endregion
}
