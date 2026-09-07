import { Component, EventEmitter, Input, Output, inject, OnChanges, OnInit, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy, signal } from '@angular/core';

import { AbstractControl, FormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { BaseComponent } from '@core/base/BaseComponent';
import { OpportunitiesDTO } from '@core/sellmatchdb/dto';
import { GetOpportunitiesFieldValidator } from '@core/sellmatchdb/dto/opportunities/opportunities.validator';
import { OpportunitiesService } from '@core/sellmatchdb/services/opportunities/opportunities.service';
import { SubscriptionPlansService } from '@core/sellmatchdb/services/subscription-plans/subscription-plans.service';
import { RouterLink } from '@angular/router';
import { StripeComponent } from "@shared/components/Stripe/stripe.component";
import { InputComponent } from '@shared/components/input/input.component';
import { IInputOption } from '@shared/components/input/input.types';
import { OutilEstimationComponent } from '@app/views/Public/OutilEstimation/outil-estimation.component';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-nouvelle-vente-popup',
  standalone: true,
  imports: [FormsModule, PopupComponent, RouterLink, StripeComponent, InputComponent,ButtonComponent],
  templateUrl: './nouvelle-vente-popup.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./nouvelle-vente-popup.component.scss']
})
export class NouvelleVentePopupComponent extends BaseComponent implements OnChanges, OnInit {
  private readonly _OpportunitiesService = inject(OpportunitiesService);
  private readonly _PlansService = inject(SubscriptionPlansService);
  private readonly _CDR: ChangeDetectorRef = inject(ChangeDetectorRef);
  _PaymentSucceeded: boolean = false;
  _PaymentIntentId: string | null = null;
  _PaymentProcessing: boolean = false;
  @Input() isOpen = false;

  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() dossierCreated = new EventEmitter<OpportunitiesDTO>();

  _CurrentStep = 1;
  _TotalSteps = 3; // Will become 4 if priority option selected
  _IsCreatingDossier = false;
  _AcceptConditions = false;
  _Photos: File[] = [];

  // ÉcoMandat (ex-Option Premium) : plan BDD, prix chargé dynamiquement
  _WantsPriorityOption = false;
  /** Prix de l'ÉcoMandat chargé depuis la BDD (4,99€ par défaut si non chargé). */
  _PriorityPrice = 4.99;
  /** Clé du plan à utiliser dans app-stripe (par défaut "ecomandat"). */
  readonly _EcoMandatPlanKey: string = 'ecomandat';

  // Gestion des erreurs
  _ErrorMessage: string | null = null;
  _ShowError = false;

  // - cm - Constantes de validation alignées sur les validators générés
  protected readonly DescriptionMaxLength: number = 2000;
  protected readonly SurfaceMaxDigits: number = 6;
  // - cm - 15 chiffres significatifs maximum pour numeric(15,2)
  protected readonly PriceMaxLength: number = 15;

  // - cm - Options du select "Type de bien" (mêmes valeurs/textes que le template d'origine)
  protected readonly PropertyTypeOptions: IInputOption[] = [
    { Value: 'Maison', Label: 'Maison' },
    { Value: 'Appartement', Label: 'Appartement' },
    { Value: 'Terrain', Label: 'Terrain' },
    { Value: 'Local commercial', Label: 'Local commercial' },
    { Value: 'Immeuble', Label: 'Immeuble' },
  ];

  _Opportunity: OpportunitiesDTO = {}

  private getEmptyOpportunity(): OpportunitiesDTO {
    return {
      userId: 0,
      referenceCode: '',
      propertyType: '',
      surface: undefined,
      priceRangeMin: undefined,
      priceRangeMax: undefined,
      description: '',
      idStatusId: 1,
      viewsCount: 0,
      address: undefined,
      isPrio: false,
    };
  }

  /**
   * Détecte les changements sur les inputs du composant.
   * @param pChanges Les changements détectés
   */
  ngOnChanges(pChanges: SimpleChanges): void
  {
    // - cm - Quand le popup s'ouvre, pré-remplit avec les données d'estimation si disponibles
    if (pChanges['isOpen']?.currentValue === true)
    {
      // - cm - Diffère le chargement pour éviter NG0100 (ExpressionChangedAfterItHasBeenCheckedError)
      setTimeout((): void =>
      {
        this.LoadEstimationData();
        this._CDR.detectChanges();
      });
    }
  }

  /**
   * Charge le prix de l'ÉcoMandat depuis la BDD au montage du composant.
   * Si la BDD ne répond pas, conserve la valeur par défaut 4,99€.
   */
  public async ngOnInit(): Promise<void>
  {
    try
    {
      const lPlans = await this._PlansService.getAll({ isActive: true });
      const lEcoMandat = lPlans.find((p: any) => p.key === 'ecomandat');
      if (lEcoMandat?.priceOneShotTtc != null)
      {
        this._PriorityPrice = lEcoMandat.priceOneShotTtc;
      }
    }
    catch (pError: any)
    {
      // - cm - En cas d'échec, on garde la valeur par défaut (4,99€).
      console.warn('Impossible de charger le prix ÉcoMandat:', pError);
    }
  }

  /**
   * Retourne un ValidatorFn Angular à partir des règles générées pour un champ d'opportunité.
   * @param pKey La clé du champ à valider.
   * @returns Le validateur Angular adapté à app-input.
   */
  protected GetOpportunityValidator(pKey: keyof OpportunitiesDTO): ValidatorFn {
    return (pControl: AbstractControl): ValidationErrors | null => {
      const lValidate: ((pValue: unknown, pRow: OpportunitiesDTO) => string | null) | null = GetOpportunitiesFieldValidator(pKey);
      if (!lValidate) return null;
      const lError: string | null = lValidate(pControl.value, this._Opportunity);
      return lError ? { dto: lError } : null;
    };
  }

  /**
   * Charge les données d'estimation depuis le sessionStorage pour pré-remplir le formulaire.
   */
  private LoadEstimationData(): void
  {
    const lSavedOpportunity: OpportunitiesDTO | null = this.SessionStorage.Restore<OpportunitiesDTO>(
      OutilEstimationComponent.OPPORTUNITY_STORAGE_KEY
    );

    if (lSavedOpportunity)
    {
      // - cm - Normalise le propertyType en PascalCase pour le select du formulaire
      const lNormalizedType: string | undefined = lSavedOpportunity.propertyType
        ? lSavedOpportunity.propertyType.charAt(0).toUpperCase() + lSavedOpportunity.propertyType.slice(1).toLowerCase()
        : undefined;

      // - cm - Fusionne les données d'estimation dans l'opportunité vide
      this._Opportunity = {
        ...this.getEmptyOpportunity(),
        ...lSavedOpportunity,
        propertyType: lNormalizedType ?? lSavedOpportunity.propertyType,
        userId: 0,
        referenceCode: '',
        idStatusId: 1,
        viewsCount: 0,
        isPrio: false
      };

      // - cm - Nettoie la clé après lecture pour ne pas recharger à la prochaine ouverture
      this.SessionStorage.Clear(OutilEstimationComponent.OPPORTUNITY_STORAGE_KEY);
    }
  }

  get isFormValid(): boolean
  {
    const baseValid: boolean = this.isStep1Valid() && this.isStep2Valid() && this.isStep3Valid();

    // - cm - Si option priorité, doit être à l'étape 4 (paiement)
    const lResult: boolean = this._WantsPriorityOption
      ? (this._CurrentStep === 4 && baseValid && this.isStep4Valid())
      : (this._CurrentStep === 3 && baseValid);

    return lResult;
  }

  /**
   * Indique si le footer du popup doit être affiché.
   * Dépend de la validité du formulaire et de l'étape en cours.
   */
  get ShowFooter(): boolean
  {
    return this.isFormValid;
  }

  get totalSteps(): number {
    return this._WantsPriorityOption ? 4 : 3;
  }

  async handlePaymentSuccess(event: any): Promise<void> {
    await this.onCreateDossier();
  }

  handlePaymentError(error: any): void {
    console.error('Erreur de paiement:', error);
    this._PaymentProcessing = false;
    this._PaymentSucceeded = false;

    // Afficher un message d'erreur
    this.showError(error.message || 'Une erreur est survenue lors du paiement. Veuillez réessayer.');
  }

  isCurrentStepValid(): boolean {
    switch (this._CurrentStep) {
      case 1: return this.isStep1Valid();
      case 2: return this.isStep2Valid();
      case 3: return this.isStep3Valid();
      case 4: return this.isStep4Valid();
      default: return false;
    }
  }

  private isStep1Valid(): boolean {
    return !!(
      this._Opportunity.address != null &&
      this._Opportunity.address.city?.trim() &&
      this._Opportunity.address?.postcode?.trim() &&
      this._Opportunity.address?.postcode.length === 5 &&
      this._Opportunity.propertyType
    );
  }

  private isStep2Valid(): boolean {
    return !!(
      this._Opportunity.surface &&
      this._Opportunity.surface > 0
    );
  }

  private isStep3Valid(): boolean {
    const hasValidPrice = !!(
      this._Opportunity.priceRangeMin &&
      this._Opportunity.priceRangeMin > 0 &&
      this._Opportunity.priceRangeMax &&
      this._Opportunity.priceRangeMax >= this._Opportunity.priceRangeMin
    );

    return hasValidPrice && this._AcceptConditions;
  }

  private isStep4Valid(): boolean {
    this._Opportunity.isPrio = true;
    return true;
  }

  onPriorityOptionChange(): void {
    // Update total steps based on priority choice
    this._TotalSteps = this._WantsPriorityOption ? 4 : 3;
  }

  nextStep(): void {
    if (this.isCurrentStepValid() && this._CurrentStep < this.totalSteps) {
      this._CurrentStep++;
      this.clearError();
    }
  }

  previousStep(): void {
    if (this._CurrentStep > 1) {
      this._CurrentStep--;
      this.clearError();
    }
  }

  goToStep(pStep: number): void {
    if (pStep < this._CurrentStep) {
      this._CurrentStep = pStep;
      this.clearError();
    } else if (pStep === this._CurrentStep + 1 && this.isCurrentStepValid()) {
      this._CurrentStep = pStep;
      this.clearError();
    }
  }

  async onCreateDossier(): Promise<void> {
    if (!this.isFormValid) return;

    this._IsCreatingDossier = true;
    this.clearError();

    try {
      if (this._Opportunity.isPrio == null || this._Opportunity.isPrio == undefined)
        this._Opportunity.isPrio = false;

      // - cm - Réinitialise l'id pour la création (évite l'erreur Int32 du backend)
      this._Opportunity.id = 0;

      // Compléter les champs auto
      this._Opportunity.userId = this.UsersService.currentUser?.id;
      this._Opportunity.createdAt = new Date().toISOString();
      this._Opportunity.updatedAt = new Date().toISOString();

      // Add priority flag if selected
      if (this._WantsPriorityOption) {
        (this._Opportunity as any).isPriority = true;
      }

      // Appel API
      const lResult = await this._OpportunitiesService.create(this._Opportunity);

      this.dossierCreated.emit(lResult);
      this.close();
    } catch (pError: any) {
      console.error('Erreur lors de la création du dossier:', pError);
      // - cm - Préfère le message d'erreur métier retourné par l'API, sinon message par défaut
      const lApiMessage: string | undefined = pError?.response?.data?.message ?? pError?.response?.data?.title;
      this.showError(lApiMessage ?? pError.message ?? 'Une erreur est survenue lors de la création du dossier.');
    } finally {
      this._IsCreatingDossier = false;
    }
  }

  // === Gestion des erreurs ===
  showError(pMessage: string): void {
    this._ErrorMessage = pMessage;
    this._ShowError = true;
  }

  clearError(): void {
    this._ErrorMessage = null;
    this._ShowError = false;
  }

  onFilesSelected(pEvent: Event): void {
    const lInput = pEvent.target as HTMLInputElement;
    if (lInput.files) {
      const lFiles = Array.from(lInput.files);
      const lValidFiles = lFiles.filter(pFile => {
        const lIsValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(pFile.type);
        const lIsValidSize = pFile.size <= 5 * 1024 * 1024;
        return lIsValidType && lIsValidSize;
      });
      this._Photos = [...this._Photos, ...lValidFiles];
    }
  }

  removePhoto(pIndex: number): void {
    this._Photos.splice(pIndex, 1);
  }

  onDragOver(pEvent: DragEvent): void {
    pEvent.preventDefault();
    pEvent.stopPropagation();
  }

  onDrop(pEvent: DragEvent): void {
    pEvent.preventDefault();
    pEvent.stopPropagation();

    const lFiles = pEvent.dataTransfer?.files;
    if (lFiles) {
      const lValidFiles = Array.from(lFiles).filter(pFile => {
        const lIsValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(pFile.type);
        const lIsValidSize = pFile.size <= 5 * 1024 * 1024;
        return lIsValidType && lIsValidSize;
      });
      this._Photos = [...this._Photos, ...lValidFiles];
    }
  }

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.resetForm();
  }

  private resetForm(): void {
    this._CurrentStep = 1;
    this._Opportunity = this.getEmptyOpportunity();
    this._AcceptConditions = false;
    this._WantsPriorityOption = false;
    this._TotalSteps = 3;
    this._Photos = [];
    this._IsCreatingDossier = false;
    this.clearError();
  }

  onCancelled(): void {
    this.close();
  }

  onClosed(): void {
    this.close();
  }
}
