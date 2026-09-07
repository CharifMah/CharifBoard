import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, inject, effect, ElementRef, viewChild } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { TabsComponent, TabItem } from '@shared/components/tabs/tabs.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SubscriptionPlansDTO } from '@core/sellmatchdb/dto';
import { SubscriptionPlansService } from '@core/sellmatchdb/services/subscription-plans/subscription-plans.service';
import { UserSubscriptionsService } from '@core/sellmatchdb/services/user-subscriptions/user-subscriptions.service';
import { environment } from 'src/environments/environment';

/**
 * Mode d'affichage du playground Stripe.
 * - demo : sélection de plan + checkout Stripe embedded.
 * - info : documentation et code à copier.
 */
type EStripePlaygroundMode = 'demo' | 'info';

/**
 * Période de facturation pour les plans.
 */
type EBillingPeriod = 'monthly' | 'yearly' | 'one_shot';

/**
 * Mapping plan key -> logoasset.
 */
const PLAN_LOGOS: Record<string, string> = {
  'pro': 'assets/logos/SellMatch_Pro_logo.webp',
  'crm': 'assets/logos/SellMatch_CRM_logo.webp',
  'premium': 'assets/logos/SellMatch_Premium_logo.webp',
  'ecomandat': 'assets/logos/SellMatch_EcoMandat_logo.webp',
};

/**
 * Label lisible pour chaque période de facturation.
 */
const BILLING_PERIOD_LABELS: Record<EBillingPeriod, string> = {
  'monthly': '/mois',
  'yearly': '/an',
  'one_shot': ' - Paiement unique',
};

/**
 * Section du playground dédiée aux composants de paiement Stripe :
 * sélection de plan SellMatch, checkout embedded Stripe, et documentation.
 */
@Component({
  selector: 'app-playground-stripe-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, TabsComponent, ButtonComponent],
  templateUrl: './playground-stripe-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './playground-stripe-section.component.scss'
})
export class PlaygroundStripeSectionComponent extends BaseComponent implements OnInit, OnDestroy
{
  //#region Attributes

  /** Service des plans d'abonnement. */
  private readonly _PlanService = inject(SubscriptionPlansService);

  /** Service des souscriptions utilisateur (ServiceBase<UserSubscriptionsDTO>). */
  private readonly _Subscriptions = inject(UserSubscriptionsService);

  /** Référence au conteneur DOM du checkout Stripe embedded. */
  private readonly _CheckoutElementRef = viewChild<ElementRef<HTMLDivElement>>('stripeCheckoutElement');

  /** Instance Stripe.js singleton (chargée une seule fois). */
  private _Stripe: any | null = null;

  /** Promise du chargement du script Stripe.js (singleton — évite les races). */
  private _StripeScriptPromise: Promise<void> | null = null;

  /** Instance EmbedCheckout courante (pour unmount avant un nouveau mount). */
  private _EmbeddedCheckout: any | null = null;

  /** Onglet actif dans la sous-navigation Stripe. */
  public readonly ActiveMode = signal<EStripePlaygroundMode>('demo');

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

  /** Indique si le paiement a réussi. */
  public readonly PaymentSucceeded = signal(false);

  /** Onglets de la sous-section Stripe. */
  public readonly ModeTabs: TabItem[] = [
    { id: 'demo', label: 'Démo interactive', icon: 'payment' },
    { id: 'info', label: 'Documentation', icon: 'code' }
  ];

  /** Périodes de facturation disponibles pour les plans subscription. */
  public readonly BillingPeriods: EBillingPeriod[] = ['monthly', 'yearly'];

  /** Label périodes. */
  public readonly BillingPeriodLabels = BILLING_PERIOD_LABELS;

  /** Snippet copiable pour l'intégration du composant Stripe. */
  public readonly StripeCode: string = `<!-- Sélection de plan + checkout embedded -->
<app-stripe-checkout
  [plan]="selectedPlan"
  billingPeriod="monthly"
  (paymentSuccess)="onPaymentSuccess($event)"
  (paymentError)="onPaymentError($event)" />

<!-- API directe (sans composant) — utilise UserSubscriptionsService (ServiceBase<UserSubscriptionsDTO>) -->
const created = await this.subscriptions.create({
  userId: this.currentUserId,
  planId: this.selectedPlan.id,
  billingPeriod: 'monthly',
});
const { stripeClientSecret, stripeSessionId } = created;`;

  /** Snippet copiable pour le service Stripe. */
  public readonly StripeServiceCode: string = `// Service Stripe : création de session et vérification
import { UserSubscriptionsService } from '@core/sellmatchdb/services/user-subscriptions/user-subscriptions.service';

// Créer une session de checkout via Subscription API (UserSubscriptionsService hérite de ServiceBase)
const created = await this.subscriptions.create({
  userId: this.currentUserId,
  planId: this.selectedPlan.id,
  billingPeriod: 'monthly',
});
const { stripeClientSecret, stripeSessionId } = created;

// Vérifier le statut d'une session via SessionStatusController (legacy)
const verification = await stripeService.verifyPaymentSession(stripeSessionId);`;

  //#endregion

  //#region CTOR

  /**
   * Constructeur : crée l'effect de montage Stripe Embedded.
   * L'effect est synchrone mais les opérations Stripe sont async :
   * on stocke la dernière "opération de mount" et on annule la précédente
   * via un token pour garantir qu'un seul mount() n'est actif à la fois.
   * (Sinon Stripe throw "You cannot have multiple Embedded Checkout objects")
   */
  public constructor()
  {
    super();

    let lLatestMountToken = 0;

    effect(() => {
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

      // - cm - Token d'obsolescence : tout mount précédent en cours est annulé
      lLatestMountToken++;
      const lMyToken = lLatestMountToken;

      // - cm - Séquence async : dispose PUIS mount (pas en parallèle, pas en void)
      void (async () =>
      {
        await this.DisposeEmbeddedCheckout();

        // - cm - Si une autre opération a démarré entre-temps, abandonner
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
          // Une autre opération nous a supplantés : nettoyer
          await this.DisposeEmbeddedCheckout();
        }
      })();
    });
  }

  //#endregion

  //#region Lifecycle

  public async ngOnInit(): Promise<void>
  {
    await this.LoadPlans();
  }

  public ngOnDestroy(): void
  {
    // - cm - Cleanup Stripe Embedded Checkout à la destruction du composant
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
      // - cm - Trier par displayOrder
      lPlans.sort((a: SubscriptionPlansDTO, b: SubscriptionPlansDTO) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      this.Plans.set(lPlans);
      this.PostHog.Capture(this.BuildTrackingName('playground_stripe_plans_load', 'tracking'), { count: lPlans.length });
    }
    catch (pError: any)
    {
      console.error('Erreur chargement plans:', pError);
    }
  }

  /**
   * Gère le changement d'onglet de la sous-section Stripe.
   * @param pMode Le mode sélectionné (demo ou info).
   */
  public OnModeChange(pMode: string): void
  {
    this.ActiveMode.set(pMode as EStripePlaygroundMode);
    this.PostHog.Capture(this.BuildTrackingName('playground_stripe_mode_change', 'tracking'), { mode: pMode });
  }

  /**
   * Sélectionne un plan et lance le checkout Stripe embedded.
   * @param pPlan Le plan sélectionné.
   */
  public async SelectPlan(pPlan: SubscriptionPlansDTO): Promise<void>
  {
    if (this.SelectedPlan()?.key === pPlan.key && !this.PaymentSucceeded())
    {
      // - cm - Désélectionne si on reclic sur le même plan
      this.SelectedPlan.set(null);
      this.ClientSecret.set(null);
      this.SessionId.set(null);
      this.CheckoutError.set(null);
      return;
    }

    this.SelectedPlan.set(pPlan);
    this.PaymentSucceeded.set(false);
    this.CheckoutError.set(null);
    this.ClientSecret.set(null);
    this.SessionId.set(null);

    const lPeriod = pPlan.isOneShot ? 'one_shot' : this.BillingPeriod();
    await this.StartCheckout(pPlan.key ?? '', lPeriod);
  }

  /**
   * Change la période de facturation et relance le checkout si un plan est sélectionné.
   * @param pPeriod La nouvelle période.
   */
  public async OnBillingPeriodChange(pPeriod: EBillingPeriod): Promise<void>
  {
    this.BillingPeriod.set(pPeriod);
    const lPlan = this.SelectedPlan();
    if (lPlan && !lPlan.isOneShot)
    {
      await this.StartCheckout(lPlan.key ?? '', pPeriod);
    }
  }

  /**
   * Démarre le checkout Stripe en appelant l'API Subscription.
   * @param pPlanKey Clé du plan (non utilisée côté API : on envoie planId).
   * @param pBillingPeriod Période de facturation.
   */
  private async StartCheckout(pPlanKey: string, pBillingPeriod: string): Promise<void>
  {
    this.LoadingCheckout.set(true);
    this.CheckoutError.set(null);

    try
    {
      const lPlan = this.SelectedPlan();
      if (!lPlan?.id)
      {
        throw new Error('Plan invalide (id manquant).');
      }

      const lUserIdStr = this.CurrentUserId;
      const lUserId = lUserIdStr ? parseInt(lUserIdStr, 10) : 0;
      if (!lUserId)
      {
        throw new Error('Utilisateur non authentifié.');
      }

      // - cm - Utilise UserSubscriptionsService (ServiceBase<UserSubscriptionsDTO>) :
      // crée la souscription en BDD ET la session Stripe Checkout Embedded côté backend.
      const lCreated = await this._Subscriptions.create({
        userId: lUserId,
        planId: lPlan.id,
        billingPeriod: pBillingPeriod,
      });

      if (!lCreated?.stripeSubscriptionId)
      {
        throw new Error('Réponse invalide du serveur (clientSecret manquant).');
      }

      this.ClientSecret.set(lCreated.stripeSubscriptionId);
      this.SessionId.set(lCreated.stripeCustomerId ?? null);

      // - cm - Le montage Stripe Embedded est déclenché par l'effect dans ngOnInit
      // qui réagit au changement de ClientSecret ET à la disponibilité du DOM
      // (viewChild résolu). Plus besoin de setTimeout.

      this.PostHog.Capture(this.BuildTrackingName('playground_stripe_checkout_start', 'tracking'), {
        planKey: pPlanKey,
        billingPeriod: pBillingPeriod
      });
    }
    catch (pError: any)
    {
      const lMessage = pError?.message ?? 'Erreur inconnue';
      this.CheckoutError.set(lMessage);
      this.PostHog.Capture(this.BuildTrackingName('playground_stripe_checkout_error', 'tracking'), {
        planKey: pPlanKey,
        error: lMessage
      });
    }
    finally
    {
      this.LoadingCheckout.set(false);
    }
  }

  /**
   * Libère l'instance Stripe Embedded Checkout courante si elle existe.
   * Indispensable avant un re-mount (changement de plan / re-sélection).
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
   * Initialise et monte le checkout Stripe embedded dans le conteneur DOM passé.
   * @param pClientSecret Le client secret Stripe.
   * @param pContainer L'élément DOM hôte du checkout.
   */
  private async InitEmbeddedCheckout(pClientSecret: string, pContainer: HTMLElement): Promise<void>
  {
    try
    {
      // - cm - Charger Stripe.js si pas déjà chargé (singleton)
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

      this.PostHog.Capture(this.BuildTrackingName('playground_stripe_checkout_mount', 'tracking'), {});
    }
    catch (pError: any)
    {
      this.CheckoutError.set('Erreur lors de l\'affichage du formulaire de paiement');
      console.error('Stripe embedded init error:', pError);
    }
  }

  /**
   * Charge le script Stripe.js. Singleton (la Promise est mise en cache
   * pour éviter les races entre plusieurs appels concurrents).
   */
  private LoadStripeScript(): Promise<void>
  {
    if (this._StripeScriptPromise)
    {
      return this._StripeScriptPromise;
    }

    this._StripeScriptPromise = new Promise((pResolve, pReject) =>
    {
      // Si Stripe.js est déjà chargé (par un autre composant), on résout immédiatement.
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
        // Reset le cache pour permettre un retry après erreur
        this._StripeScriptPromise = null;
        pReject(new Error('Impossible de charger Stripe.js'));
      };
      document.body.appendChild(lScript);
    });

    return this._StripeScriptPromise;
  }

  /**
   * Réinitialise la démo Stripe pour relancer un paiement.
   */
  public ResetDemo(): void
  {
    this.SelectedPlan.set(null);
    this.ClientSecret.set(null);
    this.SessionId.set(null);
    this.CheckoutError.set(null);
    this.PaymentSucceeded.set(false);
    this.PostHog.Capture(this.BuildTrackingName('playground_stripe_reset', 'tracking'), {});
  }

  /**
   * Gère le succès du paiement.
   * @param pEvent Les données de l'événement.
   */
  public OnPaymentSuccess(pEvent: any): void
  {
    this.PaymentSucceeded.set(true);
    this.PostHog.Capture(this.BuildTrackingName('playground_stripe_payment_success', 'tracking'), {
      planKey: this.SelectedPlan()?.key,
      sessionId: this.SessionId()
    });
  }

  /**
   * Gère l'erreur de paiement.
   * @param pError L'erreur survenue.
   */
  public OnPaymentError(pError: any): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_stripe_payment_error', 'tracking'), {
      error: pError?.message
    });
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

  //#endregion
}
