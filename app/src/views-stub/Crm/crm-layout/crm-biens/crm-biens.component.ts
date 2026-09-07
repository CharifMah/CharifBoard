import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, PLATFORM_ID, viewChild } from '@angular/core';
import { GridComponent } from '@shared/components/grid/grid.component';
import { isPlatformBrowser } from '@angular/common';
import { GridActionEvent } from '@shared/components/grid/grid.component';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { TabsComponent, TabItem } from '@shared/components/tabs/tabs.component';
import { MapCardComponent } from '@shared/components/map-card/map-card.component';
import { EMapStyle } from '@shared/components/map-card/EMapStyle';
import { EMarkerType } from '@shared/components/map-card/EMarkerType';
import { IMapMarker } from '@shared/components/map-card/IMapMarker';
import { GetMarkerStyle } from '@shared/components/map-card/map-marker-style';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { TransactionsDTO } from '@core/crm/dto/transactions/transactions.dto';
import { TransactionsCritereDTO } from '@core/crm/dto/transactions/transactions.critere';
import { TransactionsService } from '@core/crm/services/transactions/transactions.service';
import { LocationsDTO } from '@core/crm/dto/locations/locations.dto';
import { LocationsCritereDTO } from '@core/crm/dto/locations/locations.critere';
import { LocationsService } from '@core/crm/services/locations/locations.service';
import { PropertiesDTO } from '@core/crm/dto/properties/properties.dto';
import { PropertiesCritereDTO } from '@core/crm/dto/properties/properties.critere';
import { PropertiesService } from '@core/crm/services/properties/properties.service';
import { RefNatureAffaireService } from '@core/crm/services/ref-nature-affaire/ref-nature-affaire.service';
import { RefNatureAffaireCritereDTO } from '@core/crm/dto/ref-nature-affaire/ref-nature-affaire.critere';
import { RefTypeBienService } from '@core/crm/services/ref-type-bien/ref-type-bien.service';
import { RefTypeBienCritereDTO } from '@core/crm/dto/ref-type-bien/ref-type-bien.critere';
import { RefStatutAffaireService } from '@core/crm/services/ref-statut-affaire/ref-statut-affaire.service';
import { RefStatutAffaireCritereDTO } from '@core/crm/dto/ref-statut-affaire/ref-statut-affaire.critere';
import { RefEtatCommercialService } from '@core/crm/services/ref-etat-commercial/ref-etat-commercial.service';
import { RefEtatCommercialCritereDTO } from '@core/crm/dto/ref-etat-commercial/ref-etat-commercial.critere';
import { RefMotifBlocageService } from '@core/crm/services/ref-motif-blocage/ref-motif-blocage.service';
import { RefMotifBlocageCritereDTO } from '@core/crm/dto/ref-motif-blocage/ref-motif-blocage.critere';
import { ContactsService } from '@core/crm/services/contacts/contacts.service';
import { ContactsDTO } from '@core/crm/dto/contacts/contacts.dto';
import { ParametresService } from '@core/crm/services/parametres/parametres.service';
import { BaseComponent } from '@base/BaseComponent';
import { IInputOption } from '@shared/components/input/input.types';
import { TransactionGridComponent } from './grids/transaction-grid.component';
import { LocationGridComponent } from './grids/location-grid.component';
import { PropertyGridComponent } from './grids/property-grid.component';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { MatchingCandidatesDialogComponent } from '@shared/components/matching-candidates-dialog/matching-candidates-dialog.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';

import { TranslationService } from '@core/services/i18n/TranslationService';
import { GridColumn } from '@shared/components/grid/GridColumn';
/** Onglet actif de la page Portefeuille global (V2 §3.1). */
type EBiensTab = 'portefeuille' | 'transactions' | 'locations' | 'properties';

/**
 * Type discriminant pour la ligne unifiee du Portefeuille global.
 * Chaque ligne provient de l'une des 3 sources (Transactions, Locations, Properties).
 */
type EPortefeuilleKind = 'transaction' | 'location' | 'property';

/**
 * Ligne unifiee affichee dans la grille du Portefeuille global.
 * - cm - Vue agregee cote front uniquement (V2 §3.1) : pas de nouvelle entite en BDD.
 * Les 3 sources existantes alimentent les champs ci-dessous.
 */
interface IPortefeuilleRow
{
  /** Identifiant source (id de la transaction / location / property). */
  id: number;
  /** Discriminant de la source. */
  kind: EPortefeuilleKind;
  /** Reference du dossier (LOC-, TR-, BIEN-, etc.). */
  reference: string;
  /** Ville issue de l'adresse. */
  ville: string;
  /** Libelle de la nature d'affaire (Vente, Location, Estimation...). */
  natureLabel: string;
  /** Libelle du type de bien. */
  typeBienLabel: string;
  /** Surface en m². */
  surface: number | null;
  /** Libelle du statut. */
  statutLabel: string;
  /** Libelle de l'etat commercial. */
  etatCommercialLabel: string;
  /** Date de derniere mise a jour (tri descendant). */
  updatedAt: Date | string | null;
  /** Latitude GPS (pour marker de carte). */
  latitude: number | null;
  /** Longitude GPS (pour marker de carte). */
  longitude: number | null;
  /** DTO source (cast selon `kind`). */
  source: TransactionsDTO | LocationsDTO | PropertiesDTO;
}

/**
 * Page Biens du CRM.
 * Fusion des anciennes pages Portefeuille et Biens en une seule page BIENS
 * avec deux tableaux distincts (Transactions et Locations) prÃ©sentÃ©s en onglets.
 *
 * Les grilles sont extraites dans des composants autonomes rÃ©utilisables
 * (TransactionGridComponent / LocationGridComponent).
 * Cette page gÃ¨re uniquement :
 * - Le state (transactions, locations, loading, error)
 * - Le chargement des rÃ©fÃ©rentiels et la conversion en options select
 * - Les appels CRUD (create/update/delete) via les services
 * - Les popups de confirmation de suppression
 * - Les marqueurs de carte
 */
@Component({
  selector: 'app-crm-biens',
  standalone: true,
  imports: [DashboardHeaderComponent, PopupComponent, TabsComponent, SectionCardComponent, ButtonComponent, MapCardComponent, GridComponent, TransactionGridComponent, LocationGridComponent, PropertyGridComponent, MatchingCandidatesDialogComponent, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-biens.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-biens.component.scss'
})
export class CrmBiensComponent extends BaseComponent implements OnInit {

  //#region Attributes
  /** Service des transactions CRM. */
  private readonly _TransactionsService: TransactionsService = inject(TransactionsService);

  /** Service de traduction (lazy-load par page). */
  private readonly _Translation: TranslationService = inject(TranslationService);

  /** Service des locations CRM. */
  private readonly _LocationsService: LocationsService = inject(LocationsService);

  /** Service des biens (properties) CRM. */
  private readonly _PropertiesService: PropertiesService = inject(PropertiesService);

  /** Service du rÃ©fÃ©rentiel nature de l'affaire. */
  private readonly _NatureAffaireService: RefNatureAffaireService = inject(RefNatureAffaireService);

  /** Service du rÃ©fÃ©rentiel type de bien. */
  private readonly _TypeBienService: RefTypeBienService = inject(RefTypeBienService);

  /** Service du rÃ©fÃ©rentiel statut de l'affaire. */
  private readonly _StatutAffaireService: RefStatutAffaireService = inject(RefStatutAffaireService);

  /** Service du rÃ©fÃ©rentiel Ã©tat commercial. */
  private readonly _EtatCommercialService: RefEtatCommercialService = inject(RefEtatCommercialService);

  /** Service du rÃ©fÃ©rentiel motif de blocage. */
  private readonly _MotifBlocageService: RefMotifBlocageService = inject(RefMotifBlocageService);

  /** Service des contacts CRM (utilisÃ© pour les FK clientId/proprietaireId dans les grilles). */
  private readonly _ContactsService: ContactsService = inject(ContactsService);

  /** Service des parametres utilisateur (crm.parametres) - charge commissionParDefautPct pour pre-remplir les nouvelles transactions. */
  private readonly _ParametresService: ParametresService = inject(ParametresService);

  /** Identifiant de plateforme (browser vs SSR). */
  private readonly _PlatformId: object = inject(PLATFORM_ID);

  /**
   * Reference vers la grille des transactions (pour SetRowSaving/ClearRowSaving).
   * - cm - Utilise `viewChild` (signal-based, Angular 17.3+) plutot que `@ViewChild`
   * - cm - classique : la grille est dans un bloc `@if (ActiveTab() === 'transactions')`
   * - cm - donc elle n'est instanciee que quand l'onglet est actif. Le signal
   * - cm - `viewChild()` se resout automatiquement a la creation du bloc `@if`.
   * - cm - Les markers de carte sont construits independamment (cf. `TransactionMapMarkers`)
   * - cm - pour eviter tout couplage avec le cycle de vie de la grille.
   */
  private readonly _TransactionGrid = viewChild<TransactionGridComponent>('transactionsGrid');

  /**
   * Reference vers la grille des locations (pour SetRowSaving/ClearRowSaving).
   * - cm - Voir `_TransactionGrid` pour l'explication de l'usage de `viewChild`
   * - cm - signal-based (necessaire car la grille est dans un `@if` lazy).
   */
  private readonly _LocationGrid = viewChild<LocationGridComponent>('locationsGrid');

  /**
   * Reference vers la grille des biens (properties) pour SetRowSaving/ClearRowSaving.
   * - cm - Voir `_TransactionGrid` pour l'explication de l'usage de `viewChild`
   * - cm - signal-based (necessaire car la grille est dans un `@if` lazy).
   */
  private readonly _PropertyGrid = viewChild<PropertyGridComponent>('propertiesGrid');

  /**
   * Reference vers la carte unique affichee au-dessus de la grille.
   * - cm - Une seule carte pour les 3 onglets : les markers changent au switch
   * - cm - (cf. `ActiveMapMarkers`). Cela evite de creer/detruire 3 instances
   * - cm - Mapbox et de garder le cache des tuiles entre les onglets.
   * - cm - `viewChild` signal-based : le signal est resolu a la creation du DOM.
   */
  private readonly _ActiveMap = viewChild<MapCardComponent>('activeMap');
  //#endregion

  //#region Properties
  /** Onglet actif (Transactions par dÃ©faut). */
  public readonly ActiveTab = signal<EBiensTab>('transactions');

  /** Liste des onglets de la page Portefeuille global (V2 §3.1). */
  public readonly BiensTabs: TabItem[] = [
    { id: 'portefeuille', label: 'Portefeuille global', icon: 'dashboard' },
    { id: 'transactions', label: 'Transactions', icon: 'sell' },
    { id: 'locations', label: 'Locations', icon: 'key' },
    { id: 'properties', label: 'Biens', icon: 'apartment' }
  ];

  /** Style de la carte des transactions. */
  public readonly TransactionMapStyle = signal<EMapStyle>(EMapStyle.Streets);

  /** Style de la carte des locations. */
  public readonly LocationMapStyle = signal<EMapStyle>(EMapStyle.Streets);

  /** Style de la carte des biens. */
  public readonly PropertyMapStyle = signal<EMapStyle>(EMapStyle.Streets);

  /**
   * Markers de la carte unique : depend de l'onglet actif.
   * - cm - Une seule carte est affichee a la fois. Les markers changent
   * - cm - automatiquement au switch d'onglet (cf. `ActiveMapMarkers`).
   */
  public readonly ActiveMapMarkers = computed<IMapMarker[]>(() =>
  {
    switch (this.ActiveTab())
    {
      case 'portefeuille':  return this.PortefeuilleMapMarkers();
      case 'transactions': return this.TransactionMapMarkers();
      case 'locations':    return this.LocationMapMarkers();
      case 'properties':   return this.PropertyMapMarkers();
    }
  });

  /** Style de la carte unique : depend de l'onglet actif. */
  public readonly ActiveMapStyle = computed<EMapStyle>(() =>
  {
    switch (this.ActiveTab())
    {
      case 'portefeuille':  return this.PortefeuilleMapStyle();
      case 'transactions': return this.TransactionMapStyle();
      case 'locations':    return this.LocationMapStyle();
      case 'properties':   return this.PropertyMapStyle();
    }
  });

  /** Titre de la carte unique : depend de l'onglet actif. */
  public readonly ActiveMapTitle = computed<string>(() =>
  {
    switch (this.ActiveTab())
    {
      case 'portefeuille':  return 'Carte du portefeuille global';
      case 'transactions': return 'Carte des transactions';
      case 'locations':    return 'Carte des locations';
      case 'properties':   return 'Carte des biens';
    }
  });

  /** Icone Material de la carte unique : depend de l'onglet actif. */
  public readonly ActiveMapIcon = computed<string>(() =>
  {
    switch (this.ActiveTab())
    {
      case 'portefeuille':  return 'dashboard';
      case 'transactions': return 'home_work';
      case 'locations':    return 'home_work';
      case 'properties':   return 'apartment';
    }
  });

  /**
   * Ã‰numÃ©ration des types de markers exposÃ©e au template (aiguillage du popup custom).
   * - cm - Indispensable pour permettre au HTML d'utiliser `EMarkerType.Location`,
   * - cm - `EMarkerType.Transaction`, `EMarkerType.Property` dans les conditions `@if`.
   */
  public readonly EMarkerType = EMarkerType;

  /** Liste des transactions chargÃ©es. */
  public readonly Transactions = signal<TransactionsDTO[]>([]);

  /** Liste des locations chargÃ©es. */
  public readonly Locations = signal<LocationsDTO[]>([]);

  /** Liste des biens (properties) chargÃ©s. */
  public readonly Properties = signal<PropertiesDTO[]>([]);

  /** Indique le chargement en cours. */
  public readonly Loading = signal(false);

  /** Message d'erreur Ã©ventuel. */
  public readonly Error = signal<string | null>(null);

  /**
   * Pourcentage d honoraires par defaut issu de la fiche ParametresDTO (commissionParDefautPct).
   * Passe en input a <app-transaction-grid> via [DefaultHonorairesPct] pour pre-remplir honorairesPct sur les nouvelles lignes.
   */
  public readonly DefaultHonorairesPct = signal<number | undefined>(undefined);

  /** Style de la carte du Portefeuille global. */
  public readonly PortefeuilleMapStyle = signal<EMapStyle>(EMapStyle.Streets);

  /**
   * Vue unifiee du Portefeuille global (V2 §3.1).
   * Agrege Transactions + Locations + Properties en lignes homogenes avec un
   * discriminant `kind` (transaction | location | property), triees par `updatedAt`
   * descendant. Recalculee automatiquement a chaque mutation de l'une des 3 sources.
   * Cote front uniquement : aucune modif BDD requise.
   */
  public readonly PortefeuilleRows = computed<IPortefeuilleRow[]>(() =>
  {
    const lStatuts: IInputOption[] = this.StatutOptions();
    const lNatures: IInputOption[] = this.NatureAffaireOptions();
    const lTypesBien: IInputOption[] = this.TypeBienOptions();
    const lEtatsCommerciaux: IInputOption[] = this.EtatCommercialOptions();

    const lFindLabel = (pOptions: IInputOption[], pId: number | null | undefined): string =>
    {
      if (pId === null || pId === undefined)
      {
        return '';
      }
      const lFound: IInputOption | undefined = pOptions.find((pOpt: IInputOption) => Number(pOpt.Value) === Number(pId));
      return lFound?.Label ?? '';
    };

    // [cm] 2026-08-12 : le type de bien ne vit plus sur la transaction / la location (FK type_bien_id supprimee des tables). On remonte au libelle via la nav Property (FK property_id -> crm.properties.type_bien_id). Pour un bien non lie, le libelle reste vide. La FK type_bien_id reste en revanche sur crm.properties.
    const lTypeBienFromProperty = (pProperty: { typeBien?: { libelle?: string } } | null | undefined): string =>
    {
      return pProperty?.typeBien?.libelle ?? '';
    };

    const lTxRows: IPortefeuilleRow[] = this.Transactions().map((pT: TransactionsDTO): IPortefeuilleRow => ({
      id: pT.id ?? 0,
      kind: 'transaction',
      reference: pT.reference ?? '',
      ville: pT.adresse?.city ?? '',
      natureLabel: lFindLabel(lNatures, pT.natureAffaireId),
      typeBienLabel: lTypeBienFromProperty(pT.property),
      // [cm] 2026-08-12 : la surface n'est plus sur crm.transactions (champ migre vers crm.properties ; le portefeuille s'appuie sur le bien lie).
      surface: null,
      statutLabel: lFindLabel(lStatuts, pT.statutId),
      etatCommercialLabel: lFindLabel(lEtatsCommerciaux, pT.etatCommercialId),
      updatedAt: pT.updatedAt ?? pT.createdAt ?? null,
      latitude: pT.adresse?.latitude ?? null,
      longitude: pT.adresse?.longitude ?? null,
      source: pT
    }));

    const lLocRows: IPortefeuilleRow[] = this.Locations().map((pL: LocationsDTO): IPortefeuilleRow => ({
      id: pL.id ?? 0,
      kind: 'location',
      reference: pL.reference ?? '',
      ville: pL.adresse?.city ?? '',
      natureLabel: lFindLabel(lNatures, pL.natureAffaireId),
      typeBienLabel: lTypeBienFromProperty(pL.property),
      // [cm] 2026-08-12 : la surface n'est plus sur crm.locations (champ migre vers crm.properties ; le portefeuille s'appuie sur le bien lie).
      surface: null,
      statutLabel: lFindLabel(lStatuts, pL.statutId),
      etatCommercialLabel: lFindLabel(lEtatsCommerciaux, pL.etatCommercialId),
      updatedAt: pL.updatedAt ?? pL.createdAt ?? null,
      latitude: pL.adresse?.latitude ?? null,
      longitude: pL.adresse?.longitude ?? null,
      source: pL
    }));

    const lPropRows: IPortefeuilleRow[] = this.Properties().map((pP: PropertiesDTO): IPortefeuilleRow => ({
      id: pP.id ?? 0,
      kind: 'property',
      reference: pP.reference ?? '',
      ville: pP.adresse?.city ?? '',
      natureLabel: '',
      typeBienLabel: lFindLabel(lTypesBien, pP.typeBienId),
      surface: pP.surface ?? null,
      statutLabel: pP.statut ?? '',
      etatCommercialLabel: '',
      updatedAt: pP.updatedAt ?? pP.createdAt ?? null,
      latitude: pP.adresse?.latitude ?? null,
      longitude: pP.adresse?.longitude ?? null,
      source: pP
    }));

    return [...lTxRows, ...lLocRows, ...lPropRows].sort((a, b) => {
      const lAd: number = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const lBd: number = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return lBd - lAd;
    });
  });

  /**
   * Marqueurs de la carte construits depuis la vue unifiee `PortefeuilleRows`.
   * Chaque ligne est convertie en marker avec le type approprie selon `kind`.
   * Filtre les coordonnees GPS invalides (lat/lng = 0).
   */
  public readonly PortefeuilleMapMarkers = computed<IMapMarker[]>(() =>
    this.PortefeuilleRows()
      .filter((pRow: IPortefeuilleRow): boolean =>
      {
        const lLat: number = Number(pRow.latitude ?? 0);
        const lLng: number = Number(pRow.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pRow: IPortefeuilleRow): IMapMarker =>
      {
        const lMarkerType: EMarkerType =
          pRow.kind === 'transaction' ? EMarkerType.Transaction :
          pRow.kind === 'location' ? EMarkerType.Location : EMarkerType.Property;
        const lStyle = GetMarkerStyle(lMarkerType);
        return {
          Lat: Number(pRow.latitude ?? 0),
          Lng: Number(pRow.longitude ?? 0),
          Title: pRow.reference ?? pRow.ville ?? 'Bien',
          Popup: `${pRow.reference ?? ''} - ${pRow.ville ?? ''}`,
          Icon: lStyle.Icon,
          Color: lStyle.Color,
          Type: lMarkerType,
          Data: pRow.source,
          DataId: pRow.id
        };
      })
  );

  /**
   * Configuration des colonnes de la grille du Portefeuille global.
   * - cm - Le `Format` accede aux champs homogenes de `IPortefeuilleRow`
   * (kind, natureLabel, typeBienLabel, etc.), pas au DTO source.
   * La colonne `kind` affiche un badge Material pour discriminer visuellement
   * transaction / location / property.
   * La colonne `candidats` affiche le resume matching (AcquereurPotentiel /
   * LocatairePotentiel) pre-calcule par le hook AfterCreateAsync/AfterUpdateAsync.
   * Property n'a pas de matching (pas de nature achat/location) -> colonne vide.
   */
  public get PortefeuilleColumns(): GridColumn<IPortefeuilleRow>[]
  {
    return [
      {
        Key: 'kind',
        Label: 'Type',
        Width: '140px',
        Format: (_pValue: unknown, pRow: IPortefeuilleRow): string => {
          switch (pRow.kind) {
            case 'transaction': return 'Transaction';
            case 'location':    return 'Location';
            case 'property':    return 'Bien';
            default:            return '';
          }
        },
        CellClass: (_pValue: unknown, pRow: IPortefeuilleRow): string => {
          switch (pRow.kind) {
            case 'transaction': return 'crm-biens__badge crm-biens__badge--transaction';
            case 'location':    return 'crm-biens__badge crm-biens__badge--location';
            case 'property':    return 'crm-biens__badge crm-biens__badge--property';
            default:            return '';
          }
        }
      },
      { Key: 'reference',   Label: 'Reference', Sortable: true, Width: '150px' },
      { Key: 'ville',       Label: 'Ville',     Sortable: true, Width: '160px' },
      { Key: 'natureLabel', Label: 'Nature',    Width: '160px' },
      { Key: 'typeBienLabel', Label: 'Type de bien', Width: '160px' },
      { Key: 'surface',     Label: 'Surface (m2)', Width: '120px',
        Format: (pValue: unknown): string => pValue ? `${pValue} m2` : '' },
      { Key: 'statutLabel', Label: 'Statut',    Width: '140px' },
      { Key: 'etatCommercialLabel', Label: 'Etat commercial', Width: '160px' },
      { Key: 'candidats',   Label: 'Candidats', Width: '220px',
        Format: (_pValue: unknown, pRow: IPortefeuilleRow): string => {
          // [cm] V2 §5.2 : affiche le resume matching pour transaction/location, vide pour property. Le resume est pre-calcule par MatchingService.ComputeResumeAsync (hook AfterCreateAsync/AfterUpdateAsync).
          if (pRow.kind === 'transaction') {
            const lTx = pRow.source as TransactionsDTO;
            return lTx.acquereurPotentiel ?? '';
          }
          if (pRow.kind === 'location') {
            const lLoc = pRow.source as LocationsDTO;
            return lLoc.locatairePotentiel ?? '';
          }
          return '';
        } },
      { Key: 'updatedAt',   Label: 'Mis a jour', Sortable: true, Width: '160px',
        Format: (pValue: unknown): string => {
          if (!pValue) { return ''; }
          const lDate: Date = new Date(pValue as string);
          return Number.isNaN(lDate.getTime()) ? '' : lDate.toLocaleDateString('fr-FR');
        } }
    ];
  }

  /**
   * Données brutes du référentiel `ref_nature_affaire` chargées par l'API.
   * - cm - Le libellé final est dérivé via `Translate.translateRefReactive('ref_nature_affaire', id)`
   * (câblage BDD `crm.ref_translations`). Le `pR.libelle` natif sert de fallback si la
   * BDD n'a pas de traduction pour la langue courante (ex: FR souvent non seedé).
   */
  // [cm] KAN-REF-VISUAL-STYLE : les signaux `_XxxRefs` portent aussi la navigation `style?: RefVisualStyleDTO` (FK vers crm.ref_visual_style). `_MapRefOptionsComputed` la lit pour enrichir chaque option select avec Icon/Color/Variant.
  private readonly _NatureAffaireRefs = signal<{ id?: number; code?: string; libelle?: string; style?: { icon?: string; color?: string; variant?: string } }[]>([]);

  /** Options du référentiel nature de l'affaire (select). */
  // [cm] Computed réactif au tick i18n : se re-évalue après le preloadRefTable et au changement de langue. Le libellé vient de la BDD via translateRefReactive (avec pR.libelle en fallback FR).
  public readonly NatureAffaireOptions = computed<IInputOption[]>(() => this._MapRefOptionsComputed('ref_nature_affaire', this._NatureAffaireRefs()));

  /** Données brutes `ref_type_bien`. */
  private readonly _TypeBienRefs = signal<{ id?: number; code?: string; libelle?: string; style?: { icon?: string; color?: string; variant?: string } }[]>([]);

  /** Options du référentiel type de bien (select). */
  public readonly TypeBienOptions = computed<IInputOption[]>(() => this._MapRefOptionsComputed('ref_type_bien', this._TypeBienRefs()));

  /** Données brutes `ref_statut_affaire`. */
  private readonly _StatutAffaireRefs = signal<{ id?: number; code?: string; libelle?: string; style?: { icon?: string; color?: string; variant?: string } }[]>([]);

  /** Options du référentiel statut de l'affaire (select). */
  public readonly StatutOptions = computed<IInputOption[]>(() => this._MapRefOptionsComputed('ref_statut_affaire', this._StatutAffaireRefs()));

  /** Données brutes `ref_etat_commercial`. */
  private readonly _EtatCommercialRefs = signal<{ id?: number; code?: string; libelle?: string; style?: { icon?: string; color?: string; variant?: string } }[]>([]);

  /** Options du référentiel état commercial (select). */
  public readonly EtatCommercialOptions = computed<IInputOption[]>(() => this._MapRefOptionsComputed('ref_etat_commercial', this._EtatCommercialRefs()));

  /** Données brutes `ref_motif_blocage`. */
  private readonly _MotifBlocageRefs = signal<{ id?: number; code?: string; libelle?: string; style?: { icon?: string; color?: string; variant?: string } }[]>([]);

  /** Options du référentiel motif de blocage (select). */
  public readonly MotifBlocageOptions = computed<IInputOption[]>(() => this._MapRefOptionsComputed('ref_motif_blocage', this._MotifBlocageRefs()));

  /** Options des contacts (select, label = prenom + nom). Utilisé pour les FK clientId/proprietaireId des grilles Biens. */
  public readonly ContactOptions = signal<IInputOption[]>([]);

  /**
   * Options des biens (properties) exposées à la grille Transactions via `RefOptions.Property`.
   * - cm - 2026-08-11 : permet à l'utilisateur de choisir le bien lié à une transaction
   * depuis la colonne `propertyId` (autocomplete 'select-search'). Le label combine
   * la référence, la ville et le type de bien pour aider au choix.
   */
  public readonly BienOptions = computed<IInputOption[]>(() =>
    this.Properties().map((pBien: PropertiesDTO): IInputOption => {
      const lReference: string = pBien.reference ?? `#${pBien.id ?? ''}`;
      const lVille: string = pBien.adresse?.city ?? '';
      const lType: string = pBien.typeBien?.libelle ?? '';
      const lSurface: number = pBien.surface ?? 0;
      const lSurfaceStr: string = lSurface > 0 ? ` · ${lSurface} m²` : '';
      const lVilleStr: string = lVille ? ` (${lVille})` : '';
      const lTypeStr: string = lType ? ` · ${lType}` : '';
      return {
        Value: pBien.id ?? 0,
        Label: `${lReference}${lVilleStr}${lTypeStr}${lSurfaceStr}`
      };
    })
  );

  /** Options consolidÃ©es injectÃ©es dans les grilles extraites (transactions + locations + properties). */
  public readonly RefOptions = computed(() => ({
    NatureAffaire: this.NatureAffaireOptions(),
    TypeBien: this.TypeBienOptions(),
    Statut: this.StatutOptions(),
    EtatCommercial: this.EtatCommercialOptions(),
    MotifBlocage: this.MotifBlocageOptions(),
    Contact: this.ContactOptions(),
    Property: this.BienOptions()
  }));

  /**
   * Marqueurs de la carte construits a partir des transactions affichees.
   * - cm - Pattern identique au dashboard CRM (`crm-dashboard.component.ts`) :
   * - cm - on construit les markers directement depuis `Transactions()` via
   * - cm - `computed()`, sans dependre de la grille via `viewChild()`. Cela evite
   * - cm - le bug de timing ou la grille n'est pas encore montee (lazy `@if`)
   * - cm - quand l'onglet deep-link n'est pas l'onglet actif au load initial.
   * - cm - Filtre les DTOs avec coordonnees GPS valides (lat/lng != 0) et applique
   * - cm - le style de marker officiel via `GetMarkerStyle(EMarkerType.Transaction)`.
   */
  public readonly TransactionMapMarkers = computed<IMapMarker[]>(() =>
    this.Transactions()
      .filter((pT: TransactionsDTO): boolean =>
      {
        const lLat: number = Number(pT.adresse?.latitude ?? 0);
        const lLng: number = Number(pT.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pT: TransactionsDTO): IMapMarker =>
      {
        const lStyle = GetMarkerStyle(EMarkerType.Transaction);
        return {
          Lat: Number(pT.adresse?.latitude ?? 0),
          Lng: Number(pT.adresse?.longitude ?? 0),
          Title: pT.reference ?? 'Transaction',
          Popup: `${pT.reference ?? ''} - ${pT.adresse?.city ?? ''}`,
          Icon: lStyle.Icon,
          Color: lStyle.Color,
          Type: EMarkerType.Transaction,
          Data: pT,
          DataId: pT.id
        };
      })
  );

  /**
   * Marqueurs de la carte construits a partir des locations affichees.
   * - cm - Voir `TransactionMapMarkers` pour l'explication du pattern (cf. dashboard).
   */
  public readonly LocationMapMarkers = computed<IMapMarker[]>(() =>
    this.Locations()
      .filter((pL: LocationsDTO): boolean =>
      {
        const lLat: number = Number(pL.adresse?.latitude ?? 0);
        const lLng: number = Number(pL.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pL: LocationsDTO): IMapMarker =>
      {
        const lStyle = GetMarkerStyle(EMarkerType.Location);
        return {
          Lat: Number(pL.adresse?.latitude ?? 0),
          Lng: Number(pL.adresse?.longitude ?? 0),
          Title: pL.reference ?? 'Location',
          Popup: `${pL.reference ?? ''} - ${pL.adresse?.city ?? ''}`,
          Icon: lStyle.Icon,
          Color: lStyle.Color,
          Type: EMarkerType.Location,
          Data: pL,
          DataId: pL.id
        };
      })
  );

  /**
   * Marqueurs de la carte construits a partir des biens (properties) affiches.
   * - cm - Voir `TransactionMapMarkers` pour l'explication du pattern (cf. dashboard).
   */
  public readonly PropertyMapMarkers = computed<IMapMarker[]>(() =>
    this.Properties()
      .filter((pP: PropertiesDTO): boolean =>
      {
        const lLat: number = Number(pP.adresse?.latitude ?? 0);
        const lLng: number = Number(pP.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pP: PropertiesDTO): IMapMarker =>
      {
        const lStyle = GetMarkerStyle(EMarkerType.Property);
        return {
          Lat: Number(pP.adresse?.latitude ?? 0),
          Lng: Number(pP.adresse?.longitude ?? 0),
          Title: pP.reference ?? 'Bien',
          Popup: `${pP.reference ?? ''} - ${pP.adresse?.city ?? ''}`,
          Icon: lStyle.Icon,
          Color: lStyle.Color,
          Type: EMarkerType.Property,
          Data: pP,
          DataId: pP.id
        };
      })
  );

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

  /** Lignes actuellement sélectionnées (transactions). */
  public readonly TransactionsSelectionnees = signal<TransactionsDTO[]>([]);

  /** Lignes actuellement sélectionnées (locations). */
  public readonly LocationsSelectionnees = signal<LocationsDTO[]>([]);

  /** Lignes actuellement sélectionnées (biens/properties). */
  public readonly ProprietesSelectionnees = signal<PropertiesDTO[]>([]);

  /** Indique si la popup de suppression en lot transactions est ouverte. */
  public readonly AfficherPopupSuppressionLotTransactions = signal(false);

  /** Indique si la popup de suppression en lot locations est ouverte. */
  public readonly AfficherPopupSuppressionLotLocations = signal(false);

  /** Indique si la popup de suppression en lot properties est ouverte. */
  public readonly AfficherPopupSuppressionLotProprietes = signal(false);

  //#region Properties - Marker sÃ©lectionnÃ© (popup grille)

  /**
   * Marker actuellement sÃ©lectionnÃ© sur l'une des cartes (transactions/locations/properties).
   * StockÃ© en signal pour piloter l'ouverture du popup grille custom.
   * - cm - Le DTO source est accessible via `selectedMarker.Data` (cast selon `selectedMarker.Type`).
   */
  public readonly SelectedMarker = signal<IMapMarker | null>(null);

  /**
   * Indique si le popup grille (post-clic marker) est ouvert.
   * SynchronisÃ© avec `SelectedMarker()`.
   */
  public readonly ShowMarkerPopup = computed(() => this.SelectedMarker() !== null);

  /** Type du marker sÃ©lectionnÃ© (pour aiguiller vers la bonne grille dans le popup). */
  public readonly SelectedMarkerType = computed<EMarkerType | null>(() => this.SelectedMarker()?.Type ?? null);

  /** DTO transaction du marker sÃ©lectionnÃ© (cast pour injection dans app-transaction-grid). */
  public readonly SelectedTransaction = computed<TransactionsDTO | null>(() => {
    const lMarker: IMapMarker | null = this.SelectedMarker();
    return lMarker?.Type === EMarkerType.Transaction ? (lMarker.Data as TransactionsDTO) : null;
  });

  /** DTO location du marker sÃ©lectionnÃ© (cast pour injection dans app-location-grid). */
  public readonly SelectedLocation = computed<LocationsDTO | null>(() => {
    const lMarker: IMapMarker | null = this.SelectedMarker();
    return lMarker?.Type === EMarkerType.Location ? (lMarker.Data as LocationsDTO) : null;
  });

  /** DTO property du marker sÃ©lectionnÃ© (cast pour injection dans app-property-grid). */
  public readonly SelectedProperty = computed<PropertiesDTO | null>(() => {
    const lMarker: IMapMarker | null = this.SelectedMarker();
    return lMarker?.Type === EMarkerType.Property ? (lMarker.Data as PropertiesDTO) : null;
  });

  //#endregion

  //#region Matching acquereurs / locataires (V2 §5)

  /**
   * Indique si la popup de candidats matching est ouverte.
   * - cm - Pilotée par les boutons "Voir candidats" ajoutes dans la popup marker
   * et eventuellement par une action de ligne "matching-acquereur" / "matching-locataire".
   */
  public readonly ShowMatchingDialog = signal<boolean>(false);

  /** Identifiant du bien source pour lequel on affiche les candidats. */
  public readonly MatchingBienId = signal<number>(0);

  /** Kind du matching courant ('acquisition' ou 'location'). */
  public readonly MatchingKind = signal<'acquisition' | 'location'>('acquisition');

  /**
   * Ouvre le dialog de candidats matching pour la transaction selectionnee dans la popup marker.
   * Ferme la popup marker au prealable pour eviter d'avoir 2 popups empilees.
   */
  public OnOpenMatchingFromTransaction(pTransactionId: number): void {
    if (!pTransactionId || pTransactionId <= 0) {
      return;
    }
    this.MatchingBienId.set(pTransactionId);
    this.MatchingKind.set('acquisition');
    this.SelectedMarker.set(null);
    this.ShowMatchingDialog.set(true);
  }

  /**
   * Ouvre le dialog de candidats matching pour la location selectionnee dans la popup marker.
   */
  public OnOpenMatchingFromLocation(pLocationId: number): void {
    if (!pLocationId || pLocationId <= 0) {
      return;
    }
    this.MatchingBienId.set(pLocationId);
    this.MatchingKind.set('location');
    this.SelectedMarker.set(null);
    this.ShowMatchingDialog.set(true);
  }

  /**
   * Ferme le dialog de candidats matching.
   */
  public OnCloseMatchingDialog(): void {
    this.ShowMatchingDialog.set(false);
    this.MatchingBienId.set(0);
  }

  /**
   * Handler de clic sur une ligne du Portefeuille global (V2 §5).
   * Ouvre le dialog de candidats matching si la ligne est une transaction
   * ou une location. Les biens (property) n'ont pas de matching : on ne
   * fait rien pour eux (clic ignoré).
   * - cm - V2 §3.1 + §5 : depuis le Portefeuille global, l'utilisateur doit
   *      pouvoir voir les candidats matching d'un bien compatible sans
   *      passer par la carte. Meme UX que la popup marker, sans marker.
   * @param pRow La ligne cliquee.
   */
  public OnPortefeuilleRowClicked(pRow: IPortefeuilleRow): void {
    if (!pRow || pRow.id <= 0) {
      return;
    }

    if (pRow.kind === 'transaction') {
      this.OnOpenMatchingFromTransaction(pRow.id);
    } else if (pRow.kind === 'location') {
      this.OnOpenMatchingFromLocation(pRow.id);
    }
    // - cm - Property : pas de matching (kind intermediaire sans nature achat/location).
  }

  //#endregion

  //#region CTOR
  /**
   * Constructeur : les marqueurs de carte sont calcules via `computed()` directement
   * - cm - depuis les signaux `Transactions()` / `Locations()` / `Properties()`
   * - cm - (pattern identique au dashboard CRM), donc aucun `effect()` n'est requis.
   */
  public constructor()
  {
    super();
  }
  //#endregion

  //#region Lifecycle
  /** @inheritdoc */
  public ngOnInit(): void {
    if (isPlatformBrowser(this._PlatformId)) {
      // - cm - Lazy-load du sous-registre de page Tâches.
      void this.Translate.loadPageTranslations('crm.biens');
      // [cm] Précharge les 5 tables de traductions BDD consommées par les dropdowns des grids Transactions / Locations / Properties. Le service se charge de re-précharger automatiquement au changement de langue (onLangChange).
      void this.Translate.preloadRefTable('ref_nature_affaire');
      void this.Translate.preloadRefTable('ref_type_bien');
      void this.Translate.preloadRefTable('ref_statut_affaire');
      void this.Translate.preloadRefTable('ref_etat_commercial');
      void this.Translate.preloadRefTable('ref_motif_blocage');
      void this.LoadAll();
    }
  }

  //#endregion

  //#region Methods - Chargement
  /**
   * Charge toutes les donnÃ©es de la page Biens.
   * Les rÃ©fÃ©rentiels sont chargÃ©s EN PREMIER car les valeurs par dÃ©faut des nouvelles lignes
   * dÃ©pendent des options de rÃ©fÃ©rence (natureAffaireId, statutId, etatCommercialId).
   */
  public async LoadAll(): Promise<void> {
    this.Loading.set(true);
    this.Error.set(null);
    try {
      // - cm - Charge les referentiels EN PREMIER pour que les valeurs par defaut soient disponibles
      await this.LoadRefOptions();
      // [cm] KAN-GRID-TRAN : la grille Transactions gère son propre chargement server-side via <app-transaction-grid [ServerSide]="true"> (ngOnInit -> LoadCurrentPage). On garde uniquement Locations et Properties en chargement client depuis le parent.
      await Promise.all([
        this.LoadLocationsData(),
        this.LoadPropertiesData()
      ]);
    } catch (pErr) {
      this.Error.set('Impossible de charger les donnÃ©es.');
      console.error('Erreur LoadAll Biens', pErr);
    } finally {
      this.Loading.set(false);
    }
  }

  /**
   * Charge la fiche ParametresDTO de l utilisateur courant.
   * - cm - 2026-08-11 : le champ `commissionParDefautPct` a ete retire du schema
   *   crm.parametres (cf. DTO + MCP). La methode reste pour eviter de toucher
   *   l'appelant LoadAll mais ne fait plus rien d'utile. DefaultHonorairesPct
   *   reste a undefined et la cellule est saisie manuellement.
   */
  public async LoadParametres(): Promise<void>
  {
    // - cm - No-op post-retrait de commissionParDefautPct.
  }

  /**
     * Charge les options des référentiels en parallèle (nature, type bien, statut, état commercial, motif blocage, contacts).
     * - cm - Alimente les signaux `_XxxRefs`. Les `XxxOptions` (computed) dérivent
     * automatiquement les IInputOption[] avec le label traduit via
     * `translateRefReactive` + fallback `pR.libelle` FR. Côté contacts : pas de
     * ref_translations, on garde le mapping natif `MapContactOptions`.
     *
     *      KAN-REF-VISUAL-STYLE : pour les 5 ref tables (nature/type/statut/etat/motif),
     *      on passe `{ style: {}, includeStyleEmpty: true }` pour forcer le
     *      `.Include(r => r.Style)` côté EF Core. La navigation `style` (icon, color,
     *      variant) sert ensuite à enrichir chaque option select avec une pastille.
     */
  public async LoadRefOptions(): Promise<void> {
      try {
        const lIncludeStyle = { style: {}, includeStyleEmpty: true };
        const [lNatures, lTypes, lStatuts, lEtats, lMotifs, lContacts] = await Promise.all([
          this._NatureAffaireService.getAll(lIncludeStyle as RefNatureAffaireCritereDTO),
          this._TypeBienService.getAll(lIncludeStyle as RefTypeBienCritereDTO),
          this._StatutAffaireService.getAll(lIncludeStyle as RefStatutAffaireCritereDTO),
          this._EtatCommercialService.getAll(lIncludeStyle as RefEtatCommercialCritereDTO),
          this._MotifBlocageService.getAll(lIncludeStyle as RefMotifBlocageCritereDTO),
          this._ContactsService.getAll()
        ]);
        this._NatureAffaireRefs.set(lNatures ?? []);
        this._TypeBienRefs.set(lTypes ?? []);
        this._StatutAffaireRefs.set(lStatuts ?? []);
        this._EtatCommercialRefs.set(lEtats ?? []);
        this._MotifBlocageRefs.set(lMotifs ?? []);
        this.ContactOptions.set(this.MapContactOptions(lContacts));
      } catch (pErr) {
        console.error('Erreur chargement référentiels Biens', pErr);
      }
  }

  /**
   * Helper privé : mappe une liste de référentiels en options select { Value, Label }
   * en lisant le libellé via la BDD `crm.ref_translations` (via `translateRefReactive`)
   * avec fallback sur `pR.libelle` natif FR si la BDD n'a pas la traduction pour la
   * langue courante. - cm - Doit être appelé depuis un `computed()` pour que
   * `InstantTick` soit effectif (re-déclenche au changement de langue).
   * @param pRefTable Nom logique du référentiel (`ref_nature_affaire`, `ref_type_bien`, etc.).
   * @param pRefs Données brutes chargées par le service de référentiel (id/code/libelle).
   * @returns Les options formatées pour les grilles et les filtres.
   */
  private _MapRefOptionsComputed(pRefTable: string, pRefs: { id?: number; code?: string; libelle?: string; style?: { icon?: string; color?: string; variant?: string } }[]): IInputOption[] {
    // - cm - S'abonne au tick i18n (re-render sur TranslationLoaded / LanguageChanged).
    this.Translate.InstantTick();
    return (pRefs ?? [])
      .filter(pR => pR.id !== undefined)
      .map(pR => {
        const lLabel: string = pR.id !== undefined
          ? this.Translate.translateRefReactive(pRefTable, pR.id, pR.libelle ?? null)
          : '';
        // [cm] KAN-REF-VISUAL-STYLE : forme unique `style: RefVisualStyleDTO` (cf. `crm.ref_visual_style`).
        const lOpt: IInputOption = { Value: pR.id as number, Label: lLabel };
        if (pR.style) {
          lOpt.style = pR.style;
        }
        return lOpt;
      });
  }

  /**
   * Mappe une liste de contacts en options select { Value, Label } (label = prenom + nom).
   * Exclut les contacts sans id ou dont le label complet (prenom + nom) est vide.
   * @param pContacts La liste des contacts.
   * @returns Les options formatÃ©es pour le grid (ex : clientId, proprietaireId).
   */
  private MapContactOptions(pContacts: ContactsDTO[] | undefined): IInputOption[] {
    return (pContacts ?? [])
      .filter(pC => pC.id !== undefined)
      .map(pC => ({ Value: pC.id as number, Label: `${pC.prenom ?? ''} ${pC.nom ?? ''}`.trim() }))
      // - cm - Filtre les contacts dont ni prenom ni nom n'est renseignÃ© (label vide)
      .filter(pOpt => (pOpt.Label as string).length > 0);
  }

  /**
   * Charge les transactions depuis le service.
   */
  private async LoadTransactionsData(): Promise<void> {
    const lTransactions = await this._TransactionsService.getAll({
      page: 1,
      pageSize: 100,
      adresse: {}
    } as TransactionsCritereDTO);
    this.Transactions.set(lTransactions ?? []);
  }

  /**
   * Recharge les transactions après une opération CRUD.
   * - cm - KAN-GRID-TRAN : la grille est en mode server-side, on délègue
   *      le rechargement à <app-transaction-grid>.LoadCurrentPage() qui
   *      rappelle getAll(_Critere()) avec le critère courant.
   *      En mode client (rétrocompat), on garde le comportement historique
   *      via LoadTransactionsData().
   */
  public async LoadTransactions(): Promise<void> {
    const lGrid = this._TransactionGrid();
    if (lGrid) {
      await lGrid.LoadCurrentPage();
      return;
    }
    this.Loading.set(true);
    this.Error.set(null);
    try {
      await this.LoadTransactionsData();
    } catch (pErr) {
      this.Error.set('Impossible de charger les transactions.');
      console.error(pErr);
    } finally {
      this.Loading.set(false);
    }
  }

  /**
   * Charge les locations depuis le service.
   */
  private async LoadLocationsData(): Promise<void> {
    const lLocations = await this._LocationsService.getAll({
      page: 1,
      pageSize: 100,
      adresse: {}
    } as LocationsCritereDTO);
    this.Locations.set(lLocations ?? []);
  }

  /**
   * Charge les locations depuis le service (public, utilisÃ© aprÃ¨s delete/add).
   */
  public async LoadLocations(): Promise<void> {
    this.Loading.set(true);
    this.Error.set(null);
    try {
      await this.LoadLocationsData();
    } catch (pErr) {
      this.Error.set('Impossible de charger les locations.');
      console.error(pErr);
    } finally {
      this.Loading.set(false);
    }
  }

  /**
   * Charge les biens (properties) depuis le service.
   */
  private async LoadPropertiesData(): Promise<void> {
    const lProperties = await this._PropertiesService.getAll({
      page: 1,
      pageSize: 100,
      adresse: {}
    } as PropertiesCritereDTO);
    this.Properties.set(lProperties ?? []);
  }

  /**
   * Charge les biens (properties) depuis le service (public, utilisÃ© aprÃ¨s delete/add).
   */
  public async LoadProperties(): Promise<void> {
    this.Loading.set(true);
    this.Error.set(null);
    try {
      await this.LoadPropertiesData();
    } catch (pErr) {
      this.Error.set('Impossible de charger les biens.');
      console.error(pErr);
    } finally {
      this.Loading.set(false);
    }
  }

  //#endregion

  //#region Methods - Onglets
  /**
   * GÃ¨re le changement d'onglet (Transactions / Locations).
   * @param pTabId L'identifiant de l'onglet sÃ©lectionnÃ©.
   */
  public OnTabChange(pTabId: string): void {
    this.ActiveTab.set(pTabId as EBiensTab);
  }

  /**
   * Suivi des lignes du Portefeuille global pour le ngFor (cle composite kind+id
   * pour eviter toute collision entre les 3 sources).
   * @param pRow La ligne agregree.
   * @returns L'identifiant composite en chaine.
   */
  public TrackByPortefeuille(pRow: IPortefeuilleRow): string {
    return `${pRow.kind}-${pRow.id}`;
  }
  //#endregion

  //#region Methods - Handlers grille Transactions
  /**
   * Gère le clic sur une action de ligne transaction (edit/delete).
   * @param pEvent L'événement d'action.
   */
  public SurTransactionActionClic(pEvent: GridActionEvent<TransactionsDTO>): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_transaction_action', 'tracking'), { action: pEvent.Action });
    if (pEvent.Action === 'delete') {
      this.RowToDeleteTransaction.set(pEvent.Row);
      this.ShowDeleteTransactionPopup.set(true);
    }
  }

  /**
   * Hook post-création : capture PostHog + re-fetch server-side.
   * - cm - Appelé par `(RowCreated)` du wrapper `transaction-grid`. La création
   *      BDD a déjà eu lieu dans `GridComponentBase.OnRowAdded` (cf.
   *      KAN-GRID-AUTO-ADD-ROW).
   * @param _pRow La ligne créée.
   */
  public async SurTransactionCreee(_pRow: TransactionsDTO): Promise<void> {
    await this.LoadTransactions();
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_transaction_add', 'tracking'));
  }

  /**
   * Confirme la suppression d'une transaction depuis la popup.
   */
  public async OnConfirmDeleteTransaction(): Promise<void> {
    const lRow: TransactionsDTO | null = this.RowToDeleteTransaction();
    if (!lRow || !lRow.id) {
      this.ShowDeleteTransactionPopup.set(false);
      this.RowToDeleteTransaction.set(null);
      return;
    }
    this.Deleting.set(true);
    try {
      await this._TransactionsService.delete({ id: lRow.id });
      await this.LoadTransactions();
      this.PostHog.Capture(this.BuildTrackingName('crm_biens_transaction_delete', 'tracking'));
    } catch (pErr) {
      console.error('Erreur suppression transaction', pErr);
      this.Error.set('Impossible de supprimer la transaction.');
    } finally {
      this.Deleting.set(false);
      this.ShowDeleteTransactionPopup.set(false);
      this.RowToDeleteTransaction.set(null);
    }
  }

  /**
   * Annule la suppression d'une transaction (ferme la popup).
   */
  public OnCancelDeleteTransaction(): void {
    this.ShowDeleteTransactionPopup.set(false);
    this.RowToDeleteTransaction.set(null);
  }

  /**
   * Handler (ServerSideLoaded) émis par <app-transaction-grid> après chaque
   * chargement server-side réussi. Synchronise le signal `Transactions()`
   * (utilisé par le computed `PortefeuilleRows` pour le tab Portefeuille global).
   * - cm - KAN-GRID-TRAN : la grille est désormais la source de vérité des
   *      données transactions. Le parent alimente uniquement son signal
   *      miroir pour les vues qui en dépendent (Portefeuille, markers carte).
   * @param pData DTOs transactions chargés par la grille.
   */
  public SurTransactionServerSideCharge(pData: TransactionsDTO[]): void {
    this.Transactions.set(pData ?? []);
  }

  /**
   * Handler (ServerSideError) émis par <app-transaction-grid> en cas
   * d'échec de chargement server-side. Propage au banner d'erreur global.
   * - cm - KAN-GRID-TRAN : la grille affiche son propre état Error inline
   *      (via [Error] sur <app-grid>). On duplique ici pour le bandeau
   *      parent (cohérent avec le mode client où Error est set dans
   *      LoadTransactions()).
   * @param pMessage Message d'erreur lisible.
   */
  public SurTransactionServerSideErreur(pMessage: string): void {
    this.Error.set(pMessage);
  }

  /** Mémorise la sélection courante de transactions. */
  public SurTransactionsSelectionnees(pRows: TransactionsDTO[]): void {
    this.TransactionsSelectionnees.set(pRows);
  }

  /** Ouvre la popup de confirmation de suppression en lot (transactions). */
  public SurDemanderSuppressionLotTransactions(): void {
    if (this.TransactionsSelectionnees().length === 0) {
      return;
    }
    this.AfficherPopupSuppressionLotTransactions.set(true);
  }

  /** Annule la suppression en lot (transactions). */
  public SurAnnulerSuppressionLotTransactions(): void {
    this.AfficherPopupSuppressionLotTransactions.set(false);
  }

  /** Confirme la suppression en lot (transactions). */
  public async SurConfirmerSuppressionLotTransactions(): Promise<void> {
    const lRows: TransactionsDTO[] = this.TransactionsSelectionnees();
    const lIds: number[] = lRows
      .map((pR) => pR.id)
      .filter((pId): pId is number => typeof pId === 'number' && pId > 0);
    if (lIds.length === 0) {
      this.AfficherPopupSuppressionLotTransactions.set(false);
      return;
    }
    this.Deleting.set(true);
    let lOk = 0;
    let lFail = 0;
    const lResults = await Promise.allSettled(
      lIds.map((pId) => this._TransactionsService.delete({ id: pId }))
    );
    lOk = lResults.filter((pR) => pR.status === 'fulfilled').length;
    lFail = lResults.filter((pR) => pR.status === 'rejected').length;
    this.Deleting.set(false);
    this.AfficherPopupSuppressionLotTransactions.set(false);
    this._TransactionGrid()?.ClearSelection();
    this.TransactionsSelectionnees.set([]);
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_transactions_bulk_delete', 'tracking'), {
      count: lIds.length,
      success: lOk,
      failed: lFail
    });
    await this.LoadTransactions();
  }
  //#endregion

  //#region Methods - Handlers grille Locations
  /**
   * Gère le clic sur une action de ligne location (edit/delete).
   * @param pEvent L'événement d'action.
   */
  public SurLocationActionClic(pEvent: GridActionEvent<LocationsDTO>): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_location_action', 'tracking'), { action: pEvent.Action });
    if (pEvent.Action === 'delete') {
      this.RowToDeleteLocation.set(pEvent.Row);
      this.ShowDeleteLocationPopup.set(true);
    }
  }

  /**
   * Hook post-création : capture PostHog + re-fetch server-side.
   * - cm - Appelé par `(RowCreated)` du wrapper `location-grid`. La création
   *      BDD a déjà eu lieu dans `GridComponentBase.OnRowAdded` (cf.
   *      KAN-GRID-AUTO-ADD-ROW).
   * @param _pRow La ligne créée.
   */
  public async SurLocationCreee(_pRow: LocationsDTO): Promise<void> {
    await this.LoadLocations();
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_location_add', 'tracking'));
  }

  /**
   * Confirme la suppression d'une location depuis la popup.
   */
  public async OnConfirmDeleteLocation(): Promise<void> {
    const lRow: LocationsDTO | null = this.RowToDeleteLocation();
    if (!lRow || !lRow.id) {
      this.ShowDeleteLocationPopup.set(false);
      this.RowToDeleteLocation.set(null);
      return;
    }
    this.Deleting.set(true);
    try {
      await this._LocationsService.delete({ id: lRow.id });
      await this.LoadLocations();
      this.PostHog.Capture(this.BuildTrackingName('crm_biens_location_delete', 'tracking'));
    } catch (pErr) {
      console.error('Erreur suppression location', pErr);
      this.Error.set('Impossible de supprimer la location.');
    } finally {
      this.Deleting.set(false);
      this.ShowDeleteLocationPopup.set(false);
      this.RowToDeleteLocation.set(null);
    }
  }

  /**
   * Annule la suppression d'une location (ferme la popup).
   */
  public OnCancelDeleteLocation(): void {
    this.ShowDeleteLocationPopup.set(false);
    this.RowToDeleteLocation.set(null);
  }

  /** Mémorise la sélection courante de locations. */
  public SurLocationsSelectionnees(pRows: LocationsDTO[]): void {
    this.LocationsSelectionnees.set(pRows);
  }

  /** Ouvre la popup de confirmation de suppression en lot (locations). */
  public SurDemanderSuppressionLotLocations(): void {
    if (this.LocationsSelectionnees().length === 0) {
      return;
    }
    this.AfficherPopupSuppressionLotLocations.set(true);
  }

  /** Annule la suppression en lot (locations). */
  public SurAnnulerSuppressionLotLocations(): void {
    this.AfficherPopupSuppressionLotLocations.set(false);
  }

  /** Confirme la suppression en lot (locations). */
  public async SurConfirmerSuppressionLotLocations(): Promise<void> {
    const lRows: LocationsDTO[] = this.LocationsSelectionnees();
    const lIds: number[] = lRows
      .map((pR) => pR.id)
      .filter((pId): pId is number => typeof pId === 'number' && pId > 0);
    if (lIds.length === 0) {
      this.AfficherPopupSuppressionLotLocations.set(false);
      return;
    }
    this.Deleting.set(true);
    let lOk = 0;
    let lFail = 0;
    const lResults = await Promise.allSettled(
      lIds.map((pId) => this._LocationsService.delete({ id: pId }))
    );
    lOk = lResults.filter((pR) => pR.status === 'fulfilled').length;
    lFail = lResults.filter((pR) => pR.status === 'rejected').length;
    this.Deleting.set(false);
    this.AfficherPopupSuppressionLotLocations.set(false);
    this._LocationGrid()?.ClearSelection();
    this.LocationsSelectionnees.set([]);
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_locations_bulk_delete', 'tracking'), {
      count: lIds.length,
      success: lOk,
      failed: lFail
    });
    await this.LoadLocations();
  }
  //#endregion

  //#region Methods - Handlers grille Properties
  /**
   * Gère le clic sur une action de ligne bien (property) (edit/delete).
   * @param pEvent L'événement d'action.
   */
  public SurProprieteActionClic(pEvent: GridActionEvent<PropertiesDTO>): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_property_action', 'tracking'), { action: pEvent.Action });
    if (pEvent.Action === 'delete') {
      this.RowToDeleteProperty.set(pEvent.Row);
      this.ShowDeletePropertyPopup.set(true);
    }
  }

  /**
   * Hook post-création : capture PostHog + re-fetch server-side.
   * - cm - Appelé par `(RowCreated)` du wrapper `property-grid`. La création
   *      BDD a déjà eu lieu dans `GridComponentBase.OnRowAdded` (cf.
   *      KAN-GRID-AUTO-ADD-ROW).
   * @param _pRow La ligne créée.
   */
  public async SurProprieteCreee(_pRow: PropertiesDTO): Promise<void> {
    await this.LoadProperties();
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_property_add', 'tracking'));
  }

  /**
   * Confirme la suppression d'un bien (property) depuis la popup.
   */
  public async OnConfirmDeleteProperty(): Promise<void> {
    const lRow: PropertiesDTO | null = this.RowToDeleteProperty();
    if (!lRow || !lRow.id) {
      this.ShowDeletePropertyPopup.set(false);
      this.RowToDeleteProperty.set(null);
      return;
    }
    this.Deleting.set(true);
    try {
      await this._PropertiesService.delete({ id: lRow.id });
      await this.LoadProperties();
      this.PostHog.Capture(this.BuildTrackingName('crm_biens_property_delete', 'tracking'));
    } catch (pErr) {
      console.error('Erreur suppression property', pErr);
      this.Error.set('Impossible de supprimer le bien.');
    } finally {
      this.Deleting.set(false);
      this.ShowDeletePropertyPopup.set(false);
      this.RowToDeleteProperty.set(null);
    }
  }

  /**
   * Annule la suppression d'un bien (property) (ferme la popup).
   */
  public OnCancelDeleteProperty(): void {
    this.ShowDeletePropertyPopup.set(false);
    this.RowToDeleteProperty.set(null);
  }

  /** Mémorise la sélection courante de biens (properties). */
  public SurProprietesSelectionnees(pRows: PropertiesDTO[]): void {
    this.ProprietesSelectionnees.set(pRows);
  }

  /** Ouvre la popup de confirmation de suppression en lot (biens/properties). */
  public SurDemanderSuppressionLotProprietes(): void {
    if (this.ProprietesSelectionnees().length === 0) {
      return;
    }
    this.AfficherPopupSuppressionLotProprietes.set(true);
  }

  /** Annule la suppression en lot (biens/properties). */
  public SurAnnulerSuppressionLotProprietes(): void {
    this.AfficherPopupSuppressionLotProprietes.set(false);
  }

  /** Confirme la suppression en lot (biens/properties). */
  public async SurConfirmerSuppressionLotProprietes(): Promise<void> {
    const lRows: PropertiesDTO[] = this.ProprietesSelectionnees();
    const lIds: number[] = lRows
      .map((pR) => pR.id)
      .filter((pId): pId is number => typeof pId === 'number' && pId > 0);
    if (lIds.length === 0) {
      this.AfficherPopupSuppressionLotProprietes.set(false);
      return;
    }
    this.Deleting.set(true);
    let lOk = 0;
    let lFail = 0;
    const lResults = await Promise.allSettled(
      lIds.map((pId) => this._PropertiesService.delete({ id: pId }))
    );
    lOk = lResults.filter((pR) => pR.status === 'fulfilled').length;
    lFail = lResults.filter((pR) => pR.status === 'rejected').length;
    this.Deleting.set(false);
    this.AfficherPopupSuppressionLotProprietes.set(false);
    this._PropertyGrid()?.ClearSelection();
    this.ProprietesSelectionnees.set([]);
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_properties_bulk_delete', 'tracking'), {
      count: lIds.length,
      success: lOk,
      failed: lFail
    });
    await this.LoadProperties();
  }
  //#endregion

  //#region Methods - Marker click (popup grille custom)

  /**
   * GÃ¨re le clic sur un marker d'une des cartes (transactions/locations/properties).
   * Stocke le marker sÃ©lectionnÃ© et ouvre le popup custom affichant la grille
   * correspondante avec une seule ligne (celle du DTO).
   * @param pMarker Le marker cliquÃ© (contient `Type` et `Data`).
   */
  public OnMarkerClick(pMarker: IMapMarker): void {
    this.PostHog.Capture(this.BuildTrackingName('crm_biens_marker_click', 'tracking'), {
      type: pMarker.Type,
      id: (pMarker.Data as { id?: number } | undefined)?.id ?? pMarker.DataId
    });
    this.SelectedMarker.set(pMarker);
  }

  /**
   * Ferme le popup grille (appelÃ© sur cancel/close/closed du popup).
   * RÃ©initialise aussi la sÃ©lection interne des MapCard pour synchroniser l'Ã©tat.
   */
  public OnMarkerPopupClosed(): void {
    const lMarker: IMapMarker | null = this.SelectedMarker();
    this.SelectedMarker.set(null);
    if (lMarker) {
      this.PostHog.Capture(this.BuildTrackingName('crm_biens_marker_popup_close', 'tracking'), { type: lMarker.Type });
    }
  }

  //#endregion
}
