import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import localeFr from '@angular/common/locales/fr';
import { BaseComponent } from '@base/BaseComponent';
import { OpportunitiesDTO } from '@core/sellmatchdb/dto/opportunities/opportunities.dto';
import { AdressesDTO, UsersDTO } from '@core/sellmatchdb/dto';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { RegisterComponent } from '../../Authentification/Register/register.component';
import { StepperComponent, IStepItem } from '@shared/components/Stepper/stepper.component';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';
import { EstimationService } from '@core/dvfdb/services/EstimationService';
import { EstimationCritereDTO } from '@core/dvfdb/dto/Estimation/EstimationCritereDTO';
import { EstimationDTO } from '@core/dvfdb/dto/Estimation/EstimationDTO';
import { EvolutionMensuellePrixCommuneComponent } from './EvolutionMensuellePrixCommune/evolution-mensuelle-prix-commune.component';
import { SeoService } from '@core/services/seo/seo.service';

import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { FaqEstimationComponent } from '@shared/components/faq-estimation/faq-estimation.component';

registerLocaleData(localeFr, 'fr');

enum EPropertyType { Maison = 'maison', Appartement = 'appartement', Terrain = 'terrain' }
enum EPropertyCondition { ARenover = 'a_renover', Correct = 'correct', Bon = 'bon', Excellent = 'excellent' }

export function minLengthValidator(pMinLength: number): ValidatorFn
{
  return (pControl: AbstractControl): ValidationErrors | null =>
  {
    if (!pControl.value || pControl.value.length < pMinLength)
    {
      return { minLengthCustom: { requiredLength: pMinLength, actualLength: pControl.value?.length || 0 } };
    }
    return null;
  };
}

@Component({
  selector: 'app-outil-estimation',
  standalone: true,
  templateUrl: './outil-estimation.component.html',
  styleUrls: ['./outil-estimation.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, InputComponent, RegisterComponent, StepperComponent, TooltipComponent, EvolutionMensuellePrixCommuneComponent, ScrollRevealDirective, FaqEstimationComponent]
})
export class OutilEstimationComponent extends BaseComponent implements OnInit
{
  //#region Attributes
  private readonly _fb: FormBuilder = inject(FormBuilder);
  private readonly _Seo: SeoService = inject(SeoService);
  private readonly _StoragePrefix: string = 'estimation';
  private _EstimationService: EstimationService = inject(EstimationService);
  private readonly _ResultStep: number = 5;
  private readonly _RegisterStep: number = 6;
  private readonly _Router: Router = inject(Router);
  // - cm - Clé sessionStorage pour transmettre l'opportunité au dossier
  public static readonly OPPORTUNITY_STORAGE_KEY: string = 'sellmatch_estimation_opportunity';
  //#endregion

  //#region Properties
  public CurrentStep: number = 1;
  public IsLoading: boolean = false;
  public ShowSellMatchPitch: boolean = true;
  public EstimationResult!: EstimationDTO;
  public CreatedOpportunity!: OpportunitiesDTO;
  public CreatedUser!: UsersDTO;
  public EvolutionChartLongitude: number | null = null;
  public EvolutionChartLatitude: number | null = null;
  public EvolutionChartRayonMetres: number = 5000;
  public EvolutionChartTypeBien: string = 'tous';

  // - cm - Liste des villes pour les liens SEO de longue traîne
  public EstimationVilles: { slug: string; nom: string }[] = [
    { slug: 'paris', nom: 'Paris' },
    { slug: 'marseille', nom: 'Marseille' },
    { slug: 'lyon', nom: 'Lyon' },
    { slug: 'toulouse', nom: 'Toulouse' },
    { slug: 'nice', nom: 'Nice' },
    { slug: 'nantes', nom: 'Nantes' },
    { slug: 'strasbourg', nom: 'Strasbourg' },
    { slug: 'montpellier', nom: 'Montpellier' },
    { slug: 'bordeaux', nom: 'Bordeaux' },
    { slug: 'lille', nom: 'Lille' },
    { slug: 'rennes', nom: 'Rennes' },
    { slug: 'reims', nom: 'Reims' },
    { slug: 'saint-etienne', nom: 'Saint-Etienne' },
    { slug: 'toulon', nom: 'Toulon' },
    { slug: 'le-havre', nom: 'Le Havre' },
    { slug: 'grenoble', nom: 'Grenoble' },
    { slug: 'dijon', nom: 'Dijon' },
    { slug: 'angers', nom: 'Angers' },
    { slug: 'nimes', nom: 'Nîmes' },
    { slug: 'villeurbanne', nom: 'Villeurbanne' }
  ];

  // - cm - Messages subliminaux affichés sous chaque sous-étape
  public SubliminalMessages: Record<number, string> = {
    2: '🔐 Et si les professionnels immobiliers devaient vous convaincre avant même de connaître votre identité ?',
    3: '🏡 Cette estimation est le premier élément de votre futur dossier vendeur SellMatch. Une fois terminé, vous pourrez le présenter gratuitement à plusieurs agences et mandataires de votre secteur sans communiquer vos coordonnées.',
    4: `🎯 Votre estimation est le point de départ.

Une fois terminée, créez votre compte ou cliquez sur "Oui, comparer les pros" pour transformer votre estimation en dossier vendeur.

📩 Des agences et mandataires candidatent sur votre projet
🔒 Ils ne connaissent ni votre identité, ni votre numéro
☎️ Vous choisissez qui peut vous contacter

Vous gardez le contrôle du premier au dernier clic.`,
  };

  public EstimationSteps: IStepItem[] = [
    { Id: 1, Label: 'Localisation', Condition: true },
    { Id: 2, Label: 'Type & Surface', Condition: false },
    { Id: 3, Label: 'État & Contexte', Condition: false },
    { Id: 4, Label: 'Atouts', Condition: false },
    { Id: 5, Label: 'Résultat', Condition: false }
  ];

  public AddressValidators: ValidatorFn[] = [Validators.required, minLengthValidator(3)];
  public AddressErrorMessages: Record<string, string> = {
    required: 'L\'adresse est requise',
    minLengthCustom: 'L\'adresse doit contenir au moins 3 caractères'
  };

  public EstimationForm: FormGroup = this._fb.group({
    step1: this._fb.group({
      address: new FormControl<AdressesDTO | string | null>('', [Validators.required, minLengthValidator(3)]),
      postalCode: [''],
      city: [''],
      lat: [null],
      lng: [null],
    }),
    step2: this._fb.group({
      propertyType: [EPropertyType.Appartement, Validators.required],
      surface: [null, [Validators.required, Validators.min(9)]],
      surfaceTerrain: [null],
      nbRooms: [null],
      condition: [EPropertyCondition.Bon, Validators.required],
      yearBuilt: [null],
      hasGarage: [false],
      hasTerrace: [false],
      hasGarden: [false]
    })
  });

  public get Step1(): FormGroup { return this.EstimationForm.get('step1') as FormGroup; }
  public get Step2(): FormGroup { return this.EstimationForm.get('step2') as FormGroup; }

  public get StepperCurrentStep(): number
  {
    if (this.CurrentStep === this._RegisterStep) return 5;
    if (this.CurrentStep >= this._ResultStep) return 5;
    return this.CurrentStep;
  }
  //#endregion

  constructor () { super(); }

  //#region Lifecycle
  public ngOnInit(): void
  {
    // - cm - SEO : meta tags via le SeoService centralisé
    this._Seo.SetPageMeta({
      Title: 'Estimation immobilière gratuite en ligne | SellMatch',
      Description: 'Estimation immobilière gratuite en 2 minutes basée sur les données officielles DVF+. Obtenez la valeur de votre maison, appartement ou terrain. Sans inscription, sans engagement.',
      CanonicalUrl: this._Seo.BuildUrl('/estimation-immobiliere'),
      OgTitle: 'Estimation immobilière gratuite en ligne | SellMatch',
      OgDescription: 'Estimez gratuitement la valeur de votre bien immobilier en 2 minutes grâce aux données officielles DVF+. Sans inscription.'
    });

    // - cm - Données structurées JSON-LD : WebApplication
    this._Seo.SetJsonLd('webapp', {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Estimation immobilière SellMatch',
      description: 'Estimez gratuitement la valeur de votre bien immobilier en 2 minutes grâce aux données officielles DVF+.',
      url: 'https://www.sellmatch.fr/estimation-immobiliere',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'All',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      provider: { '@type': 'Organization', name: 'SellMatch', url: 'https://www.sellmatch.fr' }
    });

    // - cm - Données structurées JSON-LD : Service (estimation immobilière)
    this._Seo.SetJsonLd('service', {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Estimation immobilière gratuite',
      description: 'Estimation immobilière gratuite en ligne basée sur les données officielles DVF+. Obtenez la valeur de votre maison, appartement ou terrain en 2 minutes.',
      provider: { '@type': 'Organization', name: 'SellMatch', url: 'https://www.sellmatch.fr' },
      areaServed: { '@type': 'Country', name: 'France' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      url: 'https://www.sellmatch.fr/estimation-immobiliere'
    });

    // - cm - Données structurées JSON-LD : FAQPage pour rich snippets Google
    this._Seo.SetJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: "L'estimation immobilière SellMatch est-elle gratuite ?", acceptedAnswer: { '@type': 'Answer', text: "Oui, l'estimation est entièrement gratuite et sans engagement. Vous obtenez une fourchette de prix basée sur les données officielles DVF+ sans avoir à vous inscrire." } },
        { '@type': 'Question', name: 'Quelles données sont utilisées pour l\'estimation ?', acceptedAnswer: { '@type': 'Answer', text: "SellMatch utilise la base de données officielle DVF+ (Demandes de Valeurs Foncières) qui regroupe les transactions immobilières réelles publiées par l'administration fiscale française." } },
        { '@type': 'Question', name: "Combien de temps prend l'estimation ?", acceptedAnswer: { '@type': 'Answer', text: "L'estimation prend environ 2 minutes. Il suffit de saisir l'adresse du bien, son type, sa surface et son état pour obtenir une fourchette de prix fiable." } },
        { '@type': 'Question', name: 'Dois-je m\'inscrire pour obtenir mon estimation ?', acceptedAnswer: { '@type': 'Answer', text: "Non, aucune inscription n'est requise pour obtenir votre estimation. Vous pouvez estimer votre bien en toute confidentialité sans communiquer vos coordonnées." } },
        { '@type': 'Question', name: "L'estimation est-elle confidentielle ?", acceptedAnswer: { '@type': 'Answer', text: "Oui, vos données restent confidentielles et protégées (RGPD). Les informations saisies servent uniquement à calculer une estimation à partir des transactions comparables." } },
        { '@type': 'Question', name: 'Qu\'est-ce que la base DVF+ ?', acceptedAnswer: { '@type': 'Answer', text: "DVF+ (Demandes de Valeurs Foncières) est la base de données officielle de l'administration fiscale française qui recense toutes les transactions immobilières réalisées en France. Elle contient le prix, la date, la surface et la localisation de chaque vente." } },
        { '@type': 'Question', name: 'Comment est calculée l\'estimation de mon bien ?', acceptedAnswer: { '@type': 'Answer', text: "L'estimation croise l'adresse de votre bien avec les transactions DVF+ proches, filtre les ventes comparables par type et surface, puis calcule un prix moyen au m² pour établir une fourchette de valeur." } },
        { '@type': 'Question', name: 'L\'estimation en ligne remplace-t-elle l\'expertise d\'un professionnel ?', acceptedAnswer: { '@type': 'Answer', text: "Non, l'estimation en ligne donne un ordre de grandeur indicatif. Elle ne remplace pas l'expertise d'un agent immobilier ou d'un notaire qui prend en compte la spécificité du bien, son environnement et le marché local." } },
        { '@type': 'Question', name: 'Puis-je estimer un appartement et une maison ?', acceptedAnswer: { '@type': 'Answer', text: "Oui, l'outil d'estimation SellMatch prend en charge les maisons, les appartements et les terrains. Le type de bien est sélectionné à l'étape 2 du formulaire." } },
        { '@type': 'Question', name: 'L\'estimation prend-elle en compte l\'état du bien ?', acceptedAnswer: { '@type': 'Answer', text: "Oui, l'état général du bien (à rénover, correct, bon, excellent) est pris en compte à l'étape 3 pour affiner la comparaison avec les transactions similaires." } },
        { '@type': 'Question', name: 'Que faire après avoir obtenu mon estimation ?', acceptedAnswer: { '@type': 'Answer', text: "Après votre estimation, vous pouvez créer un dossier vendeur sur SellMatch pour comparer les propositions d'agences et de mandataires de votre secteur, en restant anonyme jusqu'à votre choix." } },
        { '@type': 'Question', name: 'L\'estimation est-elle disponible pour toute la France ?', acceptedAnswer: { '@type': 'Answer', text: "Oui, l'estimation utilise les données DVF+ qui couvrent l'ensemble du territoire français. La précision dépend du nombre de transactions récentes dans la zone de votre bien." } }
      ]
    });

    // - cm - Données structurées JSON-LD : BreadcrumbList
    this._Seo.SetJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.sellmatch.fr/' },
        { '@type': 'ListItem', position: 2, name: 'Estimation immobilière', item: 'https://www.sellmatch.fr/estimation-immobiliere' }
      ]
    });

    this.CurrentStep = this.SessionStorage.RestoreFormStepState(this._StoragePrefix, this.EstimationForm);
    this.UpdateStepConditions();

    this.EstimationForm.statusChanges.subscribe((): void => this.UpdateStepConditions());
  }
  //#endregion

  //#region Methods
  private UpdateStepConditions(): void
  {
    const lStep1Valid: boolean = this.Step1.valid;
    const lStep2Valid: boolean = lStep1Valid && !!this.Step2.get('propertyType')?.valid && !!this.Step2.get('surface')?.valid;
    const lStep3Valid: boolean = lStep2Valid && !!this.Step2.get('condition')?.valid;
    const lStep4Valid: boolean = lStep3Valid && this.Step2.valid;

    this.EstimationSteps = [
      { Id: 1, Label: 'Localisation', Condition: true },
      { Id: 2, Label: 'Type & Surface', Condition: lStep1Valid },
      { Id: 3, Label: 'État & Contexte', Condition: lStep2Valid },
      { Id: 4, Label: 'Atouts', Condition: lStep3Valid },
      { Id: 5, Label: 'Résultat', Condition: lStep4Valid && !!this.EstimationResult }
    ];
  }

  /**
   * Gère la sélection d'adresse depuis l'autocomplete.
   * @param pEvent Adresse sélectionnée
   * @returns Void
   */
  public OnAddressSelected(pEvent: AdressesDTO): void
  {
    if (!pEvent) return;

    const lRaw: any = pEvent;
    // - cm - Lecture défensive du code postal selon le mapping réel reçu par l'autocomplete.
    const lPostalCode: string = lRaw.codePostal ?? lRaw.CodPostal ?? lRaw.postalCode ?? lRaw.postcode ?? '';
    const lCity: string = lRaw.commune ?? lRaw.Commune ?? lRaw.city ?? '';

    this.Step1.patchValue({
      address: pEvent,
      postalCode: lPostalCode,
      city: lCity,
      lat: pEvent.latitude ?? null,
      lng: pEvent.longitude ?? null
    });
  }

  /**
   * Appelle le service d'estimation DVF.
   * @returns L'estimation calculée ou null
   */
  public async FetchEstimation(): Promise<EstimationDTO | null>
  {
    const lStep1Value: any = this.Step1.value;
    const lStep2Value: any = this.Step2.value;
    const lAddress: any = lStep1Value.address;
    const lLatitude: number | null = lAddress?.latitude ?? lAddress?.geom?.coordinates?.[1] ?? null;
    const lLongitude: number | null = lAddress?.longitude ?? lAddress?.geom?.coordinates?.[0] ?? null;

    if (!lLatitude || !lLongitude || !lStep2Value.surface)
    {
      console.warn('Coordonnées manquantes pour l\'estimation');
      return null;
    }

    const lCritere: EstimationCritereDTO = {
      longitude: lLongitude,
      latitude: lLatitude,
      typeBien: lStep2Value.propertyType,
      surfaceBien: lStep2Value.surface,
      surfaceTerrain: lStep2Value.surfaceTerrain || 0,
      etatBien: lStep2Value.condition,
      rayonMetres: 5000,
      nbMoisHistorique: 144
    };

    try
    {
      return (await this._EstimationService.get(lCritere)) ?? null;
    }
    catch (pError)
    {
      console.error('Erreur lors de l\'appel estimation', pError);
      return null;
    }
  }

  public async NextStep(): Promise<void>
  {
    if (this.IsLoading)
    {
      return;
    }

    const lCurrentForm: FormGroup = this.GetCurrentForm();
    if (lCurrentForm.valid)
    {
      // - cm - Dernière sous-étape des caractéristiques → lance l'estimation
      if (this.CurrentStep === 4)
      {
        await this.SubmitEstimation();
      }
      else
      {
        this.CurrentStep++;
        this.SessionStorage.SaveFormStepState(this._StoragePrefix, this.CurrentStep, this.EstimationForm);
      }
    }
    else
    {
      lCurrentForm.markAllAsTouched();
    }
  }

  public OnFormEnter(pEvent: Event): void
  {
    pEvent.preventDefault();
    pEvent.stopPropagation();

    void this.NextStep();
  }

  public PrevStep(): void
  {
    this.CurrentStep--;
    this.SessionStorage.SaveFormStepState(this._StoragePrefix, this.CurrentStep, this.EstimationForm);
  }

  public GoToStep(pStep: number): void
  {
    const lTargetStep: IStepItem | undefined = this.EstimationSteps.find((pItem: IStepItem): boolean => pItem.Id === pStep);

    if (lTargetStep && lTargetStep.Condition)
    {
      this.CurrentStep = pStep === 5 ? this._ResultStep : pStep;
      this.SessionStorage.SaveFormStepState(this._StoragePrefix, this.CurrentStep, this.EstimationForm);
    }
  }

  public EditCharacteristics(): void
  {
    this.CurrentStep = 2;

    this.SessionStorage.SaveFormStepState(this._StoragePrefix, this.CurrentStep, this.EstimationForm);
  }

  private GetCurrentForm(): FormGroup
  {
    switch (this.CurrentStep)
    {
      case 1: return this.Step1;
      case 2:
      case 3:
      case 4: return this.Step2;
      default: return this.Step1;
    }
  }

  private BuildEmptyEstimation(): EstimationDTO
  {
    return {
      prixMoyenMetrCarre: 0,
      prixMinEstime: 0,
      prixMaxEstime: 0,
      niveauConfiance: 'Aucune donnée',
      nombreTransactions: 0
    };
  }

  /**
   * Calcule l'estimation et déclenche le chargement du graphique enfant.
   * @returns Void
   */
  public async SubmitEstimation(): Promise<void>
  {
    if (this.IsLoading)
    {
      return;
    }

    this.IsLoading = true;
    this.BusyService.show();

    try
    {
      const lApiResult: EstimationDTO | null = await this.FetchEstimation();

      this.EstimationResult = lApiResult
        ? {
          ...lApiResult,
          prixMoyenMetrCarre: Number(lApiResult.prixMoyenMetrCarre) || 0,
          prixMinEstime: Number(lApiResult.prixMinEstime) || 0,
          prixMaxEstime: Number(lApiResult.prixMaxEstime) || 0,
          nombreTransactions: Number(lApiResult.nombreTransactions) || 0,
          niveauConfiance: lApiResult.niveauConfiance ?? 'Aucune donnée'
        }
        : this.BuildEmptyEstimation();

      const lStep2: any = this.Step2.value;
      const lStep1: any = this.Step1.value;
      const lAddress: any = lStep1.address;

      this.EvolutionChartLongitude = lAddress?.longitude ?? lAddress?.geom?.coordinates?.[0] ?? null;
      this.EvolutionChartLatitude = lAddress?.latitude ?? lAddress?.geom?.coordinates?.[1] ?? null;
      this.EvolutionChartRayonMetres = 5000;
      this.EvolutionChartTypeBien = lStep2.propertyType || 'tous';

      this.CreatedOpportunity = {
        propertyType: lStep2.propertyType,
        surface: lStep2.surface,
        priceRangeMin: this.EstimationResult.prixMinEstime,
        priceRangeMax: this.EstimationResult.prixMaxEstime,
        description: `État: ${lStep2.condition}`
      } as OpportunitiesDTO;

      // - cm - Sauvegarde l'opportunité en sessionStorage pour pré-remplir le dossier
      this.SaveOpportunityToStorage();

      this.ShowSellMatchPitch = true;
      this.CurrentStep = this._ResultStep;
      this.UpdateStepConditions();
      this.SessionStorage.ClearFormStepState(this._StoragePrefix);

    }
    catch (pError: any)
    {
      console.error('Erreur lors de l\'estimation', pError);
    }
    finally
    {
      this.IsLoading = false;
      this.BusyService.hide();
    }
  }

  public GoToRegistration(): void
  {
    // - cm - Si déjà connecté, va directement au dossier
    if (this.isLoggedIn)
    {
      const lDashboardRoute: string = this.UsersService.IsProfessionnel()
        ? this.RouteUtils.GetRoute(this.Routes.DASHBOARD_PRO)
        : this.RouteUtils.GetRoute(this.Routes.DASHBOARD_VENDEUR);
      void this._Router.navigateByUrl(lDashboardRoute);
      return;
    }
    this.CurrentStep = this._RegisterStep;
  }

  /**
   * Sauvegarde l'opportunité d'estimation en sessionStorage.
   */
  private SaveOpportunityToStorage(): void
  {
    // - cm - Inclut l'adresse dans l'opportunité pour pré-remplir le dossier
    const lStep1: any = this.Step1.value;
    const lAddress: any = lStep1.address;

    const lOpportunityToSave: OpportunitiesDTO = {
      ...this.CreatedOpportunity,
      address: typeof lAddress === 'object' ? lAddress : undefined
    };

    this.SessionStorage.Save(OutilEstimationComponent.OPPORTUNITY_STORAGE_KEY, lOpportunityToSave);
  }

  public OnRegisterSuccess(pUser: UsersDTO): void
  {
    this.CreatedUser = pUser;

    // - cm - Après inscription, redirige vers le dashboard
    const lDashboardRoute: string = this.RouteUtils.GetRoute(this.Routes.DASHBOARD_VENDEUR);
    void this._Router.navigateByUrl(lDashboardRoute);
  }

  public GoToSellMatch(): void { }

  public SkipSellMatch(): void { this.ShowSellMatchPitch = false; }
  //#endregion
}
