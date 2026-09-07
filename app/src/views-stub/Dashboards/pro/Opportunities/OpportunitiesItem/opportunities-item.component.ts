import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@core/base/BaseComponent';
import { OpportunitiesDTO } from '@core/sellmatchdb/dto';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-opportunities-item',
  standalone: true,
  templateUrl: './opportunities-item.component.html',
  styleUrls: ['./opportunities-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, BadgeComponent, ButtonComponent]
})
export class OpportunitiesItemComponent extends BaseComponent
{
  //#region Inputs
  @Input() Opportunity: OpportunitiesDTO | null = null;
  @Input() IsNouvellesTab: boolean = true;
  @Input() MatchScore: number = 0;
  @Input() MatchScoreClass: string = '';
  @Input() StatutLabel: string = '';
  @Input() StatutClass: string = '';
  @Input() CommissionEstimee: string = '';
  @Input() FormattedPrice: string = '';
  @Input() TimeAgo: string = '';
  @Input() ApplicationStatus: string = '';
  @Input() ApplicationStatusLabel: string = '';
  @Input() ApplicationStatusIcon: string = '';
  //#endregion

  //#region Outputs
  @Output() Candidater: EventEmitter<OpportunitiesDTO> = new EventEmitter<OpportunitiesDTO>();
  //#endregion

  constructor () 
  {
    super();
  }

  //#region Public Methods
  OnCandidaterClick(pEvent: Event): void
  {
    pEvent.stopPropagation();
    if (this.Opportunity)
    {
      this.Candidater.emit(this.Opportunity);
    }
  }
  //#endregion
}
