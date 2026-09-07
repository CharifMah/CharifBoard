import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { BaseComponent } from '@core/base/BaseComponent';
import { OpportunitiesDTO, ApplicationsDTO, AvailableServicesDTO } from '@core/sellmatchdb/dto';
import { AvailableServicesService } from '@core/sellmatchdb/services/available-services/available-services.service';
import { ProStateService } from '@core/states/pro-state/pro-state.service';
import { StepPresentationComponent } from './steps/step-presentation/step-presentation.component';
import { StepHonorairesComponent } from './steps/step-honoraires/step-honoraires.component';
import { StepMessageComponent } from './steps/step-message/step-message.component';
import { ServicesByCategory } from './models/candidature.models';
import { CATEGORY_LABELS } from '@core/consts/const';
import { EFeeType } from './steps/step-honoraires/EFeeType';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-candidature-popup',
  standalone: true,
  imports: [
    FormsModule,
    PopupComponent,
    StepPresentationComponent,
    StepHonorairesComponent,
    StepMessageComponent,
    ButtonComponent
],
  templateUrl: './candidature-popup.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./candidature-popup.component.scss']
})
export class CandidaturePopupComponent extends BaseComponent implements OnChanges, OnInit
{
  private readonly _AvailableServicesService = inject(AvailableServicesService);
  private readonly _ProStateService = inject(ProStateService);

  @Input() isOpen = false;
  @Input() opportunity: OpportunitiesDTO | null = null;

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() candidatureCreated = new EventEmitter<ApplicationsDTO>();

  _CurrentStep = 1;
  _IsLoadingServices = false;

  // Services
  _AvailableServices: AvailableServicesDTO[] = [];
  _SelectedServiceIds: Set<number> = new Set();
  _ServicesByCategory: ServicesByCategory[] = [];

  // Gestion des erreurs
  _ErrorMessage: string | null = null;
  _ShowError = false;

  // Données du formulaire
  _Application: ApplicationsDTO = this.getEmptyApplication();
  public EFeeType = EFeeType;
  // Getter pour le state submitting
  get _IsSubmitting(): boolean
  {
    return this._ProStateService.IsSubmitting;
  }

  async ngOnInit(): Promise<void>
  {
    await this.loadAvailableServices();
  }

  ngOnChanges(changes: SimpleChanges): void
  {
    if (changes['isOpen'] && this.isOpen)
    {
      this.resetForm();
    }
  }

  private async loadAvailableServices(): Promise<void>
  {
    this._IsLoadingServices = true;
    try
    {
      const services = await this._AvailableServicesService.getAll();
      this._AvailableServices = services.filter(s => s.isActive);
      this.groupServicesByCategory();
    } catch (error)
    {
      console.error('Erreur chargement services:', error);
    } finally
    {
      this._IsLoadingServices = false;
    }
  }

  private groupServicesByCategory(): void
  {
    const grouped = new Map<string, AvailableServicesDTO[]>();

    for (const service of this._AvailableServices)
    {
      const category = service.category || 'other';
      if (!grouped.has(category))
      {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(service);
    }

    this._ServicesByCategory = Array.from(grouped.entries()).map(([category, services]) => ({
      category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      services: services.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    }));
  }

  private getEmptyApplication(): ApplicationsDTO
  {
    return {
      opportunityId: undefined,
      professionalId: undefined,
      presentation: '',
      estimatedTimeline: '',
      feeType: this.EnumToString(EFeeType.POURCENTAGE, EFeeType),
      feePercentage: 4.0,
      feeFixedAmount: undefined,
      message: '',
      status: 'pending'
    };
  }

  // === Handlers pour les événements des sous-composants ===
  onPresentationChange(value: string): void
  {
    this._Application.presentation = value;
  }

  onTimelineChange(value: string): void
  {
    this._Application.estimatedTimeline = value;
  }

  onSelectedServicesChange(ids: Set<number>): void
  {
    this._SelectedServiceIds = ids;
  }

  onFeeTypeChange(value: EFeeType): void
  {
    this._Application.feeType = EFeeType[value];
  }

  onFeePercentageChange(value: number | undefined): void
  {
    this._Application.feePercentage = value;
  }

  onFeeFixedAmountChange(value: number | undefined): void
  {
    this._Application.feeFixedAmount = value;
  }

  onMessageChange(value: string): void
  {
    this._Application.message = value;
  }

  // === VALIDATION ===
  get isFormValid(): boolean
  {
    return this._CurrentStep === 3 &&
      this.isStep1Valid() &&
      this.isStep2Valid() &&
      this.isStep3Valid();
  }

  isCurrentStepValid(): boolean
  {
    switch (this._CurrentStep)
    {
      case 1: return this.isStep1Valid();
      case 2: return this.isStep2Valid();
      case 3: return this.isStep3Valid();
      default: return false;
    }
  }

  private isStep1Valid(): boolean
  {
    return !!(
      this._Application.presentation?.trim() &&
      this._Application.presentation.length >= 50 &&
      this._SelectedServiceIds.size >= 1
    );
  }

  private isStep2Valid(): boolean
  {
    const lFeeTypeEnum : EFeeType = this.ConvertToEnum(this._Application.feeType || '' ,EFeeType);

    return !!(
      this._Application.feeType &&
      ((lFeeTypeEnum === EFeeType.POURCENTAGE && this._Application.feePercentage && this._Application.feePercentage > 0) ||
        (lFeeTypeEnum === EFeeType.FIXE && this._Application.feeFixedAmount && this._Application.feeFixedAmount > 0))
    );
  }

  private isStep3Valid(): boolean
  {
    return true;
  }

  // === NAVIGATION ===
  nextStep(): void
  {
    if (this.isCurrentStepValid() && this._CurrentStep < 3)
    {
      this._CurrentStep++;
      this.clearError();
    }
  }

  previousStep(): void
  {
    if (this._CurrentStep > 1)
    {
      this._CurrentStep--;
      this.clearError();
    }
  }

  goToStep(pStep: number): void
  {
    if (pStep < this._CurrentStep)
    {
      this._CurrentStep = pStep;
      this.clearError();
    } else if (pStep === this._CurrentStep + 1 && this.isCurrentStepValid())
    {
      this._CurrentStep = pStep;
      this.clearError();
    }
  }

  // === Utilitaires ===
  getSelectedServicesLabels(): string[]
  {
    return this._AvailableServices
      .filter(s => s.id && this._SelectedServiceIds.has(s.id))
      .map(s => s.serviceLabel || '');
  }

  getCommissionEstimee(): number
  {
    if (!this.opportunity) return 0;
    const prix = this.opportunity.priceRangeMin || this.opportunity.priceRangeMax || 0;

    if (this._Application.feeType === 'fixed')
    {
      return this._Application.feeFixedAmount || 0;
    }

    const percentage = this._Application.feePercentage || 4;
    return Math.round(prix * (percentage / 100));
  }

  /**
   * Soumet la candidature via le ProStateService
   */
  async onSubmitCandidature(): Promise<void>
  {
    if (!this.opportunity?.id || !this.UsersService.currentUser?.id) return;

    this.clearError();

    try
    {
      const lResult = await this._ProStateService.SubmitCandidature({
        application: this._Application,
        selectedServiceIds: this._SelectedServiceIds,
        opportunityId: this.opportunity.id,
        professionalId: this.UsersService.currentUser.id
      });

      this.candidatureCreated.emit(lResult);
      this.close();
    }
    catch (pError: any)
    {
      console.error('Erreur lors de l\'envoi de la candidature:', pError);
      this.showError(pError.message || 'Une erreur est survenue lors de l\'envoi de la candidature.');
    }
  }

  showError(pMessage: string): void
  {
    this._ErrorMessage = pMessage;
    this._ShowError = true;
  }

  clearError(): void
  {
    this._ErrorMessage = null;
    this._ShowError = false;
  }

  close(): void
  {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.resetForm();
  }

  private resetForm(): void
  {
    this._CurrentStep = 1;
    this._Application = this.getEmptyApplication();
    this._SelectedServiceIds = new Set();
    this.clearError();
  }

  getSelectedServicesWithCategory(): { label: string; category: string }[]
  {
    return this._AvailableServices
      .filter(s => s.id && this._SelectedServiceIds.has(s.id))
      .map(s => ({
        label: s.serviceLabel || '',
        category: s.category || 'other'
      }));
  }

  onCancelled(): void
  {
    this.close();
  }

  onClosed(): void
  {
    this.close();
  }
}
