import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, inject, effect, ElementRef, viewChild, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseComponent } from '@core/base/BaseComponent';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { SeoService } from '@core/services/seo/seo.service';
import { TranslationService } from '@core/services/i18n/TranslationService';

import { SubscriptionPlansDTO } from '@core/sellmatchdb/dto/subscription-plans/subscription-plans.dto';
import { SubscriptionPlansService } from '@core/sellmatchdb/services/subscription-plans/subscription-plans.service';
import { UserSubscriptionsService } from '@core/sellmatchdb/services/user-subscriptions/user-subscriptions.service';
import { environment } from 'src/environments/environment';

/**
 * Période de facturation pour les plans.
 */
type EBillingPeriod = 'monthly' | 'yearly' | 'one_shot';

/**
 * Mapping plan key -> logo asset.
 */
const PLAN_LOGOS: Record<string, string> = {
  pro: 'assets/logos/SellMatch_Pro_logo.webp',
  crm: 'assets/logos/SellMatch_CRM_logo.webp',
  premium: 'assets/logos/SellMatch_Premium_logo.webp',
  ecomandat: 'assets/logos/SellMatch_EcoMandat_logo.webp',
};

/**
 * Page publique de tarification SellMatch : présentation des 4 plans
 * (Pro, CRM, Premium, ÉcoMandat) et tunnel de paiement Stripe Embedded
 * directement intégré à la page. Le flux ÉcoMandat est un paiement unique
 * à 4,99€, les autres sont des abonnements mensuels ou annuels.
 */
@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, ButtonComponent, ScrollRevealDirective],
  templateUrl: './pricing-page.component.html',
  styleUrl: './pricing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingPageComponent extends BaseComponent implements OnInit, OnDestroy
{
  //#region Attributes

  /** Service des plans d'abonnement. */
  private readonly _PlanService = inject(SubscriptionPlansService);

  /** Service des souscriptions utilisateur (ServiceBase<UserSubscriptionsDTO>). */
  private readonly _Subscriptions = inject(UserSubscriptionsService);

  /** Service SEO pour les meta tags. */
  private readonly _Seo = inject(SeoService);

  /** Service de traduction (lazy-load i18n pricing). */
  private readonly _Translation = inject(TranslationService);

  /** Router. */
  private readonly _Router = inject(Router);

  /** DestroyRef. */
  private readonly _DestroyRef = inject(DestroyRef);

  /** Référence au conteneur DOM du checkout Stripe embedded. */
  private readonly _CheckoutElementRef = viewChild<ElementRef<HTMLDivElement>>('stripeCheckoutElement');

  /** Instance Stripe.js singleton. */
  private _Stripe: any | null = null;

  /** Promise du chargement du script Stripe.js (singleton). */
  private _StripeScriptPromise: Promise<void> | null = null;

  /** Instance EmbedCheckout courante. */
  private _EmbeddedCheckout: any | null = null;

  /** Plans d'abonnement chargés depuis l'API. */
  public readonly Plans = signal<SubscriptionPlansDTO[]>([]);

  /** Plan actuellement sélectionné pour le checkout. */
  public readonly SelectedPlan = signal<SubscriptionPlansDTO | null>(null);

  /** Période de facturation sélectionnée. */
  public readonly BillingPeriod = signal<EBillingPeriod>('monthly');

  /** Indique si le checkout Stripe est en cours de chargement. */
  public readonly LoadingCheckout = signal(false);

  /** Erreur lors du chargement du checkout. */
  public readonly CheckoutError = signal<string | null>(null);

  /** Client secret Stripe pour le checkout embedded. */
  public readonly ClientSecret = signal<string | null>(null);

  /** ID de session Stripe. */
  public readonly SessionId = signal<string | null>(null);

  /** Indique si le paiement a réussi (affiché après retour). */
  public readonly PaymentSucceeded = signal(false);

  /** Indique si l'utilisateur est connecté (lu depuis BaseComponent). */
  public readonly IsLoggedIn = computed<boolean>(() => this.isLoggedIn);

  /** Périodes de facturation disponibles pour les abonnements. */
  public readonly BillingPeriods: EBillingPeriod[] = ['monthly', 'yearly'];

  /** Label périodes. */
  public readonly BillingPeriodLabels: Record<EBillingPeriod, string> = {
    monthly: '/mois',
    yearly: '/an',
    one_shot: ' - Paiement unique',
  };

  //#endregion

  //#region CTOR

  /**
   * Constructeur : crée l'effect de montage Stripe Embedded.
   * Token d'obsolescence pour éviter les mounts concurrents sur changements rapides.
   */
  public constructor()
  {
    super();

    let lLatestMountToken = 0;

    effect(() =>
    {
      const lClientSecret = this.ClientSecret();
      const lSelectedPlan = this.SelectedPlan();
      const lElementRef = this._CheckoutElementRef();

      if (!lClientSecret || !lSelectedPlan || lSelectedPlan.isOneShot === undefined)
      {
        return;
      }

      if (!lElementRef?.nativeElement)
      {
        return;
      }

      lLatestMountToken++;
      const lMyToken = lLatestMountToken;

      void (async () =>
      {
        await this.DisposeEmbeddedCheckout();

        if (lMyToken !== lLatestMountToken)
        {
          return;
        }

        const lContainer = this._CheckoutElementRef()?.nativeElement;
        if (!lContainer)
        {
          return;
        }

        await this.InitEmbeddedCheckout(lClientSecret, lContainer);

        if (lMyToken !== lLatestMountToken)
        {
          await this.DisposeEmbeddedCheckout();
        }
      })();
    });
  }

  //#endregion

  //#region Lifecycle

  public async ngOnInit(): Promise<void>
  {
    this._Seo.SetPageMeta({
      Title: 'Tarifs | SellMatch — Pro, CRM, Premium et ÉcoMandat',
      Description: 'Découvrez les offres SellMatch : Pro, CRM, Premium et ÉcoMandat. Paiement 100% sécurisé via Stripe. ÉcoMandat : mandat en ligne à 4,99€, paiement unique.',
      CanonicalUrl: this._Seo.BuildUrl('/pricing'),
      OgTitle: 'Tarifs SellMatch',
      OgDescription: 'Pro, CRM, Premium ou ÉcoMandat : choisissez l\'offre adaptée à votre activité immobilière.',
    });

    // - cm - Lazy-load du sous-registre i18n 'pricing' au montage,
    // puis re-fetch si l'utilisateur change de langue (pattern identique à home).
    void this.Translate.loadPageTranslations('pricing');
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang) => void this.Translate.loadPageTranslations('pricing', pLang));

    await this.LoadPlans();
  }

  public ngOnDestroy(): void
  {
    void this.DisposeEmbeddedCheckout();
  }

  //#endregion

  //#region Methods

  /**
   * Charge les plans d'abonnement actifs depuis l'API.
   */
  private async LoadPlans(): Promise<void>
  {
    try
    {
      const lPlans = await this._PlanService.getAll({ isActive: true });
      lPlans.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      this.Plans.set(lPlans);
      this.PostHog.Capture(this.BuildTrackingName('pricing_plans_load', 'tracking'), { count: lPlans.length });
    }
    catch (pError: any)
    {
      console.error('Erreur chargement plans:', pError);
    }
  }

  /**
   * Sélectionne un plan et démarre le checkout si l'utilisateur est connecté.
   * Sinon redirige vers la page de connexion en mémorisant le plan.
   * @param pPlan Le plan sélectionné.
   */
  public async SelectPlan(pPlan: SubscriptionPlansDTO): Promise<void>
  {
    if (this.SelectedPlan()?.key === pPlan.key && !this.PaymentSucceeded())
    {
      this.SelectedPlan.set(null);
      this.ClientSecret.set(null);
      this.SessionId.set(null);
      this.CheckoutError.set(null);
      return;
    }

    if (!this.IsLoggedIn())
    {
      this.PostHog.Capture(this.BuildTrackingName('pricing_login_required', 'tracking'), { planKey: pPlan.key });
      void this._Router.navigate(['/connexion'], { queryParams: { redirect: '/pricing', plan: pPlan.key } });
      return;
    }

    this.SelectedPlan.set(pPlan);
    this.PaymentSucceeded.set(false);
    this.CheckoutError.set(null);
    this.ClientSecret.set(null);
    this.SessionId.set(null);

    const lPeriod: EBillingPeriod = pPlan.isOneShot ? 'one_shot' : this.BillingPeriod();
    await this.StartCheckout(pPlan, lPeriod);
  }

  /**
   * Change la période de facturation et relance le checkout si un plan subscription est sélectionné.
   * @param pPeriod La nouvelle période.
   */
  public async OnBillingPeriodChange(pPeriod: EBillingPeriod): Promise<void>
  {
    this.BillingPeriod.set(pPeriod);
    const lPlan = this.SelectedPlan();
    if (lPlan && !lPlan.isOneShot)
    {
      await this.StartCheckout(lPlan, pPeriod);
    }
  }

  /**
   * Démarre le checkout Stripe en appelant l'API Subscription moderne.
   * @param pPlan Le plan à souscrire.
   * @param pBillingPeriod Période de facturation.
   */
  private async StartCheckout(pPlan: SubscriptionPlansDTO, pBillingPeriod: EBillingPeriod): Promise<void>
  {
    this.LoadingCheckout.set(true);
    this.CheckoutError.set(null);

    try
    {
      const lUserIdStr = this.CurrentUserId;
      const lUserId = lUserIdStr ? parseInt(lUserIdStr, 10) : 0;
      if (!lUserId)
      {
        throw new Error('Utilisateur non authentifié.');
      }

      // - cm - SubscriptionController (moderne) : crée la souscription BDD + la session Stripe Embedded.
      const lCreated = await this._Subscriptions.create({
        userId: lUserId,
        planId: pPlan.id,
        billingPeriod: pBillingPeriod,
      });

      if (!lCreated?.stripeSubscriptionId)
      {
        throw new Error('Réponse invalide du serveur (clientSecret manquant).');
      }

      this.ClientSecret.set(lCreated.stripeSubscriptionId);
      this.SessionId.set(lCreated.stripeCustomerId ?? null);

      this.PostHog.Capture(this.BuildTrackingName('pricing_checkout_start', 'tracking'), {
        planKey: pPlan.key,
        billingPeriod: pBillingPeriod,
      });
    }
    catch (pError: any)
    {
      const lMessage = pError?.message ?? 'Erreur inconnue';
      this.CheckoutError.set(lMessage);
      this.PostHog.Capture(this.BuildTrackingName('pricing_checkout_error', 'tracking'), {
        planKey: pPlan.key,
        error: lMessage,
      });
    }
    finally
    {
      this.LoadingCheckout.set(false);
    }
  }

  /**
   * Libère l'instance Stripe Embedded Checkout courante.
   */
  private async DisposeEmbeddedCheckout(): Promise<void>
  {
    if (this._EmbeddedCheckout)
    {
      try
      {
        await this._EmbeddedCheckout.unmount();
      }
      catch (pError: any)
      {
        console.warn('Stripe Embedded unmount warn:', pError);
      }
      this._EmbeddedCheckout = null;
    }
  }

  /**
   * Initialise et monte le checkout Stripe embedded dans le conteneur DOM.
   * @param pClientSecret Le client secret Stripe.
   * @param pContainer L'élément DOM hôte.
   */
  private async InitEmbeddedCheckout(pClientSecret: string, pContainer: HTMLElement): Promise<void>
  {
    try
    {
      if (!this._Stripe)
      {
        await this.LoadStripeScript();
        this._Stripe = (window as any).Stripe(environment.publishableKey);
      }
      const lStripe = this._Stripe;

      const lCheckout = await lStripe.initEmbeddedCheckout({
        clientSecret: pClientSecret,
      });

      lCheckout.mount(pContainer);
      this._EmbeddedCheckout = lCheckout;

      this.PostHog.Capture(this.BuildTrackingName('pricing_checkout_mount', 'tracking'), {});
    }
    catch (pError: any)
    {
      this.CheckoutError.set('Erreur lors de l\'affichage du formulaire de paiement');
      console.error('Stripe embedded init error:', pError);
    }
  }

  /**
   * Charge le script Stripe.js (singleton).
   */
  private LoadStripeScript(): Promise<void>
  {
    if (this._StripeScriptPromise)
    {
      return this._StripeScriptPromise;
    }

    this._StripeScriptPromise = new Promise((pResolve, pReject) =>
    {
      if ((window as any).Stripe)
      {
        pResolve();
        return;
      }

      const lScript = document.createElement('script');
      lScript.src = 'https://js.stripe.com/v3/';
      lScript.async = true;
      lScript.onload = () => pResolve();
      lScript.onerror = () =>
      {
        this._StripeScriptPromise = null;
        pReject(new Error('Impossible de charger Stripe.js'));
      };
      document.body.appendChild(lScript);
    });

    return this._StripeScriptPromise;
  }

  /**
   * Réinitialise la sélection de plan.
   */
  public ResetSelection(): void
  {
    this.SelectedPlan.set(null);
    this.ClientSecret.set(null);
    this.SessionId.set(null);
    this.CheckoutError.set(null);
    this.PaymentSucceeded.set(false);
    this.PostHog.Capture(this.BuildTrackingName('pricing_reset', 'tracking'), {});
  }

  /**
   * Retourne le chemin du logo pour un plan donné.
   * @param pPlanKey La clé du plan.
   * @returns Le chemin du logo ou undefined.
   */
  public GetPlanLogo(pPlanKey?: string): string | undefined
  {
    if (!pPlanKey) return undefined;
    return PLAN_LOGOS[pPlanKey];
  }

  /**
   * Retourne le prix formaté pour un plan et une période.
   * @param pPlan Le plan.
   * @param pPeriod La période.
   * @returns Le prix formaté ou undefined.
   */
  public GetPlanPrice(pPlan: SubscriptionPlansDTO, pPeriod: EBillingPeriod): string | undefined
  {
    if (pPlan.isOneShot)
    {
      return pPlan.priceOneShotTtc != null ? `${pPlan.priceOneShotTtc.toFixed(2)} €` : undefined;
    }

    switch (pPeriod)
    {
      case 'monthly':
        return pPlan.priceMonthlyHt != null ? `${pPlan.priceMonthlyHt.toFixed(2)} € HT` : undefined;
      case 'yearly':
        return pPlan.priceYearlyHt != null ? `${pPlan.priceYearlyHt.toFixed(2)} € HT` : undefined;
      default:
        return undefined;
    }
  }

  /**
   * Indique si un plan est l'ÉcoMandat (paiement unique).
   * @param pPlan Le plan.
   * @returns true si c'est l'ÉcoMandat.
   */
  public IsEcoMandat(pPlan: SubscriptionPlansDTO): boolean
  {
    return pPlan.key === 'ecomandat';
  }

  //#endregion
}
