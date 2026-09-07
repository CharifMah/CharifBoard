import { Component, OnInit, inject, Output, EventEmitter, Input, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { UsersDTO, AdressesDTO } from '@core/sellmatchdb/dto';
import { BaseComponent } from '@base/BaseComponent';
import { MessageDisplayComponent } from '@shared/components/message-display/message-display.component';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { TabItem, TabsComponent } from '@shared/components/tabs/tabs.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslationService } from '@core/services/i18n/TranslationService';

/**
 * Composant de gestion de l'inscription (Vendeur / Professionnel).
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, MessageDisplayComponent, PopupComponent, TabsComponent, InputComponent, ButtonComponent, TranslatePipe],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent extends BaseComponent implements OnInit
{
  //#region Attribute
  /**
   * Service de traduction (lazy-load du sous-registre de page).
   * - cm - Charge uniquement les cles i18n de la page register au demarrage du composant.
   */
  private readonly _Translation: TranslationService = inject(TranslationService);

  /**
   * DestroyRef local pour takeUntilDestroyed sur la subscription LanguageChanged.
   */
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);
  //#endregion

  //#region Properties
  @Input() TabVisible: boolean = true;
  @Input() IsEstimation: boolean = false;

  @Output() RegisterSuccess = new EventEmitter<UsersDTO>();

  public RegisterForm!: FormGroup;
  public IsLoading = false;
  public ErrorMessage = '';
  public SuccessMessage = '';
  public ShowPassword = false;
  public ShowConfirmPassword = false;
  public ShowEmailPopup = false;
  public PopupTitle = '';
  public PopupSubtitle = '';
  //#endregion

  //#region Fields
  private readonly _fb: FormBuilder = inject(FormBuilder);
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);

  public ActiveTab: string = 'vendeur';

  public get TabItems(): TabItem[]
  {
    return [
      { id: 'vendeur', label: this.Translate.translate('register.tabs.vendeur'), icon: 'person' },
      { id: 'professionnel', label: this.Translate.translate('register.tabs.professionnel'), icon: 'business' }
    ];
  }
  //#endregion

  //#region Lifecycle

  /**
   * Initialise le composant et détecte l'onglet actif via l'URL.
   */
  ngOnInit(): void
  {
    // - cm - Lazy-load du sous-registre i18n de la page register (clés register.*)
    // dans la langue COURANTE au montage du composant.
    void this.Translate.loadPageTranslations('register');

    // - cm - Au changement de langue via le sélecteur, on re-charge le sous-registre
    // de la page pour la NOUVELLE langue. Sans ça, ngx-translate retourne la clé
    // brute (le sous-registre n'a été fetché que pour la langue d'origine).
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang) =>
      {
        void this.Translate.loadPageTranslations('register', pLang);
      });

    this._route.url.subscribe(urlSegments =>
    {
      const lCurrentPath = urlSegments.join('');
      this.ActiveTab = lCurrentPath.includes('pro') ? 'professionnel' : 'vendeur';
      this._InitForm();
    });
  }

  //#endregion

  //#region Getters

  /**
   * Indique si l'onglet actif est "Professionnel".
   */
  override get IsProfessionnel(): boolean
  {
    return this.ActiveTab === 'professionnel';
  }

  /**
   * Indique si l'onglet actif est "Vendeur".
   */
  override get IsVendeur(): boolean
  {
    return this.ActiveTab === 'vendeur';
  }

  /**
   * Titre de la page selon le contexte.
   */
  get PageTitle(): string
  {
    return this.Translate.translate(this.IsProfessionnel
      ? 'register.title.professionnel'
      : 'register.title.vendeur');
  }

  /**
   * Sous-titre de la page selon le contexte.
   */
  get PageSubtitle(): string
  {
    return this.Translate.translate(this.IsProfessionnel
      ? 'register.subtitle.professionnel'
      : 'register.subtitle.vendeur');
  }

  /**
   * Icône de la page.
   */
  get PageIcon(): string
  {
    return this.IsProfessionnel ? 'business' : 'person_add';
  }

  /**
   * Vérifie si le formulaire est valide et prêt à être soumis.
   */
  get CanSubmit(): boolean
  {
    return this.RegisterForm?.valid && !this.IsLoading;
  }

  //#endregion

  //#region Methods

  /**
   * Change l'onglet actif et navigue vers la route correspondante.
   * @param pOnglet Identifiant de l'onglet cible
   */
  ChangerOnglet(pOnglet: string): void
  {
    if (pOnglet === 'vendeur')
    {
      this.RouteUtils.NavigateTo(this.Routes.INSCRIPTION_VENDEUR);
    } else
    {
      this.RouteUtils.NavigateTo(this.Routes.INSCRIPTION_PRO);
    }
  }

  /**
   * Initialise le formulaire avec les contrôles de base et spécifiques.
   */
  private _InitForm(): void
  {
    // - cm - Contrôles communs (l'adresse n'est plus requise pour les particuliers)
    const lBaseControls = {
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      firstName: [''],
      lastName: [''],
      phone: ['', [Validators.pattern(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      address: [null] // - cm - Plus de Validators.required ici
    };

    if (this.IsProfessionnel)
    {
      this.RegisterForm = this._fb.group({
        ...lBaseControls,
        phone: ['', [Validators.required, Validators.pattern(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/)]],
        siret: ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],
        agency: ['', [Validators.required, Validators.maxLength(100)]],
        address: [null, [Validators.required]], // - cm - Adresse requise SEULEMENT pour les pros
      }, { validators: this._PasswordMatchValidator });
    } else
    {
      this.RegisterForm = this._fb.group({
        ...lBaseControls
      }, { validators: this._PasswordMatchValidator });
    }
  }

  /**
   * Gère la sélection d'adresse depuis l'autocomplete.
   * @param pAddress L'adresse sélectionnée ou la chaîne saisie
   */
  public OnCitySelected(pAddress: AdressesDTO | string): void
  {
    // - cm - On ne réagit qu'à la sélection d'une suggestion (objet DTO)
    if (!pAddress || typeof pAddress === 'string')
    {
      return;
    }
    this.RegisterForm.patchValue({
      address: pAddress
    });
  }

  /**
   * Soumet le formulaire d'inscription.
   */
  public async OnSubmit(): Promise<void>
  {
    if (this.RegisterForm.invalid)
    {
      this.RegisterForm.markAllAsTouched();
      this.ErrorMessage = this.Translate.translate('register.submit.error.formInvalid');
      return;
    }

    this.IsLoading = true;
    this.ErrorMessage = '';
    this.SuccessMessage = '';

    try
    {
      const lFormValue = this.RegisterForm.value;

      const lUserData: UsersDTO = {
        email: lFormValue.email.trim().toLowerCase(),
        username: lFormValue.username.trim(),
        firstName: lFormValue.firstName?.trim() || '',
        lastName: lFormValue.lastName?.trim() || '',
        phone: lFormValue.phone?.trim() || '',
        passwordHash: lFormValue.password,
        address: lFormValue.address
      };

      if (this.IsProfessionnel)
      {
        lUserData.siret = lFormValue.siret?.trim();
        lUserData.companyName = lFormValue.agency?.trim();
      }

      const lCreatedUser: UsersDTO | Error = await this.UsersService.create(lUserData);

      if (lCreatedUser instanceof Error)
      {
        this.ErrorMessage = lCreatedUser.message || this.Translate.translate('register.submit.error.generic');
        return;
      }

      this.RegisterSuccess.emit(lCreatedUser);

      this.PopupTitle = this.Translate.translate('register.popup.title.confirmation');
      this.PopupSubtitle = this.Translate.translate('register.popup.subtitle.emailSentTo', { 0: lUserData.email });
      this.ShowEmailPopup = true;
    } catch (pError: any)
    {
      this.ErrorMessage = pError.message || this.Translate.translate('register.submit.error.generic');
    } finally
    {
      this.IsLoading = false;
    }
  }

  /**
   * Bascule la visibilité du mot de passe.
   */
  public TogglePassword(): void
  {
    this.ShowPassword = !this.ShowPassword;
  }

  /**
   * Bascule la visibilité de la confirmation du mot de passe.
   */
  public ToggleConfirmPassword(): void
  {
    this.ShowConfirmPassword = !this.ShowConfirmPassword;
  }

  /**
   * Ferme la popup et navigue vers la connexion si nécessaire.
   */
  public OnConfirmPopup(): void
  {
    this.ShowEmailPopup = false;
    if (!this.IsEstimation)
    {
      this.RouteUtils.NavigateTo(this.Routes.CONNEXION);
    }
  }

  /**
   * Validateur personnalisé pour vérifier la correspondance des mots de passe.
   * @param pControl Le contrôle du formulaire
   * @returns Erreur si non correspondance, null sinon
   */
  private _PasswordMatchValidator(pControl: AbstractControl): ValidationErrors | null
  {
    const lPassword = pControl.get('password')?.value;
    const lConfirmPassword = pControl.get('confirmPassword')?.value;

    if (!lPassword || !lConfirmPassword) return null;

    return lPassword === lConfirmPassword ? null : { passwordMismatch: true };
  }

  //#endregion
}