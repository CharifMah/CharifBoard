import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { BaseComponent } from '@core/base/BaseComponent';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SeoService } from '@core/services/seo/seo.service';
import { TranslationService } from '@core/services/i18n/TranslationService';
import { UserSubscriptionsService } from '@core/sellmatchdb/services/user-subscriptions/user-subscriptions.service';
import { SubscriptionPlansService } from '@core/sellmatchdb/services/subscription-plans/subscription-plans.service';
import { OpportunitiesService } from '@core/sellmatchdb/services/opportunities/opportunities.service';
import { UserSubscriptionsDTO, OpportunitiesDTO, SubscriptionPlansDTO } from '@core/sellmatchdb/dto';

/**
 * Page de gestion d'abonnement SellMatch : permet à l'utilisateur connecté
 * de visualiser son abonnement courant, son historique de paiements, ses
 * dossiers boostés via ÉcoMandat, et d'annuler un abonnement.
 */
@Component({
  selector: 'app-subscription-management-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './subscription-management-page.component.html',
  styleUrl: './subscription-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionManagementPageComponent extends BaseComponent implements OnInit
{
  //#region Attributes

  private readonly _Subscriptions = inject(UserSubscriptionsService);
  private readonly _SubscriptionPlans = inject(SubscriptionPlansService);
  private readonly _Opportunities = inject(OpportunitiesService);
  private readonly _Seo = inject(SeoService);
  private readonly _Router = inject(Router);
  private readonly _Translation = inject(TranslationService);
  private readonly _DestroyRef = inject(DestroyRef);

  //#endregion

  //#region State

  /** Toutes les souscriptions de l'utilisateur (historique). */
  public readonly Subscriptions = signal<UserSubscriptionsDTO[]>([]);

  /** Dossiers boostés (isPrio=true) de l'utilisateur. */
  public readonly EcoMandatOpportunities = signal<OpportunitiesDTO[]>([]);

  /** Indique un chargement en cours. */
  public readonly Loading = signal(false);

  /** Indique qu'une annulation est en cours. */
  public readonly Cancelling = signal(false);

  /** Message d'erreur global. */
  public readonly ErrorMessage = signal<string | null>(null);

  /** Souscription courante (active la plus récente). */
  public readonly CurrentSubscription = computed<UserSubscriptionsDTO | null>(() =>
  {
    const lActive = this.Subscriptions().find((p: any) =>
      ['active', 'trialing', 'past_due'].includes((p.status ?? '').toLowerCase())
    );
    return lActive ?? null;
  });

  //#endregion

  //#region Lifecycle

  public async ngOnInit(): Promise<void>
  {
    this._Seo.SetPageMeta({
      Title: 'Mon abonnement | SellMatch',
      Description: 'Gérez votre abonnement SellMatch, vos paiements et vos dossiers ÉcoMandat.',
      CanonicalUrl: this._Seo.BuildUrl('/mon-abonnement'),
    });

    // - cm - Lazy-load i18n 'subscriptionManagement' (pattern home).
    void this.Translate.loadPageTranslations('subscriptionManagement');
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang) => void this.Translate.loadPageTranslations('subscriptionManagement', pLang));

    await this.LoadData();
  }

  //#endregion

  //#region Methods

  /**
   * Charge les souscriptions et les dossiers ÉcoMandat de l'utilisateur.
   */
  private async LoadData(): Promise<void>
  {
    this.Loading.set(true);
    this.ErrorMessage.set(null);

    const lUserId = parseInt(this.CurrentUserId ?? '0', 10);
    if (!lUserId)
    {
      this.ErrorMessage.set('Vous devez être connecté pour accéder à cette page.');
      this.Loading.set(false);
      return;
    }

    try
    {
      // - cm - Souscriptions et plans chargés en parallèle (jointure côté front, le critere
      // - cm - n'inclut pas la navigation Plan par défaut, ce qui rendait plan/prix vides à l'affichage).
      const [lSubs, lPlans] = await Promise.all([
        this._Subscriptions.getAll({ userId: lUserId } as any),
        this._SubscriptionPlans.getAll({ isActive: true }),
      ]);

      // - cm - Map<planId, plan> pour hydratation O(1).
      const lPlanById = new Map<number, SubscriptionPlansDTO>();
      for (const lPlan of lPlans)
      {
        if (lPlan.id != null)
        {
          lPlanById.set(lPlan.id, lPlan);
        }
      }

      // - cm - Hydrate lSub.plan depuis la map. Copie légère des objets pour ne pas muter
      // - cm - les références retournées par l'API (et préserver l'immutabilité côté Signal).
      const lHydrated = lSubs.map((pSub: any) => ({
        ...pSub,
        plan: pSub.planId != null ? lPlanById.get(pSub.planId) ?? null : null,
      }));

      // - cm - Tri par date de création desc.
      lHydrated.sort((a: any, b: any) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
      this.Subscriptions.set(lHydrated);

      // - cm - Dossiers boostés via ÉcoMandat.
      const lOpps = await this._Opportunities.getAll({ userId: lUserId, isPrio: true } as any);
      this.EcoMandatOpportunities.set(lOpps);

      this.PostHog.Capture(this.BuildTrackingName('subscription_management_loaded', 'tracking'), {
        subsCount: lHydrated.length,
        ecoMandatCount: lOpps.length,
      });
    }
    catch (pError: any)
    {
      console.error('Erreur chargement données abonnement:', pError);
      this.ErrorMessage.set('Impossible de charger vos données. Veuillez réessayer.');
    }
    finally
    {
      this.Loading.set(false);
    }
  }

  /**
   * Annule l'abonnement courant. Pour ÉcoMandat (one-shot), l'annulation
   * n'a pas de sens (paiement unique déjà effectué).
   */
  public async CancelSubscription(): Promise<void>
  {
    const lCurrent = this.CurrentSubscription();
    if (!lCurrent)
    {
      return;
    }

    if (lCurrent.billingPeriod === 'one_shot')
    {
      // - cm - Pas d'annulation pour les paiements uniques.
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Vous conserverez l\'accès jusqu\'à la fin de la période en cours.'))
    {
      return;
    }

    this.Cancelling.set(true);
    try
    {
      // - cm - Update via ServiceBase : passe le DTO avec status='canceled' + canceledAt.
      (lCurrent as any).status = 'canceled';
      (lCurrent as any).canceledAt = new Date().toISOString();
      await this._Subscriptions.update(lCurrent, { id: lCurrent.id } as any);
      await this.LoadData();
      this.PostHog.Capture(this.BuildTrackingName('subscription_cancelled', 'tracking'), {
        subscriptionId: lCurrent.id,
        planKey: (lCurrent as any).plan?.key,
      });
    }
    catch (pError: any)
    {
      console.error('Erreur annulation:', pError);
      this.ErrorMessage.set('Impossible d\'annuler l\'abonnement. Réessayez ou contactez le support.');
    }
    finally
    {
      this.Cancelling.set(false);
    }
  }

  /**
   * Indique si une souscription est annulable (abonnement récurrent actif).
   * @param pSub La souscription à tester.
   * @returns true si annulable.
   */
  public IsCancellable(pSub: UserSubscriptionsDTO): boolean
  {
    const lStatus = ((pSub as any).status ?? '').toLowerCase();
    return pSub.billingPeriod !== 'one_shot' && ['active', 'trialing', 'past_due'].includes(lStatus);
  }

  /**
   * Formate une date en string lisible.
   * @param pDate La date à formater.
   * @returns La date formatée ou '-'.
   */
  public FormatDateValue(pDate: any): string
  {
    if (!pDate) return '-';
    const lDate = new Date(pDate);
    if (isNaN(lDate.getTime())) return '-';
    return lDate.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /**
   * Formate un prix.
   * @param pPrice Le prix.
   * @returns Le prix formaté.
   */
  public FormatPriceValue(pPrice: any): string
  {
    if (pPrice == null) return '-';
    return `${pPrice} €`;
  }

  /**
   * Indique le libellé de la période.
   * @param pPeriod La période (monthly, yearly, one_shot).
   * @returns Le libellé lisible.
   */
  public PeriodLabel(pPeriod: string | undefined): string
  {
    switch (pPeriod)
    {
      case 'monthly': return '/mois';
      case 'yearly': return '/an';
      case 'one_shot': return 'Paiement unique';
      default: return '';
    }
  }

  /**
   * Indique le libellé du statut.
   * @param pStatus Le statut (active, canceled, etc.).
   * @returns Le libellé lisible.
   */
  public StatusLabel(pStatus: string | undefined): string
  {
    const lMap: Record<string, string> = {
      active: 'Actif',
      trialing: 'Essai',
      past_due: 'Paiement en retard',
      canceled: 'Annulé',
      unpaid: 'Impayé',
      incomplete: 'Incomplet',
      expired: 'Expiré',
    };
    return lMap[(pStatus ?? '').toLowerCase()] ?? pStatus ?? '-';
  }

  /**
   * Renvoie à la page de tarification.
   */
  public GoToPricing(): void
  {
    void this._Router.navigate(['/pricing']);
  }

  /**
   * Renvoie au dashboard.
   */
  public GoToDashboard(): void
  {
    void this._Router.navigate(['/dashboard-vendeur']);
  }

  /**
   * Helper template : récupère un champ any sur un UserSubscriptionsDTO.
   * @param pSub La souscription.
   * @param pKey La clé du champ.
   * @returns La valeur ou undefined.
   */
  public GetSubField(pSub: UserSubscriptionsDTO, pKey: string): any
  {
    return (pSub as any)?.[pKey];
  }

  //#endregion
}
