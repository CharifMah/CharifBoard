import { Component, ChangeDetectionStrategy, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { BaseComponent } from '@core/base/BaseComponent';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SeoService } from '@core/services/seo/seo.service';
import { TranslationService } from '@core/services/i18n/TranslationService';
import { StripeService } from '@core/services/Stripe/StripeService';
import { OpportunitiesService } from '@core/sellmatchdb/services/opportunities/opportunities.service';
import { OpportunitiesDTO } from '@core/sellmatchdb/dto';

/**
 * Statut de paiement détecté sur la page de retour Stripe.
 */
type EPaymentStatus = 'loading' | 'success' | 'failure' | 'pending' | 'unknown';

/**
 * Page de confirmation de paiement Stripe.
 * - Lit `?session_id=` et `?opportunity=` (cas ÉcoMandat où l'opp est créée
 *   après paiement) ou `?plan=` (cas abonnement).
 * - Vérifie le statut de la session Stripe.
 * - Pour un ÉcoMandat réussi : crée l'opportunité en BDD avec
 *   isPrio=true, paymentid=<sessionId>.
 * - Pour un abonnement réussi : affiche un récap de l'abonnement.
 */
@Component({
  selector: 'app-payment-confirmation-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './payment-confirmation-page.component.html',
  styleUrl: './payment-confirmation-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentConfirmationPageComponent extends BaseComponent implements OnInit
{
  //#region Attributes

  private readonly _Route = inject(ActivatedRoute);
  private readonly _Router = inject(Router);
  private readonly _Stripe = inject(StripeService);
  private readonly _Opportunities = inject(OpportunitiesService);
  private readonly _Seo = inject(SeoService);
  private readonly _Translation = inject(TranslationService);
  private readonly _DestroyRef = inject(DestroyRef);

  //#endregion

  //#region State

  /** Statut détecté. */
  public readonly Status = signal<EPaymentStatus>('loading');

  /** Message lisible à afficher. */
  public readonly Message = signal<string>('Vérification de votre paiement…');

  /** ID de session Stripe. */
  public readonly SessionId = signal<string | null>(null);

  /** Plan souscrit (clé : 'pro', 'crm', 'premium', 'ecomandat'). */
  public readonly PlanKey = signal<string | null>(null);

  /** ID de l'opportunité nouvellement créée (cas ÉcoMandat). */
  public readonly CreatedOpportunityId = signal<number | null>(null);

  /** Indique si on est en train de créer l'opportunité. */
  public readonly IsCreatingOpportunity = signal(false);

  /** Indique si on doit afficher le bouton retour à /pricing. */
  public readonly ShowRetryCta = signal(false);

  //#endregion

  //#region Lifecycle

  public async ngOnInit(): Promise<void>
  {
    this._Seo.SetPageMeta({
      Title: 'Confirmation de paiement | SellMatch',
      Description: 'Confirmation de votre paiement Stripe sur SellMatch.',
      CanonicalUrl: this._Seo.BuildUrl('/paiement/confirmation'),
    });

    // - cm - Lazy-load i18n 'paymentConfirmation' (pattern home).
    void this.Translate.loadPageTranslations('paymentConfirmation');
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang) => void this.Translate.loadPageTranslations('paymentConfirmation', pLang));

    this._Route.queryParams.subscribe(async (pParams) =>
    {
      this.Status.set('loading');
      this.Message.set('Vérification de votre paiement…');

      const lSessionId = pParams['session_id'] as string | undefined;
      const lPlanKey = (pParams['plan'] as string | undefined) ?? null;
      const lOpportunityJson = pParams['opportunity'] as string | undefined;

      this.SessionId.set(lSessionId ?? null);
      this.PlanKey.set(lPlanKey);

      if (!lSessionId)
      {
        this.Status.set('failure');
        this.Message.set('Aucune information de session de paiement détectée.');
        this.ShowRetryCta.set(true);
        return;
      }

      try
      {
        const lVerification = await this._Stripe.verifyPaymentSession(lSessionId);
        const lStripeStatus: string = lVerification?.status ?? 'unknown';

        if (lStripeStatus === 'paid')
        {
          this.Status.set('success');

          if (lPlanKey === 'ecomandat')
          {
            // - cm - ÉcoMandat : créer l'opportunité maintenant.
            if (lOpportunityJson)
            {
              await this.CreateOpportunityFromQuery(lOpportunityJson, lSessionId);
            }
            else
            {
              this.Message.set('Votre ÉcoMandat a été souscrit avec succès.');
            }
          }
          else
          {
            // - cm - Abonnement : simple récap.
            this.Message.set(`Votre abonnement a été souscrit avec succès.`);
          }

          this.PostHog.Capture(this.BuildTrackingName('payment_confirm_success', 'tracking'), {
            planKey: lPlanKey,
            sessionId: lSessionId,
          });
        }
        else if (lStripeStatus === 'pending')
        {
          this.Status.set('pending');
          this.Message.set('Votre paiement est en cours de traitement. Veuillez patienter.');
        }
        else if (lStripeStatus === 'unpaid')
        {
          this.Status.set('failure');
          this.Message.set('Le paiement n\'a pas été effectué ou a été refusé.');
          this.ShowRetryCta.set(true);
        }
        else
        {
          this.Status.set('unknown');
          this.Message.set('Statut de paiement inconnu. Veuillez contacter le support si le problème persiste.');
          this.ShowRetryCta.set(true);
        }
      }
      catch (pError: any)
      {
        console.error('Erreur lors de la vérification de la session:', pError);
        this.Status.set('unknown');
        this.Message.set('Une erreur est survenue lors de la vérification de votre paiement.');
        this.ShowRetryCta.set(true);
        this.PostHog.Capture(this.BuildTrackingName('payment_confirm_error', 'tracking'), { error: pError?.message });
      }
    });
  }

  //#endregion

  //#region Methods

  /**
   * Crée l'opportunité (dossier) après confirmation du paiement ÉcoMandat.
   * @param pOpportunityJson JSON URL-encodé de l'opportunité (transmis par le parent).
   * @param pSessionId ID de session Stripe (utilisé comme paymentid).
   */
  private async CreateOpportunityFromQuery(pOpportunityJson: string, pSessionId: string): Promise<void>
  {
    this.IsCreatingOpportunity.set(true);
    this.Message.set('Création de votre dossier ÉcoMandat…');

    try
    {
      const lOpportunity: OpportunitiesDTO = JSON.parse(decodeURIComponent(pOpportunityJson));
      lOpportunity.userId = this.UsersService.currentUser?.id ?? lOpportunity.userId;
      lOpportunity.createdAt = new Date().toISOString();
      lOpportunity.updatedAt = new Date().toISOString();
      lOpportunity.isPrio = true;
      lOpportunity.paymentid = pSessionId;

      const lCreated = await this._Opportunities.create(lOpportunity);
      this.CreatedOpportunityId.set(lCreated?.id ?? null);
      this.Message.set('Votre ÉcoMandat a été activé. Votre dossier est boosté.');

      this.PostHog.Capture(this.BuildTrackingName('ecomandat_opportunity_created', 'tracking'), {
        opportunityId: this.CreatedOpportunityId(),
        sessionId: pSessionId,
      });
    }
    catch (pError: any)
    {
      console.error('Erreur création opportunité ÉcoMandat:', pError);
      this.Message.set('Paiement réussi, mais la création du dossier a échoué. Contactez le support.');
      this.PostHog.Capture(this.BuildTrackingName('ecomandat_opportunity_error', 'tracking'), { error: pError?.message });
    }
    finally
    {
      this.IsCreatingOpportunity.set(false);
    }
  }

  /**
   * Redirige vers le dashboard vendeur.
   */
  public GoToDashboard(): void
  {
    void this._Router.navigate(['/dashboard-vendeur']);
  }

  /**
   * Redirige vers la page de tarification.
   */
  public GoToPricing(): void
  {
    void this._Router.navigate(['/pricing']);
  }

  /**
   * Redirige vers la page de gestion d'abonnement.
   */
  public GoToSubscription(): void
  {
    void this._Router.navigate(['/mon-abonnement']);
  }

  //#endregion
}
