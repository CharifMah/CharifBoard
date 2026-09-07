import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@shared/components/button/button.component';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';
import { CardSkeletonComponent } from '@shared/components/card-skeleton/card-skeleton.component';
import { TransactionsDTO } from '@core/crm/dto/transactions/transactions.dto';
import { ContactsDTO } from '@core/crm/dto/contacts/contacts.dto';
import { PropertiesDTO } from '@core/crm/dto/properties/properties.dto';
import { TransactionsService } from '@core/crm/services/transactions/transactions.service';
import { ContactsService } from '@core/crm/services/contacts/contacts.service';
import { PropertiesService } from '@core/crm/services/properties/properties.service';
import { BaseComponent } from '@base/BaseComponent';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';

import { TranslationService } from '@core/services/i18n/TranslationService';
/**
 * Carte d'indicateur detaillee.
 */
interface KpiCard {
  /** Libelle de l'indicateur. */
  Label: string;
  /** Icone Material Icons. */
  Icon: string;
  /** Valeur formatee. */
  Value: string;
  /** Couleur d'accent semantique. */
  Accent: 'success' | 'info' | 'danger' | 'primary' | 'warning';
  /** Description courte. */
  Hint: string;
  /** Formule de calcul affichee dans l'info-bulle. */
  Formula: string;
}

/**
 * Page Indicateurs du CRM.
 * Affiche des KPI detailles (CA, conversion, moyennes, volumes) derives
 * des affaires, contacts et biens. Page analytique sans service dedie.
 */
@Component({
  selector: 'app-crm-indicateurs',
  standalone: true,
  imports: [DashboardHeaderComponent, ButtonComponent, TooltipComponent, CardSkeletonComponent, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-indicateurs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-indicateurs.component.scss'
})
export class CrmIndicateursComponent extends BaseComponent implements OnInit {
  /** Service des transactions CRM. */
  private readonly _TransactionsService: TransactionsService = inject(TransactionsService);

  /** Service de traduction (lazy-load par page). */
  private readonly _Translation: TranslationService = inject(TranslationService);
  /** Reference de destruction pour takeUntilDestroyed. */
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);
  /** Service des contacts CRM. */
  private readonly _ContactsService: ContactsService = inject(ContactsService);
  /** Service des biens CRM. */
  private readonly _PropertiesService: PropertiesService = inject(PropertiesService);

  /** Transactions chargées. */
  public readonly Affaires = signal<TransactionsDTO[]>([]);

  /** Contacts charges. */
  public readonly Contacts = signal<ContactsDTO[]>([]);

  /** Biens charges. */
  public readonly Properties = signal<PropertiesDTO[]>([]);

  /** Indique le chargement en cours. */
  public readonly Loading = signal(false);

  /** Message d'erreur eventuel. */
  public readonly Error = signal<string | null>(null);

  /** Cartes KPI principales (chiffres cles). */
  public readonly PrimaryKpis = computed<KpiCard[]>(() => {
    const lAffaires = this.Affaires();
    const lContacts = this.Contacts();
    const lProperties = this.Properties();

    const lCaEncaisse = lAffaires.reduce((pSum, pA) => pSum + (pA.honorairesEncaisses ?? 0) + (pA.revenuTotalEncaisse ?? 0), 0);
    const lCaPotentiel = lAffaires
      .filter(pA => pA.etatCommercialId === 2 || pA.etatCommercialId === 3)
      .reduce((pSum, pA) => pSum + (pA.commissionEstimee ?? 0), 0);
    const lBiensDispo = lProperties.filter(pP => pP.statut === 'disponible').length;

    return [
      { Label: this.TranslateKey('crm-indicateurs.primaryKpis.caEncaisse.label'), Icon: 'payments', Value: this.FormatPrice(lCaEncaisse), Accent: 'success', Hint: this.TranslateKey('crm-indicateurs.primaryKpis.caEncaisse.hint'), Formula: this.TranslateKey('crm-indicateurs.primaryKpis.caEncaisse.formula') },
      { Label: this.TranslateKey('crm-indicateurs.primaryKpis.caPotentiel.label'), Icon: 'savings', Value: this.FormatPrice(lCaPotentiel), Accent: 'info', Hint: this.TranslateKey('crm-indicateurs.primaryKpis.caPotentiel.hint'), Formula: this.TranslateKey('crm-indicateurs.primaryKpis.caPotentiel.formula') },
      { Label: this.TranslateKey('crm-indicateurs.primaryKpis.affaires.label'), Icon: 'work', Value: String(lAffaires.length), Accent: 'primary', Hint: this.TranslateKey('crm-indicateurs.primaryKpis.affaires.hint'), Formula: this.TranslateKey('crm-indicateurs.primaryKpis.affaires.formula') },
      { Label: this.TranslateKey('crm-indicateurs.primaryKpis.contacts.label'), Icon: 'contacts', Value: String(lContacts.length), Accent: 'primary', Hint: this.TranslateKey('crm-indicateurs.primaryKpis.contacts.hint'), Formula: this.TranslateKey('crm-indicateurs.primaryKpis.contacts.formula') },
      { Label: this.TranslateKey('crm-indicateurs.primaryKpis.biensDisponibles.label'), Icon: 'home_work', Value: String(lBiensDispo), Accent: 'info', Hint: this.TranslateKey('crm-indicateurs.primaryKpis.biensDisponibles.hint'), Formula: this.TranslateKey('crm-indicateurs.primaryKpis.biensDisponibles.formula') }
    ];
  });

  /** Cartes KPI secondaires (ratios et moyennes). */
  public readonly SecondaryKpis = computed<KpiCard[]>(() => {
    const lAffaires = this.Affaires();
    const lProperties = this.Properties();
    const lContacts = this.Contacts();

    const lGagnees = lAffaires.filter(pA => pA.etatCommercialId === 1).length;
    const lPerdues = lAffaires.filter(pA => pA.etatCommercialId === 4).length;
    const lTotalCloturees = lGagnees + lPerdues;
    const lTauxConversion = lTotalCloturees > 0 ? Math.round((lGagnees / lTotalCloturees) * 100) : 0;

    const lCommissionMoyenne = lAffaires.length > 0
      ? lAffaires.reduce((pSum, pA) => pSum + (pA.commissionEstimee ?? 0), 0) / lAffaires.length
      : 0;

    const lPrixMoyen = lProperties.length > 0
      ? lProperties.reduce((pSum, pP) => pSum + (pP.prixAffiche ?? 0), 0) / lProperties.length
      : 0;

    const lContactsParAffaire = lAffaires.length > 0
      ? (lContacts.length / lAffaires.length).toFixed(1)
      : '0';

    return [
      { Label: this.TranslateKey('crm-indicateurs.secondaryKpis.tauxConversion.label'), Icon: 'trending_up', Value: `${lTauxConversion} %`, Accent: lTauxConversion >= 50 ? 'success' : 'warning', Hint: this.TranslateKey('crm-indicateurs.secondaryKpis.tauxConversion.hint'), Formula: this.TranslateKey('crm-indicateurs.secondaryKpis.tauxConversion.formula') },
      { Label: this.TranslateKey('crm-indicateurs.secondaryKpis.commissionMoyenne.label'), Icon: 'request_quote', Value: this.FormatPrice(lCommissionMoyenne), Accent: 'info', Hint: this.TranslateKey('crm-indicateurs.secondaryKpis.commissionMoyenne.hint'), Formula: this.TranslateKey('crm-indicateurs.secondaryKpis.commissionMoyenne.formula') },
      { Label: this.TranslateKey('crm-indicateurs.secondaryKpis.prixMoyenBien.label'), Icon: 'real_estate_agent', Value: this.FormatPrice(lPrixMoyen), Accent: 'primary', Hint: this.TranslateKey('crm-indicateurs.secondaryKpis.prixMoyenBien.hint'), Formula: this.TranslateKey('crm-indicateurs.secondaryKpis.prixMoyenBien.formula') },
      { Label: this.TranslateKey('crm-indicateurs.secondaryKpis.contactsParAffaire.label'), Icon: 'group', Value: lContactsParAffaire, Accent: 'primary', Hint: this.TranslateKey('crm-indicateurs.secondaryKpis.contactsParAffaire.hint'), Formula: this.TranslateKey('crm-indicateurs.secondaryKpis.contactsParAffaire.formula') }
    ];
  });

  // #region Lifecycle eslint-disable-next-line @typescript-eslint/naming-convention
  public ngOnInit(): void {
    void this.LoadData();
    void this.Translate.loadPageTranslations('crm.indicateurs');

    // [cm] Re-fetch OBLIGATOIRE au changement de langue : sans cette subscription, [cm] les libellés restent figés sur la langue initiale apres switch FR->EN (le pipe [cm] `| tkey` retourne la cle brute car le sous-registre de la nouvelle langue [cm] n'est jamais charge tant qu'on reste sur la page).
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang) => {
        void this.Translate.loadPageTranslations('crm.indicateurs', pLang);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Charge les donnees des indicateurs (affaires, contacts, biens).
   */
  public async LoadData(): Promise<void> {
    this.Loading.set(true);
    this.Error.set(null);
    try {
      const [lAffaires, lContacts, lProperties] = await Promise.all([
        this._TransactionsService.getAll({ page: 1, pageSize: 100 }),
        this._ContactsService.getAll({ page: 1, pageSize: 100 }),
        this._PropertiesService.getAll({ page: 1, pageSize: 100 })
      ]);
      this.Affaires.set(lAffaires ?? []);
      this.Contacts.set(lContacts ?? []);
      this.Properties.set(lProperties ?? []);
    } catch (pErr) {
      this.Error.set(this.TranslateKey('crm-indicateurs.errors.load'));
      console.error(pErr);
    } finally {
      this.Loading.set(false);
    }
  }

  //#region i18n
  /** Helper local : lit une cle i18n via le service de traduction. */
  private TranslateKey(pKey: string, pParams?: Record<string, unknown>): string {
    this.Translate.InstantTick();
    return this.Translate.translate(pKey, pParams);
  }
  //#endregion

  /**
   * Recharge les indicateurs (tracking PostHog).
   */
  public OnRefresh(): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_indicateurs_refresh', 'tracking'));
    void this.LoadData();
  }

  /**
   * Tracking PostHog au clic sur une carte KPI.
   * @param pLabel Le libelle de la carte cliquee.
   */
  public OnKpiClick(pLabel: string): void {
    this.PostHog.Capture(this.BuildTrackingName(`crm_indicateurs_card_${pLabel}`, 'tracking'));
  }
  //#endregion
}