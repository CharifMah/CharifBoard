import { Component, EventEmitter, Input, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@core/base/BaseComponent';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ApplicationsDTO } from '@core/sellmatchdb/dto';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ProStateService } from '@core/states/pro-state/pro-state.service';

@Component({
  selector: 'app-lead-popup',
  standalone: true,
  templateUrl: './lead-popup.component.html',
  styleUrls: ['./lead-popup.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, PopupComponent, BadgeComponent]
})
export class LeadPopupComponent extends BaseComponent
{
  //#region Inputs
  public readonly State: ProStateService = inject(ProStateService);

  @Input() Application: ApplicationsDTO | null = null;
  @Input() IsOpen: boolean = false;
  //#endregion

  //#region Outputs
  @Output() Closed: EventEmitter<void> = new EventEmitter<void>();
  @Output() Confirmed: EventEmitter<ApplicationsDTO> = new EventEmitter<ApplicationsDTO>();
  @Output() IsOpenChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  //#endregion

  //#region Properties
  public PrixEstime: string = '';
  public Commission: string = '';
  public JoursRestants: number = 0;
  public StatutLabel: string = '';
  public StatutClass: string = '';
  //#endregion

  //#region Constructor
  constructor () 
  {
    super();
  }
  //#endregion

  //#region Actions
  public OnClose(): void
  {
    this.Closed.emit();
  }

  public OnConfirm(): void
  {
    if (this.Application)
    {
      this.Confirmed.emit(this.Application);
    }
  }
  //#endregion
}
