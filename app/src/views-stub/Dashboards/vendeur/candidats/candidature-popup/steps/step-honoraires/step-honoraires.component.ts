import { Component, EventEmitter, inject, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@core/base/BaseComponent';
import { FeeCapsService } from '@core/sellmatchdb/services';
import { FeeCapsDTO, OpportunitiesDTO } from '@core/sellmatchdb/dto';
import { EFeeType } from './EFeeType';
import { InputComponent } from '@shared/components/input/input.component';

@Component({
  selector: 'app-step-honoraires',
  standalone: true,
  imports: [FormsModule, InputComponent],
  templateUrl: './step-honoraires.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./step-honoraires.component.scss']
})
export class StepHonorairesComponent extends BaseComponent implements OnInit
{
  @Input() opportunite: OpportunitiesDTO | undefined = undefined;
  @Input() feeType: EFeeType = EFeeType.POURCENTAGE;
  @Input() feePercentage: number | undefined;
  @Input() feeFixedAmount: number | undefined;
  @Input() propertyPrice: number = 0;

  @Output() feeTypeChange = new EventEmitter<EFeeType>();
  @Output() feePercentageChange = new EventEmitter<number | undefined>();
  @Output() feeFixedAmountChange = new EventEmitter<number | undefined>();

  private feeCapsService: FeeCapsService = inject(FeeCapsService);

  public currentFeeCap: FeeCapsDTO | null = null;
  public maxPercentage: number | null = null;
  public maxFixedAmount: number | null = null;
  public isLoadingFeeCaps: boolean = false;
  public EFeeType = EFeeType;
  async ngOnInit(): Promise<void>
  {
    await this.loadFeeCaps();
  }

  private async loadFeeCaps(): Promise<void>
  {
    this.BusyService.show();

    if (this.opportunite?.isPrio)
    {
      this.currentFeeCap = null;
      this.maxPercentage = null;
      this.maxFixedAmount = null;

      this.isLoadingFeeCaps = true;

      try
      {
        const feeCaps = await this.feeCapsService.getAll();

        // Filtrer les fee caps actifs
        const activeFeeCaps = feeCaps.filter(fc => fc.isActive);

        // Trouver le fee cap correspondant à la tranche de prix
        this.currentFeeCap = activeFeeCaps.find(fc =>
          this.propertyPrice >= (fc.priceMin || 0) &&
          this.propertyPrice <= (fc.priceMax || Infinity)
        ) || null;

        if (this.currentFeeCap)
        {
          this.maxPercentage = this.currentFeeCap.maxPercentage || null;
          this.maxFixedAmount = this.currentFeeCap.maxFixedAmount || null;
        }
      }
      catch (error)
      {
        console.error('Erreur lors du chargement des fee caps:', error);
      }
      finally
      {
        this.isLoadingFeeCaps = false;
      }
    }

    this.BusyService.hide();
  }

  onFeeTypeChange(value: EFeeType): void
  {
    this.feeTypeChange.emit(value);
  }

  onFeePercentageChange(value: number | undefined): void
  {
    // Vérifier si la valeur dépasse le maximum autorisé pour les dossiers prio
    if (this.opportunite?.isPrio && this.maxPercentage && value)
    {
      if (value > this.maxPercentage)
      {
        value = this.maxPercentage;
      }
    }
    this.feePercentageChange.emit(value);
  }

  onFeeFixedAmountChange(value: number | undefined): void
  {
    // Vérifier si la valeur dépasse le maximum autorisé pour les dossiers prio
    if (this.opportunite?.isPrio && this.maxFixedAmount && value)
    {
      if (value > this.maxFixedAmount)
      {
        value = this.maxFixedAmount;
      }
    }
    this.feeFixedAmountChange.emit(value);
  }

  getCommissionEstimee(): number
  {
    if (this.feeType === EFeeType.FIXE)
    {
      return this.feeFixedAmount || 0;
    }
    const percentage = this.feePercentage || 0;
    return Math.round(this.propertyPrice * (percentage / 100));
  }

  isOverMaxPercentage(): boolean
  {
    if (!this.opportunite?.isPrio || !this.maxPercentage || !this.feePercentage)
    {
      return false;
    }
    return this.feePercentage > this.maxPercentage;
  }

  isOverMaxFixedAmount(): boolean
  {
    if (!this.opportunite?.isPrio || !this.maxFixedAmount || !this.feeFixedAmount)
    {
      return false;
    }
    return this.feeFixedAmount > this.maxFixedAmount;
  }

  getMaxCommissionDisplay(): string
  {
    if (this.feeType === EFeeType.POURCENTAGE && this.maxPercentage)
    {
      return `${this.maxPercentage}%`;
    }
    if (this.feeType === EFeeType.FIXE && this.maxFixedAmount)
    {
      return this.FormatPrice(this.maxFixedAmount);
    }
    return '';
  }
}
