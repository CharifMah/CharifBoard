import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ApplicationsDTO } from '@core/sellmatchdb/dto';

@Component({
  selector: 'app-mandat-item',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  templateUrl: './mandat-item.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./mandat-item.component.scss']
})
export class MandatItemComponent
{
  //#region Inputs
  @Input() Mandat!: ApplicationsDTO;
  @Input() StatutLabel: string = '';
  @Input() StatutClass: string = '';
  @Input() PrixEstime: string = '';
  @Input() Commission: string = '';
  @Input() Adresse: string = '';
  @Input() JoursRestants: number = 0;
  @Input() DateAcceptation: string = '';
  //#endregion

  //#region Outputs
  @Output() VoirDetails: EventEmitter<ApplicationsDTO> = new EventEmitter<ApplicationsDTO>();
  //#endregion

  //#region Actions
  public OnVoirDetails(): void
  {
    this.VoirDetails.emit(this.Mandat);
  }
  //#endregion
}
