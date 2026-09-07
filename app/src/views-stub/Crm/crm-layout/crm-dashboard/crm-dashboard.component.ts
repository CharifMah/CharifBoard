import { Component, inject, signal, computed, OnInit, ViewChild, WritableSignal, Signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslationService } from '@core/services/i18n/TranslationService';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';
import { MapCardComponent } from '@shared/components/map-card/map-card.component';
import { IMapMarker } from '@shared/components/map-card/IMapMarker';
import { EMarkerType } from '@shared/components/map-card/EMarkerType';
import { GetMarkerStyle } from '@shared/components/map-card/map-marker-style';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ChartComponent } from '@shared/components/chart/chart.component';
import { CardSkeletonComponent } from '@shared/components/card-skeleton/card-skeleton.component';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { TransactionsDTO } from '@core/crm/dto/transactions/transactions.dto';
import { LocationsDTO } from '@core/crm/dto/locations/locations.dto';
import { ContactsDTO } from '@core/crm/dto/contacts/contacts.dto';
import { PropertiesDTO } from '@core/crm/dto/properties/properties.dto';
import { TachesDTO } from '@core/crm/dto/taches/taches.dto';
import { ObjectifAnnuelDashboardDTO } from '@core/crm/dto/dashboard/objectif-annuel.dashboard.dto';
import { ECADashboardPeriode } from '@core/crm/dto/dashboard/ecadashboard-periode';
import { TransactionsService } from '@core/crm/services/transactions/transactions.service';
import { LocationsService } from '@core/crm/services/locations/locations.service';
import { PropertiesService } from '@core/crm/services/properties/properties.service';
import { DashboardService } from '@core/crm/services/dashboard/dashboard.service';
import { RefNatureAffaireService } from '@core/crm/services/ref-nature-affaire/ref-nature-affaire.service';
import { RefTypeBienService } from '@core/crm/services/ref-type-bien/ref-type-bien.service';
import { RefStatutAffaireService } from '@core/crm/services/ref-statut-affaire/ref-statut-affaire.service';
import { RefEtatCommercialService } from '@core/crm/services/ref-etat-commercial/ref-etat-commercial.service';
import { RefMotifBlocageService } from '@core/crm/services/ref-motif-blocage/ref-motif-blocage.service';
import { ContactsService } from '@core/crm/services/contacts/contacts.service';
import { IInputOption } from '@shared/components/input/input.types';
import { GridActionEvent } from '@shared/components/grid/grid.component';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { TransactionGridComponent } from '@views/Crm/crm-layout/crm-biens/grids/transaction-grid.component';
import { LocationGridComponent } from '@views/Crm/crm-layout/crm-biens/grids/location-grid.component';
import { PropertyGridComponent } from '@views/Crm/crm-layout/crm-biens/grids/property-grid.component';
import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import { BaseComponent } from '@base/BaseComponent';

/**
 * Carte de statistique du dashboard CRM.
 * - cm - Les libellés i18n sont résolus via le pipe `tkey` dans le HTML
 * - cm - (namespace poussé par `appTranslate [ns]="'crm-dashboard'"` sur le parent).
 * - cm - Le `Label` brut est conservé pour le tracking PostHog (identifiant technique).
 */
interface StatCard {
  /** Libellé brut (pour tracking PostHog). */
  Label: string;
  /** Clé i18n (sous `statCards.`) pour résoudre label/hint/formula via le pipe `tkey`. */
  LabelKey: string;
  /** Vue CRM cible au clic (null si pas de navigation). */
  View: string | null;
  /** Icône Material Icons. */
  Icon: string;
  /** Valeur formatée (montant ou compteur). */
  Value: string;
  /** Accent sémantique (success | info | danger | warning | primary | neutral). */
  Accent: 'success' | 'info' | 'danger' | 'primary';
}

/** Mode de filtre pour le CA encaissé. */
type CaFilterMode = 'annee' | 'mois' | 'periode';

/**
 * Page d'accueil du CRM immobilier.
 * Affiche les cartes de synthèse (CA encaissé, potentiel, perdu, mandats, contacts),
 * une carte géographique des biens, les anniversaires du jour, l'objectif annuel,
 * le CA encaissé filtrable, les tâches à effectuer et les contacts à relancer.
 * Utilise uniquement les composants génériques (section-card, map-card, button, input, badge).
 */
@Component({
  selector: 'app-crm-dashboard',
  imports: [SectionCardComponent, MapCardComponent, ButtonComponent, InputComponent, BadgeComponent, ChartComponent, CardSkeletonComponent, DashboardHeaderComponent, StatCardComponent, PopupComponent, TransactionGridComponent, LocationGridComponent, PropertyGridComponent, DecimalPipe, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-dashboard.component.html',
  styleUrl: './crm-dashboard.component.scss'
})
export class CrmDashboardComponent extends BaseComponent implements OnInit {
  /** Service des transactions CRM. */
  private readonly _TransactionsService: TransactionsService = inject(TransactionsService);
  /** Service des locations CRM (CA encaissé sur les bails). */
  private readonly _LocationsService: LocationsService = inject(LocationsService);
  /** Service des biens CRM. */
  private readonly _PropertiesService: PropertiesService = inject(PropertiesService);
  /** Service du dashboard CRM (objectif, CA, anniversaires, tâches, relances). */
  private readonly _DashboardService: DashboardService = inject(DashboardService);
  /** Service du référentiel nature de l'affaire. */
  private readonly _NatureAffaireService: RefNatureAffaireService = inject(RefNatureAffaireService);
  /** Service du référentiel type de bien. */
  private readonly _TypeBienService: RefTypeBienService = inject(RefTypeBienService);
  /** Service du référentiel statut de l'affaire. */
  private readonly _StatutAffaireService: RefStatutAffaireService = inject(RefStatutAffaireService);
  /** Service du référentiel état commercial. */
  private readonly _EtatCommercialService: RefEtatCommercialService = inject(RefEtatCommercialService);
  /** Service du référentiel motif de blocage. */
  private readonly _MotifBlocageService: RefMotifBlocageService = inject(RefMotifBlocageService);
  /** Service des contacts CRM (clients finaux liés aux transactions/locations/properties). */
  private readonly _ContactsService: ContactsService = inject(ContactsService);

  /** Service de traduction (libellés dans les options ECharts). */
  private readonly _Translation: TranslationService = inject(TranslationService);

  /** Référence vers la grille des transactions (pour SetRowSaving/ClearRowSaving). */
  @ViewChild(TransactionGridComponent) private readonly _TransactionGrid!: TransactionGridComponent;
  /** Référence vers la grille des locations (pour SetRowSaving/ClearRowSaving). */
  @ViewChild(LocationGridComponent) private readonly _LocationGrid!: LocationGridComponent;
  /** Référence vers la grille des biens (properties) pour SetRowSaving/ClearRowSaving. */
  @ViewChild(PropertyGridComponent) private readonly _PropertyGrid!: PropertyGridComponent;

  /** Transactions chargées (pour calculs CA). */
  public readonly Transactions: WritableSignal<TransactionsDTO[]> = signal<TransactionsDTO[]>([]);

  /** Locations chargées (pour calculs CA encaissé sur les bails). */
  public readonly Locations: WritableSignal<LocationsDTO[]> = signal<LocationsDTO[]>([]);

  /** Biens chargés (marqueurs carte). */
  public readonly Properties: WritableSignal<PropertiesDTO[]> = signal<PropertiesDTO[]>([]);

  /** Tâches à suivre chargées depuis le dashboard (retard, aujourd'hui, demain). */
  public readonly Taches: WritableSignal<TachesDTO[]> = signal<TachesDTO[]>([]);

  /** Contacts dont l'anniversaire tombe aujourd'hui (chargés depuis le dashboard). */
  public readonly AnniversairesDuJour: WritableSignal<ContactsDTO[]> = signal<ContactsDTO[]>([]);

  /** Objectif annuel et progression (chargé depuis le dashboard). */
  public readonly ObjectifAnnuel: WritableSignal<ObjectifAnnuelDashboardDTO> = signal<ObjectifAnnuelDashboardDTO>({ objectif: 0, atteint: 0, restant: 0, pct: 0, venduSansDate: 0, loueSansDate: 0 });

  /** Contacts à relancer (chargés depuis le dashboard). */
  public readonly ContactsARelancerData: WritableSignal<ContactsDTO[]> = signal<ContactsDTO[]>([]);

  /** Indique le chargement initial global (true tant qu'au moins une section n'a pas fini). */
  public readonly Loading: WritableSignal<boolean> = signal(false);

  /** Indique le chargement des stat cards (transactions + locations + contacts). */
  public readonly StatCardsLoading: WritableSignal<boolean> = signal(false);

  /** Indique le chargement de la carte des biens + anniversaires du jour. */
  public readonly MapAnnivLoading: WritableSignal<boolean> = signal(false);

  /** Indique le chargement de l'objectif annuel + CA encaissé filtré. */
  public readonly ObjectifCaLoading: WritableSignal<boolean> = signal(false);

  /** Indique le chargement des tâches à effectuer + contacts à relancer. */
  public readonly TachesRelancesLoading: WritableSignal<boolean> = signal(false);

  /** Valeur courante du CA encaissé filtré (calculée côté backend selon le mode actif). */
  public readonly CaEncaisseFilteredValue: WritableSignal<number> = signal<number>(0);

  /** Mode de filtre actif pour le CA encaissé. */
  public readonly CaFilterMode: WritableSignal<CaFilterMode> = signal<CaFilterMode>('annee');

  /** Date de début pour le filtre période personnalisée (ISO yyyy-mm-dd). */
  public readonly CaPeriodeDebut: WritableSignal<string> = signal<string>('');

  /** Date de fin pour le filtre période personnalisée (ISO yyyy-mm-dd). */
  public readonly CaPeriodeFin: WritableSignal<string> = signal<string>('');

  /** IDs de contacts masqués de la carte de relance (ne supprime pas le contact). */
  public readonly HiddenRelanceIds: WritableSignal<Set<number>> = signal<Set<number>>(new Set<number>());

  /**
   * Recharge la liste des contacts à relancer après une action enregistrée dans le drawer.
   * - cm - La règle des 7 jours (DashboardService.GetContactsARelancerAsync) recalcule la liste
   * - cm - côté backend : un contact qui vient d'être marqué comme relancé (échange daté du jour)
   * - cm - ne devrait plus apparaître tant qu'on n'est pas > 7 jours après le dernier échange.
   */
  public OnRelanceActionSaved(pEvent: { ContactId: number; Type: 'relance' | 'nouvelle' }): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_dashboard_relance_action_saved', 'tracking'),
      { type: pEvent.Type, contact_id: pEvent.ContactId });
    // [cm] Masquer immédiatement le contact côté front (UX : le contact disparaît de la liste [cm] sans attendre le round-trip API). Le backend retournera la liste à jour au prochain load.
    if (pEvent.Type === 'relance') {
      const lSet: Set<number> = new Set(this.HiddenRelanceIds());
      lSet.add(pEvent.ContactId);
      this.HiddenRelanceIds.set(lSet);
    }
  }

  /** Marqueurs de la carte (biens, transactions et locations géolocalisés). */
  public readonly MapMarkers: Signal<IMapMarker[]> = computed<IMapMarker[]>(() => {
    // - cm - Marqueurs des biens (properties)
    const lPropertyMarkers: IMapMarker[] = this.Properties()
      .filter((pP: PropertiesDTO): boolean => {
        const lLat: number = Number(pP.adresse?.latitude ?? 0);
        const lLng: number = Number(pP.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pP: PropertiesDTO): IMapMarker => {
        const lStyle = GetMarkerStyle(EMarkerType.Property);
        return {
          Lat: Number(pP.adresse?.latitude ?? 0),
          Lng: Number(pP.adresse?.longitude ?? 0),
          Title: pP.reference ?? 'Bien',
          Popup: `${pP.reference ?? ''} — ${pP.adresse?.city ?? ''}`,
          Icon: lStyle.Icon,
          Color: lStyle.Color,
          Type: EMarkerType.Property,
          Data: pP,
          DataId: pP.id
        };
      });

    // - cm - Marqueurs des transactions (affaires de vente)
    const lTransactionMarkers: IMapMarker[] = this.Transactions()
      .filter((pT: TransactionsDTO): boolean => {
        const lLat: number = Number(pT.adresse?.latitude ?? 0);
        const lLng: number = Number(pT.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pT: TransactionsDTO): IMapMarker => {
        const lStyle = GetMarkerStyle(EMarkerType.Transaction);
        return {
          Lat: Number(pT.adresse?.latitude ?? 0),
          Lng: Number(pT.adresse?.longitude ?? 0),
          Title: pT.reference ?? 'Transaction',
          Popup: `${pT.reference ?? ''} — ${pT.adresse?.city ?? ''}`,
          Icon: lStyle.Icon,
          Color: lStyle.Color,
          Type: EMarkerType.Transaction,
          Data: pT,
          DataId: pT.id
        };
      });

    // - cm - Marqueurs des locations (affaires de location)
    const lLocationMarkers: IMapMarker[] = this.Locations()
      .filter((pL: LocationsDTO): boolean => {
        const lLat: number = Number(pL.adresse?.latitude ?? 0);
        const lLng: number = Number(pL.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pL: LocationsDTO): IMapMarker => {
        const lStyle = GetMarkerStyle(EMarkerType.Location);
        return {
          Lat: Number(pL.adresse?.latitude ?? 0),
          Lng: Number(pL.adresse?.longitude ?? 0),
          Title: pL.reference ?? 'Location',
          Popup: `${pL.reference ?? ''} — ${pL.adresse?.city ?? ''}`,
          Icon: lStyle.Icon,
          Color: lStyle.Color,
          Type: EMarkerType.Location,
          Data: pL,
          DataId: pL.id
        };
      });

    return [...lPropertyMarkers, ...lTransactionMarkers, ...lLocationMarkers];
  });

  /** Options du référentiel nature de l'affaire (select). */
  public readonly NatureAffaireOptions = signal<IInputOption[]>([]);

  /** Options du référentiel type de bien (select). */
  public readonly TypeBienOptions = signal<IInputOption[]>([]);

  /** Options du référentiel statut de l'affaire (select). */
  public readonly StatutOptions = signal<IInputOption[]>([]);

  /** Options du référentiel état commercial (select). */
  public readonly EtatCommercialOptions = signal<IInputOption[]>([]);

  /** Options du référentiel motif de blocage (select). */
  public readonly MotifBlocageOptions = signal<IInputOption[]>([]);

  /** Options du référentiel contacts (select FK clientId dans les grilles). */
  public readonly ContactOptions = signal<IInputOption[]>([]);

  /** Options consolidées injectées dans les grilles extraites (transactions + locations + properties). */
  public readonly RefOptions = computed(() => ({
    NatureAffaire: this.NatureAffaireOptions(),
    TypeBien: this.TypeBienOptions(),
    Statut: this.StatutOptions(),
    EtatCommercial: this.EtatCommercialOptions(),
    MotifBlocage: this.MotifBlocageOptions(),
    Contact: this.ContactOptions(),
    Property: [] as IInputOption[]
  }));

  /**
   * Marker actuellement sélectionné sur la carte du dashboard.
   * Stocké en signal pour piloter l'ouverture du popup grille custom.
   * - cm - Le DTO source est accessible via `SelectedMarker().Data` (cast selon `SelectedMarker().Type`).
   */
  public readonly SelectedMarker = signal<IMapMarker | null>(null);

  /**
   * Indique si le popup grille (post-clic marker) est ouvert.
   * Synchronisé avec `SelectedMarker()`.
   */
  public readonly ShowMarkerPopup = computed(() => this.SelectedMarker() !== null);

  /** Type du marker sélectionné (pour aiguiller vers la bonne grille dans le popup). */
  public readonly SelectedMarkerType = computed<EMarkerType | null>(() => this.SelectedMarker()?.Type ?? null);

  /** DTO transaction du marker sélectionné (cast pour injection dans app-transaction-grid). */
  public readonly SelectedTransaction = computed<TransactionsDTO | null>(() => {
    const lMarker: IMapMarker | null = this.SelectedMarker();
    return lMarker?.Type === EMarkerType.Transaction ? (lMarker.Data as TransactionsDTO) : null;
  });

  /** DTO location du marker sélectionné (cast pour injection dans app-location-grid). */
  public readonly SelectedLocation = computed<LocationsDTO | null>(() => {
    const lMarker: IMapMarker | null = this.SelectedMarker();
    return lMarker?.Type === EMarkerType.Location ? (lMarker.Data as LocationsDTO) : null;
  });

  /** DTO property du marker sélectionné (cast pour injection dans app-property-grid). */
  public readonly SelectedProperty = computed<PropertiesDTO | null>(() => {
    const lMarker: IMapMarker | null = this.SelectedMarker();
    return lMarker?.Type === EMarkerType.Property ? (lMarker.Data as PropertiesDTO) : null;
  });

  /**
   * Énumération des types de markers exposée au template (aiguillage du popup custom).
   * - cm - Indispensable pour permettre au HTML d'utiliser `EMarkerType.Location`,
   * - cm - `EMarkerType.Transaction`, `EMarkerType.Property` dans les conditions `@if`.
   */
  public readonly EMarkerType = EMarkerType;

  /** Transaction en cours de suppression (pour la popup de confirmation). */
  public readonly RowToDeleteTransaction = signal<TransactionsDTO | null>(null);

  /** Indique si la popup de suppression transaction est ouverte. */
  public readonly ShowDeleteTransactionPopup = signal(false);

  /** Location en cours de suppression (pour la popup de confirmation). */
  public readonly RowToDeleteLocation = signal<LocationsDTO | null>(null);

  /** Indique si la popup de suppression location est ouverte. */
  public readonly ShowDeleteLocationPopup = signal(false);

  /** Bien (property) en cours de suppression (pour la popup de confirmation). */
  public readonly RowToDeleteProperty = signal<PropertiesDTO | null>(null);

  /** Indique si la popup de suppression bien (property) est ouverte. */
  public readonly ShowDeletePropertyPopup = signal(false);

  /** Indique si une suppression est en cours. */
  public readonly Deleting = signal(false);

  /** CA encaissé sur l'année civile en cours (depuis l'objectif annuel du dashboard). */
  public readonly CaEncaisseAnnee: Signal<number> = computed<number>(() => this.ObjectifAnnuel().atteint);

  /** Pourcentage de progression vers l'objectif annuel (borné 0..100 pour la jauge). */
  public readonly CaProgression: Signal<number> = computed<number>(() => {
    const lObjectif: number = this.ObjectifAnnuel().objectif;
    if (lObjectif <= 0) return 0;
    const lRatio: number = (this.ObjectifAnnuel().atteint / lObjectif) * 100;
    return Math.min(Math.max(lRatio, 0), 100);
  });

  /** Montant restant à encaisser pour atteindre l'objectif annuel (≥ 0). */
  public readonly CaRestant: Signal<number> = computed<number>(() => {
    const lReste: number = this.ObjectifAnnuel().objectif - this.ObjectifAnnuel().atteint;
    return lReste > 0 ? lReste : 0;
  });

  /** CA encaissé recalculé selon le mode de filtre actif (année / mois / période). */
  public readonly CaEncaisseFiltered: Signal<number> = computed<number>(() => this.CaEncaisseFilteredValue());

  /**
   * Nombre total d'affaires VENDU/LOUE sans date de signature.
   * Affiché en badge warning sur les sections Objectif annuel et CA encaissé.
   */
  public readonly AffairesSansDateCount: Signal<number> = computed<number>(() => {
    return (this.ObjectifAnnuel().venduSansDate ?? 0) + (this.ObjectifAnnuel().loueSansDate ?? 0);
  });

  /**
   * Indique s'il y a au moins une affaire VENDU/LOUE sans date de signature.
   * Déclenche l'affichage des badges warning sur le dashboard.
   */
  public readonly HasAffairesSansDate: Signal<boolean> = computed<boolean>(() => this.AffairesSansDateCount() > 0);

  /**
   * Libellé localisé du warning (avec compteurs détaillés VENDU/LOUE).
   * - cm - Vide si aucun warning à afficher (la balise <app-badge> est masquée par @if côté HTML).
   */
  public readonly AffairesSansDateLabel: Signal<string> = computed<string>(() => {
    const lVendu: number = this.ObjectifAnnuel().venduSansDate ?? 0;
    const lLoue: number = this.ObjectifAnnuel().loueSansDate ?? 0;
    if (lVendu === 0 && lLoue === 0) return '';
    // - cm - Construction de la liste "N VENDU + M LOUÉ" selon ce qui est > 0
    const lParts: string[] = [];
    if (lVendu > 0) lParts.push(`${lVendu} VENDU`);
    if (lLoue > 0) lParts.push(`${lLoue} LOUE`);
    return lParts.join(' + ');
  });

  /**
   * Option ECharts du graphique "CA encaissé par mois" pour l'année en cours.
   * Combine les honoraires encaissés des transactions (date de signature authentique)
   * et des locations (date de signature du bail d'entrée).
   */
  public readonly CaEncaisseChartOption: Signal<EChartsOption | null> = computed<EChartsOption | null>(() => {
    // [cm] InstantTick() ajoute une dependance reactive au computed pour que [cm] le chart se reconstruise au changement de langue (noms de series, [cm] titre "aucune donnee").
    this.Translate.InstantTick();
    const lYear: number = new Date().getFullYear();
    const lLabels: string[] = [];
    const lValues: number[] = new Array(12).fill(0);

    // - cm - Agrégation des transactions par mois (date signature authentique)
    for (const lT of this.Transactions()) {
      const lDate: Date | null = this.ToDate(lT.dateSignatureAuthentique ?? lT.createdAt);
      if (lDate === null || lDate.getFullYear() !== lYear) continue;
      const lMonth: number = lDate.getMonth();
      lValues[lMonth] += (lT.honorairesEncaisses ?? 0) + (lT.revenuTotalEncaisse ?? 0);
    }

    // [cm] Agrégation des locations par mois (date signature bail d'entrée) [cm] 2026-08-12 : les champs financiers (honorairesLocationEncaisses, revenuTotalEncaisse) ne sont plus sur LocationsDTO ; tout est calcule on-the-fly par FinanceCalculator cote backend. Le CA d'une location est ici approche par son loyer HC.
    for (const lL of this.Locations()) {
      const lDate: Date | null = this.ToDate(lL.dateSignatureBailEntree ?? lL.createdAt);
      if (lDate === null || lDate.getFullYear() !== lYear) continue;
      const lMonth: number = lDate.getMonth();
      lValues[lMonth] += lL.loyerHc ?? 0;
    }

    // - cm - Libellés des 12 mois en français
    for (let lM: number = 0; lM < 12; lM++) {
      const lDate: Date = new Date(lYear, lM, 1);
      lLabels.push(lDate.toLocaleDateString('fr-FR', { month: 'short' }));
    }

    const lHasData: boolean = lValues.some((pV: number): boolean => pV > 0);

    return {
      backgroundColor: 'transparent',
      title: lHasData
        ? undefined
        : {
            text: this.Translate.translate('crm-dashboard.filterCa.aucuneDonneeAnnee'),
            left: 'center',
            top: 'center',
            textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 'normal' }
          },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        extraCssText: 'box-shadow:0 12px 32px rgba(15,23,42,.14);border-radius:8px;',
        textStyle: { color: '#111827' },
        // eslint-disable-next-line @typescript-eslint/naming-convention -- Clé imposée par l'API ECharts
        formatter: (pParams: CallbackDataParams | CallbackDataParams[]): string => {
          const lItems: CallbackDataParams[] = Array.isArray(pParams) ? pParams : [pParams];
          const lRows: string = lItems
            .map(
              (pData: CallbackDataParams): string => {
                // - cm - Le chart n'utilise que des barres numériques, value est forcément un number ici
                const lValue: number = typeof pData.value === 'number' ? pData.value : Number(pData.value ?? 0);
                return `<div style="display:flex;justify-content:space-between;gap:18px;margin-top:6px;">
                   <span>${pData.marker}${pData.seriesName}</span>
                   <strong>${this.FormatPrice(lValue)}</strong>
                 </div>`;
              }
            )
            .join('');
          return `<div style="min-width:180px;padding:8px 10px;">
                    <strong>${lItems[0]?.name ?? ''}</strong>
                    ${lRows}
                  </div>`;
        }
      },
      grid: { left: '4%', right: '4%', bottom: 40, top: 24, containLabel: true },
      xAxis: {
        type: 'category',
        data: lLabels,
        show: lHasData,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisLabel: { color: '#6b7280', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        show: lHasData,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
          // eslint-disable-next-line @typescript-eslint/naming-convention -- Clé imposée par l'API ECharts
          formatter: (pValue: number): string => this.FormatPrice(pValue)
        }
      },
      series: [
        {
          name: this.Translate.translate('crm-dashboard.series.caEncaisse'),
          type: 'bar',
          barMaxWidth: 32,
          itemStyle: { color: 'var(--sm-success, #10b981)', borderRadius: [6, 6, 0, 0] },
          emphasis: { itemStyle: { color: 'var(--sm-success-dark, #059669)' } },
          data: lValues
        }
      ]
    };
  });

  /** Tâches en retard (échéance < aujourd'hui et non validées). */
  public readonly TachesRetard: Signal<TachesDTO[]> = computed<TachesDTO[]>(() => {
    const lToday: Date = this.StartOfToday();
    return this.Taches().filter((pT: TachesDTO): boolean => !pT.validee && this.IsBeforeToday(pT.dateEcheance, lToday));
  });

  /** Tâches à traiter aujourd'hui (échéance = aujourd'hui et non validées). */
  public readonly TachesAujourdhui: Signal<TachesDTO[]> = computed<TachesDTO[]>(() => {
    const lToday: Date = this.StartOfToday();
    return this.Taches().filter((pT: TachesDTO): boolean => !pT.validee && this.IsSameDay(pT.dateEcheance, lToday));
  });

  /** Tâches à traiter demain (échéance = demain et non validées). */
  public readonly TachesDemain: Signal<TachesDTO[]> = computed<TachesDTO[]>(() => {
    const lTomorrow: Date = this.StartOfTomorrow();
    return this.Taches().filter((pT: TachesDTO): boolean => !pT.validee && this.IsSameDay(pT.dateEcheance, lTomorrow));
  });

  /** Contacts à relancer (déjà filtrés côté backend), hors IDs masqués côté front. */
  public readonly ContactsARelancer: Signal<ContactsDTO[]> = computed<ContactsDTO[]>(() => {
    const lHidden: Set<number> = this.HiddenRelanceIds();
    return this.ContactsARelancerData().filter((pC: ContactsDTO): boolean => {
      const lId: number | undefined = pC.id;
      return lId === undefined || !lHidden.has(lId);
    });
  });

  /** Compteur de contacts (carte de stats) — total réel via API /Count. */
  public readonly ContactsCount: WritableSignal<number> = signal<number>(0);

  /** Cartes de statistiques calculées depuis les affaires. */
  public readonly StatCards: Signal<StatCard[]> = computed<StatCard[]>(() => {
    const lTransactions: TransactionsDTO[] = this.Transactions();
    // [cm] CA encaissé : uniquement les transactions avec statut "vendu" (cohérent avec le backend [cm] GetCaEncaisseAsync qui filtre sur Statut.Code == "VENDU"). Les transactions sans statut [cm] ou en estimation/mandat/compromis ne sont pas du CA encaissé.
    const lCaEncaisse: number = lTransactions
      .filter((pA: TransactionsDTO): boolean => pA.statut?.code?.toLowerCase() === 'vendu')
      .reduce(
        (pSum: number, pA: TransactionsDTO): number => pSum + (pA.honorairesEncaisses ?? 0) + (pA.revenuTotalEncaisse ?? 0),
        0
      );
    const lCaPotentiel: number = lTransactions
      .filter((pA: TransactionsDTO): boolean => pA.etatCommercialId === 2 || pA.etatCommercialId === 3)
      .reduce((pSum: number, pA: TransactionsDTO): number => pSum + (pA.commissionEstimee ?? 0), 0);
    const lCaPerdu: number = lTransactions
      .filter((pA: TransactionsDTO): boolean => pA.etatCommercialId === 4)
      .reduce((pSum: number, pA: TransactionsDTO): number => pSum + (pA.commissionEstimee ?? 0), 0);
    const lMandats: number = lTransactions.filter((pA: TransactionsDTO): boolean => pA.statutId === 2).length;
    const lCompromis: number = lTransactions.filter((pA: TransactionsDTO): boolean => pA.statutId === 4).length;

    return [
      { Label: 'CA encaissé', LabelKey: 'caEncaisse', View: 'biens', Icon: 'payments', Value: this.FormatPrice(lCaEncaisse), Accent: 'success' },
      { Label: 'CA potentiel', LabelKey: 'caPotentiel', View: 'biens', Icon: 'savings', Value: this.FormatPrice(lCaPotentiel), Accent: 'info' },
      { Label: 'CA perdu', LabelKey: 'caPerdu', View: 'biens', Icon: 'trending_down', Value: this.FormatPrice(lCaPerdu), Accent: 'danger' },
      { Label: 'Mandats actifs', LabelKey: 'mandatsActifs', View: 'biens', Icon: 'assignment', Value: String(lMandats), Accent: 'primary' },
      { Label: 'Compromis', LabelKey: 'compromis', View: 'biens', Icon: 'handshake', Value: String(lCompromis), Accent: 'primary' },
      { Label: 'Contacts', LabelKey: 'contacts', View: 'contacts', Icon: 'contacts', Value: String(this.ContactsCount()), Accent: 'primary' }
    ];
  });

  // #region i18n [cm] Traductions resolues dans le HTML via le pipe `tkey`. [cm] Le namespace 'crm-dashboard' est declare par `appTranslate [ns]` sur le parent. [cm] Plus aucun computed<string> i18n n'est necessaire : `tkey` lit [cm] InstantTick() et Namespace() pour rester reactif (cf. TranslateKeyPipe). #endregion

  //#region Lifecycle
  /** @inheritdoc */
  public ngOnInit(): void {
    void this.LoadData();
      void this.Translate.loadPageTranslations('crm-dashboard');
  }
  //#endregion

  //#region Methods
  /**
   * Charge les données du dashboard (transactions/locations/properties pour la carte +
   * tous les indicateurs calculés côté backend via DashboardService).
   */
  public async LoadData(): Promise<void> {
    this.Loading.set(true);
    this.StatCardsLoading.set(true);
    this.MapAnnivLoading.set(true);
    this.ObjectifCaLoading.set(true);
    this.TachesRelancesLoading.set(true);
    try {
      const lAnnee: number = new Date().getFullYear();

      // [cm] 4 sous-chargements parallèles : chaque section désactive son propre skeleton [cm] dès que sa promesse est résolue, sans attendre les autres.

      // 1) Stat cards : transactions + locations + contacts (et options des FK clientId). [cm] On demande l'inclusion de la navigation statut sur les transactions pour pouvoir [cm] filtrer le CA encaissé par statut.code = 'vendu' dans les StatCards.
      const lStatsPromise: Promise<[TransactionsDTO[], LocationsDTO[], ContactsDTO[]]> = Promise.all([
        this._TransactionsService.getAll({ page: 1, pageSize: 100, includeStatutEmpty: true, statut: {} }),
        this._LocationsService.getAll({ page: 1, pageSize: 100 }),
        this._ContactsService.getAll()
      ]);
      // [cm] Wrappers qui peuplent les signaux + désactivent le skeleton de la section [cm] dès que la promesse est résolue (indépendamment des autres).
      void lStatsPromise.then(([pT, pL, pC]: [TransactionsDTO[], LocationsDTO[], ContactsDTO[]]): void => {
        this.Transactions.set(pT ?? []);
        this.Locations.set(pL ?? []);
        this.ContactOptions.set((pC ?? [])
          .filter((pCi: ContactsDTO): boolean => pCi.id !== undefined)
          .map((pCi: ContactsDTO): IInputOption => ({
            Value: pCi.id as number,
            Label: [pCi.prenom, pCi.nom].filter(Boolean).join(' ').trim() || `Contact #${pCi.id}`
          })));
        this.StatCardsLoading.set(false);
      });

      // 2) Carte des biens + anniversaires du jour.
      void Promise.all([
        this._PropertiesService.getAll({ page: 1, pageSize: 100, adresse: {} }),
        this._DashboardService.GetAnniversairesJourAsync()
      ]).then(([pP, pA]: [PropertiesDTO[], ContactsDTO[]]): void => {
        this.Properties.set(pP ?? []);
        this.AnniversairesDuJour.set(pA ?? []);
        this.MapAnnivLoading.set(false);
      });

      // 3) Objectif annuel + CA encaissé filtré (le CA est rafraîchi après l'objectif).
      void this._DashboardService.GetObjectifAnnuelAsync(lAnnee)
        .then((pO: ObjectifAnnuelDashboardDTO): void => {
          this.ObjectifAnnuel.set(pO);
        })
        .then((): Promise<void> => this.RefreshCaEncaisseFiltered())
        .then((): void => {
          this.ObjectifCaLoading.set(false);
        });

      // 4) Tâches à suivre + contacts à relancer.
      void Promise.all([
        this._DashboardService.GetTachesASuivreAsync(),
        this._DashboardService.GetContactsARelancerAsync()
      ]).then(([pT, pC]: [TachesDTO[], ContactsDTO[]]): void => {
        this.Taches.set(pT ?? []);
        this.ContactsARelancerData.set(pC ?? []);
        this.TachesRelancesLoading.set(false);
      });

      // [cm] Les référentiels (natures, types, statuts, états, motifs) sont chargés [cm] en arrière-plan et ne bloquent aucune section : ils ne servent qu'au popup marker.
      void Promise.all([
        this._NatureAffaireService.getAll(),
        this._TypeBienService.getAll(),
        this._StatutAffaireService.getAll(),
        this._EtatCommercialService.getAll(),
        this._MotifBlocageService.getAll()
      ]).then(([pN, pTp, pS, pE, pM]: [
        { id?: number; code?: string; libelle?: string }[],
        { id?: number; code?: string; libelle?: string }[],
        { id?: number; code?: string; libelle?: string }[],
        { id?: number; code?: string; libelle?: string }[],
        { id?: number; code?: string; libelle?: string }[]
      ]): void => {
        this.NatureAffaireOptions.set(this.MapRefOptions(pN));
        this.TypeBienOptions.set(this.MapRefOptions(pTp));
        this.StatutOptions.set(this.MapRefOptions(pS));
        this.EtatCommercialOptions.set(this.MapRefOptions(pE));
        this.MotifBlocageOptions.set(this.MapRefOptions(pM));
      });
    } catch (pErr) {
      console.error('Erreur chargement dashboard CRM', pErr);
    } finally {
      this.Loading.set(false);
    }
  }

  /**
   * Mappe une liste de référentiels en options select { Value, Label }.
   * @param pRefs La liste des référentiels.
   * @returns Les options formatées pour les grilles et les filtres.
   */
  private MapRefOptions(pRefs: { id?: number; code?: string; libelle?: string }[] | undefined): IInputOption[] {
    return (pRefs ?? [])
      .filter(pR => pR.id !== undefined)
      .map(pR => ({ Value: pR.id as number, Label: pR.libelle ?? pR.code ?? '' }));
  }

  /**
   * Recharge le CA encaissé filtré en fonction du mode courant
   * (utilisé après LoadData et lors de chaque changement de filtre).
   */
  public async RefreshCaEncaisseFiltered(): Promise<void> {
    const lMode: CaFilterMode = this.CaFilterMode();
    let lPeriode: ECADashboardPeriode;
    let lDebut: Date | undefined;
    let lFin: Date | undefined;

    if (lMode === 'annee') {
      lPeriode = ECADashboardPeriode.Annee;
    } else if (lMode === 'mois') {
      lPeriode = ECADashboardPeriode.Mois;
    } else {
      lPeriode = ECADashboardPeriode.Personnalise;
      const lDebutStr: string = this.CaPeriodeDebut();
      const lFinStr: string = this.CaPeriodeFin();
      if (lDebutStr) {
        const lD: Date = new Date(lDebutStr);
        if (!isNaN(lD.getTime())) { lDebut = lD; }
      }
      if (lFinStr) {
        const lF: Date = new Date(lFinStr);
        if (!isNaN(lF.getTime())) { lFin = lF; }
      }
    }

    const lCa: number = await this._DashboardService.GetCaEncaisseAsync(lPeriode, lDebut, lFin);
    this.CaEncaisseFilteredValue.set(lCa);
  }

  /**
   * Tracking PostHog au clic sur une carte de stats puis navigation vers la vue CRM associée.
   * @param pLabel Le libellé brut de la carte cliquée (identifiant technique PostHog).
   * @param pView Vue CRM cible (null si pas de navigation).
   */
  public OnCardClick(pLabel: string, pView: string | null): void {
    this.PostHog.Capture(this.BuildTrackingName(`crm_dashboard_card_${pLabel}`, 'tracking'));
    if (pView !== null) {
      this.Go(pView);
    }
  }

  /**
   * Navigation au clic sur une barre du graphique "CA encaissé par mois".
   * @param pIndex L'index de la donnée cliquée (mois 0..11).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Conservé pour le tracking futur par mois
  public OnChartBarClick(pIndex: number): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_dashboard_chart_bar_click', 'tracking'));
    // - cm - Le tableau transactions/locations est dans la vue biens
    this.Go('biens');
  }

  /**
   * Navigation au clic sur le warning "affaires VENDU/LOUE sans date de signature".
   * Ouvre la vue biens (transactions par défaut) pour que l'utilisateur puisse
   * compléter la date_signature_authentique des affaires concernées.
   */
  public OnAffaireSansDateClick(): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_dashboard_warning_affaire_sans_date_click', 'tracking'));
    this.Go('biens');
  }

  /**
   * Change le mode de filtre du CA encaissé.
   * @param pMode Le mode de filtre ('annee' | 'mois' | 'periode').
   */
  public OnCaFilterChange(pMode: CaFilterMode): void {
    this.CaFilterMode.set(pMode);
    void this.RefreshCaEncaisseFiltered();
  }

  /**
   * Met à jour la date de début de la période personnalisée.
   * @param pValue La valeur saisie (ISO yyyy-mm-dd).
   */
  public OnPeriodeDebutChange(pValue: string): void {
    this.CaPeriodeDebut.set(pValue ?? '');
    if (this.CaFilterMode() === 'periode') {
      void this.RefreshCaEncaisseFiltered();
    }
  }

  /**
   * Met à jour la date de fin de la période personnalisée.
   * @param pValue La valeur saisie (ISO yyyy-mm-dd).
   */
  public OnPeriodeFinChange(pValue: string): void {
    this.CaPeriodeFin.set(pValue ?? '');
    if (this.CaFilterMode() === 'periode') {
      void this.RefreshCaEncaisseFiltered();
    }
  }

  /**
   * Masque un contact de la carte de relance (sans le supprimer).
   * Persiste le masquage côté backend via DashboardService.
   * @param pId L'identifiant du contact à masquer.
   */
  public HideRelance(pId: number): void {
    const lSet: Set<number> = new Set(this.HiddenRelanceIds());
    lSet.add(pId);
    this.HiddenRelanceIds.set(lSet);
    void this._DashboardService.SetMasquageContactAsync(pId, true);
  }
  //#endregion

  //#region Helpers
  /**
   * Convertit une valeur en Date (null si invalide ou absente).
   * @param pValue La valeur de date (Date | string | undefined).
   * @returns La date convertie ou null.
   */
  private ToDate(pValue: Date | string | undefined): Date | null {
    if (pValue === undefined || pValue === null || pValue === '') return null;
    const lDate: Date = pValue instanceof Date ? pValue : new Date(pValue);
    return isNaN(lDate.getTime()) ? null : lDate;
  }

  /**
   * Retourne la date d'aujourd'hui à minuit (référence pour comparaisons).
   * @returns La date du jour à 00:00:00.
   */
  private StartOfToday(): Date {
    const lDate: Date = new Date();
    lDate.setHours(0, 0, 0, 0);
    return lDate;
  }

  /**
   * Retourne la date de demain à minuit.
   * @returns La date de demain à 00:00:00.
   */
  private StartOfTomorrow(): Date {
    const lDate: Date = this.StartOfToday();
    lDate.setDate(lDate.getDate() + 1);
    return lDate;
  }

  /**
   * Vérifie si une date correspond exactement à un jour donné.
   * @param pValue La valeur de date à tester.
   * @param pRef La date de référence (à minuit).
   * @returns true si même jour/mois/année.
   */
  private IsSameDay(pValue: Date | string | undefined, pRef: Date): boolean {
    const lDate: Date | null = this.ToDate(pValue);
    if (lDate === null) return false;
    return (
      lDate.getFullYear() === pRef.getFullYear() &&
      lDate.getMonth() === pRef.getMonth() &&
      lDate.getDate() === pRef.getDate()
    );
  }

  /**
   * Vérifie si une date est strictement antérieure à une référence (à minuit).
   * @param pValue La valeur de date à tester.
   * @param pRef La date de référence (à minuit).
   * @returns true si la date est avant le jour de référence.
   */
  private IsBeforeToday(pValue: Date | string | undefined, pRef: Date): boolean {
    const lDate: Date | null = this.ToDate(pValue);
    if (lDate === null) return false;
    const lCompare: Date = new Date(lDate);
    lCompare.setHours(0, 0, 0, 0);
    return lCompare < pRef;
  }
  //#endregion

  //#region Methods - Marker click (popup grille custom)

  /**
   * Gère le clic sur un marker de la carte du dashboard.
   * Stocke le marker sélectionné et ouvre le popup custom affichant la grille
   * correspondante avec une seule ligne (celle du DTO).
   * @param pMarker Le marker cliqué (contient `Type` et `Data`).
   */
  public OnMarkerClick(pMarker: IMapMarker): void {
    this.SelectedMarker.set(pMarker);
  }

  /**
   * Ferme le popup grille (appelé sur cancel/close/closed du popup).
   */
  public OnMarkerPopupClosed(): void {
    this.SelectedMarker.set(null);
  }

  //#endregion

  //#region Methods - Handlers grille Transactions

    /**
     * Gère le clic sur une action de ligne transaction (delete).
   * @param pEvent L'événement d'action.
   */
  public SurTransactionActionClic(pEvent: GridActionEvent<TransactionsDTO>): void {
    if (pEvent.Action === 'delete') {
      this.RowToDeleteTransaction.set(pEvent.Row);
      this.ShowDeleteTransactionPopup.set(true);
    }
  }

  /**
   * Hook post-création : capture PostHog + re-fetch server-side.
   * - cm - Appelé par `(RowCreated)` du wrapper `transaction-grid` (cf.
   *      KAN-GRID-AUTO-ADD-ROW). La création BDD a déjà eu lieu dans
   *      `GridComponentBase.OnRowAdded`.
   * @param _pRow La ligne créée.
   */
  public async SurTransactionCreee(_pRow: TransactionsDTO): Promise<void> {
    await this.LoadTransactions();
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_transaction_add', 'tracking'));
  }

  /**
   * Recharge la liste des transactions (utilisé par SurTransactionCreee post-création).
   * - cm - Méthode spécifique crm-dashboard (équivalent existe dans crm-biens mais avec
   * un contexte différent : ici le dashboard n'a pas de mode server-side, on recharge
   * en page 1 / 100 comme dans LoadData).
   */
  public async LoadTransactions(): Promise<void> {
    try {
      const lTx: TransactionsDTO[] = await this._TransactionsService.getAll({ page: 1, pageSize: 100, includeStatutEmpty: true, statut: {} });
      this.Transactions.set(lTx ?? []);
    } catch (pErr) {
      console.error('Erreur rechargement transactions', pErr);
    }
  }

  //#endregion

  //#region Methods - Handlers grille Locations

  /**
     * Gère le clic sur une action de ligne location (delete).
     */
  public SurLocationActionClic(pEvent: GridActionEvent<LocationsDTO>): void {
    if (pEvent.Action === 'delete') {
      this.RowToDeleteLocation.set(pEvent.Row);
      this.ShowDeleteLocationPopup.set(true);
    }
  }

  /**
   * Hook post-création : capture PostHog + re-fetch server-side.
   * - cm - Appelé par `(RowCreated)` du wrapper `location-grid` (cf.
   *      KAN-GRID-AUTO-ADD-ROW).
   * @param _pRow La ligne créée.
   */
  public async SurLocationCreee(_pRow: LocationsDTO): Promise<void> {
    await this.LoadLocations();
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_location_add', 'tracking'));
  }

  /**
   * Recharge la liste des locations (utilisé par SurLocationCreee post-création).
   */
  public async LoadLocations(): Promise<void> {
    try {
      const lLoc: LocationsDTO[] = await this._LocationsService.getAll({ page: 1, pageSize: 100 });
      this.Locations.set(lLoc ?? []);
    } catch (pErr) {
      console.error('Erreur rechargement locations', pErr);
    }
  }

  //#endregion

  //#region Methods - Handlers grille Properties

    /**
   * Gère le clic sur une action de ligne bien (delete).
   */
  public SurProprieteActionClic(pEvent: GridActionEvent<PropertiesDTO>): void {
    if (pEvent.Action === 'delete') {
      this.RowToDeleteProperty.set(pEvent.Row);
      this.ShowDeletePropertyPopup.set(true);
    }
  }

  /**
   * Hook post-création : capture PostHog + re-fetch server-side.
   * - cm - Appelé par `(RowCreated)` du wrapper `property-grid` (cf.
   *      KAN-GRID-AUTO-ADD-ROW).
   * @param _pRow La ligne créée.
   */
  public async SurProprieteCreee(_pRow: PropertiesDTO): Promise<void> {
    await this.LoadProperties();
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_property_add', 'tracking'));
  }

  /**
   * Recharge la liste des biens (properties) (utilisé par SurProprieteCreee post-création).
   */
  public async LoadProperties(): Promise<void> {
    try {
      const lProp: PropertiesDTO[] = await this._PropertiesService.getAll({ page: 1, pageSize: 100, adresse: {} });
      this.Properties.set(lProp ?? []);
    } catch (pErr) {
      console.error('Erreur rechargement properties', pErr);
    }
  }

  //#endregion

  //#region Methods - Confirmation suppression

  /**
   * Confirme la suppression de la transaction en cours.
   */
  public async OnConfirmDeleteTransaction(): Promise<void> {
    const lRow: TransactionsDTO | null = this.RowToDeleteTransaction();
    if (!lRow?.id) {
      this.OnCancelDeleteTransaction();
      return;
    }
    this.Deleting.set(true);
    try {
      await this._TransactionsService.delete({ id: lRow.id });
      const lRows = this.Transactions().filter(pR => pR.id !== lRow.id);
      this.Transactions.set(lRows);
    } catch (pErr) {
      console.error('Erreur suppression transaction', pErr);
    } finally {
      this.Deleting.set(false);
      this.OnCancelDeleteTransaction();
    }
  }

  /**
   * Annule la suppression de la transaction.
   */
  public OnCancelDeleteTransaction(): void {
    this.RowToDeleteTransaction.set(null);
    this.ShowDeleteTransactionPopup.set(false);
  }

  /**
   * Confirme la suppression de la location en cours.
   */
  public async OnConfirmDeleteLocation(): Promise<void> {
    const lRow: LocationsDTO | null = this.RowToDeleteLocation();
    if (!lRow?.id) {
      this.OnCancelDeleteLocation();
      return;
    }
    this.Deleting.set(true);
    try {
      await this._LocationsService.delete({ id: lRow.id });
      const lRows = this.Locations().filter(pR => pR.id !== lRow.id);
      this.Locations.set(lRows);
    } catch (pErr) {
      console.error('Erreur suppression location', pErr);
    } finally {
      this.Deleting.set(false);
      this.OnCancelDeleteLocation();
    }
  }

  /**
   * Annule la suppression de la location.
   */
  public OnCancelDeleteLocation(): void {
    this.RowToDeleteLocation.set(null);
    this.ShowDeleteLocationPopup.set(false);
  }

  /**
   * Confirme la suppression du bien en cours.
   */
  public async OnConfirmDeleteProperty(): Promise<void> {
    const lRow: PropertiesDTO | null = this.RowToDeleteProperty();
    if (!lRow?.id) {
      this.OnCancelDeleteProperty();
      return;
    }
    this.Deleting.set(true);
    try {
      await this._PropertiesService.delete({ id: lRow.id });
      const lRows = this.Properties().filter(pR => pR.id !== lRow.id);
      this.Properties.set(lRows);
    } catch (pErr) {
      console.error('Erreur suppression property', pErr);
    } finally {
      this.Deleting.set(false);
      this.OnCancelDeleteProperty();
    }
  }

  /**
   * Annule la suppression du bien.
   */
  public OnCancelDeleteProperty(): void {
    this.RowToDeleteProperty.set(null);
    this.ShowDeletePropertyPopup.set(false);
  }

  //#endregion
}
