// login.component.ts
import { Component, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsersService } from '@core/sellmatchdb/services';
import { UsersDTO } from '@core/sellmatchdb/dto';
import { BaseComponent } from '@base/BaseComponent';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslationService } from '@core/services/i18n/TranslationService';
import { LastUrlService } from '@core/services/last-url/LastUrlService';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, InputComponent, ButtonComponent, TranslatePipe],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent extends BaseComponent
{
  //#region Attribute
  /**
   * Service de traduction (lazy-load du sous-registre de page).
   * - cm - Charge uniquement les cles i18n de la page login au demarrage du composant.
   */
  private readonly _Translation: TranslationService = inject(TranslationService);

  /**
   * Service de persistance de la derniere URL authentifiee.
   * - cm - Utilise apres login pour rediriger l'utilisateur vers la page
   * ou il etait (cas du relogin apres 401 / nouvelle session).
   */
  private readonly _LastUrl: LastUrlService = inject(LastUrlService);

  /**
   * DestroyRef local (pas en champ de classe) pour takeUntilDestroyed sur la
   * subscription LanguageChanged : permet le cleanup automatique sans collision
   * avec les `_DestroyRef` declares en private dans les sous-classes.
   */
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);
  //#endregion

  //#region Property
  public loginForm: FormGroup;
  public isLoading = false;
  public errorMessage = '';
  public successMessage = '';
  //#endregion

  constructor (
    private readonly _fb: FormBuilder,
    private readonly _userService: UsersService,
    private readonly _router: Router,
    private readonly _route: ActivatedRoute
  )
  {
    super();
    // - cm - Lazy-load du sous-registre i18n de la page login (clés login.*)
    // dans la langue COURANTE au montage du composant.
    void this.Translate.loadPageTranslations('login');

    // - cm - Au changement de langue via le sélecteur, on re-charge le sous-registre
    // de la page pour la NOUVELLE langue. Sans ça, ngx-translate retourne la clé
    // brute (le sous-registre n'a été fetché que pour la langue d'origine).
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang) =>
      {
        void this.Translate.loadPageTranslations('login', pLang);
      });

    // - cm - En mode dev (non-production), pré-remplit les identifiants admin
    const lDefaultEmail: string = environment.production ? '' : 'admin';
    const lDefaultPassword: string = environment.production ? '' : '123456789';
    this.loginForm = this._fb.group({
      emailOrUsername: [lDefaultEmail, Validators.required],
      password: [lDefaultPassword, [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  /**
   * Récupère l'URL de retour transmise par les guards via le query param `returnUrl`.
   * - cm - Permet de renvoyer l'utilisateur sur la page qu'il tentait d'atteindre avant login.
   */
  private get _routeReturnUrl(): string | null
  {
    const lReturnUrl: string | null = this._route.snapshot.queryParamMap.get('returnUrl');
    // - cm - On n'accepte qu'une URL interne absolue (commençant par /) pour éviter une open-redirect
    return lReturnUrl && lReturnUrl.startsWith('/') ? lReturnUrl : null;
  }

  public async onSubmit(): Promise<void>
  {
    if (this.loginForm.invalid)
    {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try
    {
      const lUser: UsersDTO = {
        email: this.loginForm.value.emailOrUsername,
        passwordHash: this.loginForm.value.password,
      };

      // Le service gère maintenant le stockage automatiquement
      const lResult : UsersDTO | null = await this._userService.login(lUser);

      // - cm - Le token JWT est stocké dans un cookie HttpOnly par le serveur
      // On vérifie la présence de l'utilisateur (id) plutôt que du token
      if (lResult?.id)
      {
        this.successMessage = this.Translate.translate('login.success');

        this.Translate.setLanguage(this.Translate.getCurrentLanguage());

        // - cm - Priorite 1 : returnUrl query param (transmis par authGuard quand
        // l'utilisateur a clique sur un lien protege sans etre connecte).
        const lReturnUrl: string | null = this._routeReturnUrl;
        if (lReturnUrl)
        {
          this._router.navigateByUrl(lReturnUrl);
          return;
        }

        // - cm - Priorite 2 : derniere URL authentifiee persistee par LastUrlService.
        // Couvre le cas du relogin apres 401 (token expire) : le LastUrlService
        // a sauvegarde l'URL avant la deconnexion, on y retourne maintenant.
        const lLastUrl: string | null = this._LastUrl.GetLastUrl();
        if (lLastUrl)
        {
          this._router.navigateByUrl(lLastUrl);
          // - cm - On n'efface PAS la lastUrl ici : un futur relogin (autre device)
          // doit pouvoir y retourner. L'effacement est fait par Clear() si besoin
          // (ex: l'utilisateur clique sur "tableau de bord" explicitement).
          return;
        }

        // - cm - Priorite 3 : redirection basée sur le rôle (cohérent avec roleGuard et guestGuard)
        if (this._userService.IsProfessionnel() || this._userService.isAdmin())
        {
          this.RouteUtils.NavigateTo(this.Routes.DASHBOARD_PRO);
        }
        else if (this._userService.IsVendeur())
        {
          this.RouteUtils.NavigateTo(this.Routes.DASHBOARD_VENDEUR);
        }
        else
        {
          this.RouteUtils.NavigateTo(this.Routes.HOME);
        }

      } else
      {
        this.errorMessage = this.Translate.translate('login.error.invalidCredentials');
      }
    } catch (error: any)
    {
      this.errorMessage = error.message || this.Translate.translate('login.error.generic');
    } finally
    {
      this.isLoading = false;
    }
  }
}
