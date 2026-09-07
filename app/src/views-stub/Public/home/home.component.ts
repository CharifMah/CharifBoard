import { Component, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseComponent } from '@base/BaseComponent';
import { TranslationService } from '@core/services/i18n/TranslationService';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ScrollIndicatorComponent } from '@shared/components/scroll-indicator/scroll-indicator.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { PricingSummaryComponent } from '@shared/components/pricing-summary/pricing-summary.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, TranslatePipe, ScrollRevealDirective, ButtonComponent, ScrollIndicatorComponent, BadgeComponent, PricingSummaryComponent],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent extends BaseComponent implements AfterViewInit
{
  //#region Attribute
  private _IsBrowser: boolean;

  /**
   * Service de traduction (lazy-load du sous-registre de page).
   * - cm - Charge uniquement les cles i18n de la page home au demarrage du composant.
   * Indispensable pour eviter le FOUC : sans cet appel, la home naviguee en
   * SPA reste sur les cles brutes (home.hero.title, etc.) tant que le global
   * n'a pas re-fetch + merge. Cote SSR pre-render, _FetchJson lit le JSON
   * via fs.readFile, donc le HTML pre-rendu contient directement les traductions.
   */
  private readonly _Translation: TranslationService = inject(TranslationService);

  /**
   * DestroyRef local (pas en champ de classe) pour takeUntilDestroyed sur la
   * subscription LanguageChanged : permet le cleanup automatique sans collision
   * avec les `_DestroyRef` declares en private dans les sous-classes.
   */
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);
  //#endregion

  constructor(@Inject(PLATFORM_ID) pPlatformId: object)
  {
    super();
    this._IsBrowser = isPlatformBrowser(pPlatformId);
    // - cm - Lazy-load du sous-registre i18n de la page home (clés home.*)
    // dans la langue COURANTE au montage du composant.
    void this.Translate.loadPageTranslations('home');

    // - cm - OBLIGATOIRE : re-fetch du sous-registre quand l'utilisateur change de langue.
    // Sans ça, ngx-translate retourne la clé brute (home.hero.title, etc.) après
    // switch FR→EN. loadPageTranslations ne charge QUE la langue passée (ou la
    // courante par défaut), donc les autres langues ne sont jamais fetchées tant
    // qu'on reste sur la page.
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang) =>
      {
        void this.Translate.loadPageTranslations('home', pLang);
      });
  }

  ngAfterViewInit(): void
  {
    if (!this._IsBrowser) return;

    // - cm - L'animation d'entrée des boutons est gérée en CSS via btn-stagger-enter
  }

  // - cm - Les textes de la home sont gérés via i18n (TranslateService) et les fichiers
  // co-localisés home.{lang}.json. Voir home.component.html pour les bindings.
}
