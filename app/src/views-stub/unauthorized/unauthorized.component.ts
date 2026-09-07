import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BaseComponent } from '@core/base/BaseComponent';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterModule, ButtonComponent],
  templateUrl: './unauthorized.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./unauthorized.component.scss']
})
export class UnauthorizedComponent extends BaseComponent
{
  /** Service de route actif pour recuperer le `returnUrl` query param pose par ServiceBase.handleUnauthorized. */
  private readonly _Route: ActivatedRoute = inject(ActivatedRoute);

  /** Router pour la navigation programmee vers /connexion avec returnUrl. */
  private readonly _Router: Router = inject(Router);

  constructor () { super(); }

  goBack(): void
  {
    window.history.back();
  }

  /**
   * Redirige vers la page de login en preservant le `returnUrl` recu en query param.
   * - cm - Le `returnUrl` est pose par ServiceBase.handleUnauthorized au moment
   * du 401 (cf. skill sellmatch-auth-session-patterns PIEGE 1). Au login reussi,
   * login.component._routeReturnUrl le lit et redirige l'utilisateur vers la
   * page d'ou il a ete deconnecte.
   * - cm - Meme politique anti open-redirect que login.component : on n'accepte
   * qu'une URL interne (commencant par /) differente de /connexion.
   */
  public goToLogin(): void
  {
    const lReturnUrl: string | null = this._Route.snapshot.queryParamMap.get('returnUrl');
    const lSafeReturn: string | null = (lReturnUrl && lReturnUrl.startsWith('/') && lReturnUrl !== '/' + this.Routes.CONNEXION)
      ? lReturnUrl
      : null;

    if (lSafeReturn)
    {
      this._Router.navigate(
        [this.RouteUtils.GetRoute(this.Routes.CONNEXION)],
        { queryParams: { returnUrl: lSafeReturn } }
      );
    }
    else
    {
      this.RouteUtils.NavigateTo(this.Routes.CONNEXION);
    }
  }

  goToDashboard(): void
  {
    if (this.UsersService.IsProfessionnel() || this.UsersService.isAdmin())
    {
      this.RouteUtils.NavigateTo(this.Routes.DASHBOARD_PRO);
    }
    else if (this.UsersService.IsVendeur())
    {
      this.RouteUtils.NavigateTo(this.Routes.DASHBOARD_VENDEUR);
    }
    else
    {
      this.RouteUtils.NavigateTo(this.Routes.HOME);
    }
  }
}
