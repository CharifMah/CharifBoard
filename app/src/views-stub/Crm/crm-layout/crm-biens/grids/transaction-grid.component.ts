import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  inject,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  signal,
  Signal
} from '@angular/core';
import { GridComponent, GridCellEditedEvent, GridActionEvent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { IInputOption } from '@shared/components/input/input.types';
import { TransactionsDTO } from '@core/crm/dto/transactions/transactions.dto';
import { TransactionsCritereDTO } from '@core/crm/dto/transactions/transactions.critere';
import { GetTransactionsFieldValidator, TransactionsValidator } from '@core/crm/dto/transactions/transactions.validator';
import { IMapMarker } from '@shared/components/map-card/IMapMarker';
import { EMarkerType } from '@shared/components/map-card/EMarkerType';
import { GetMarkerStyle } from '@shared/components/map-card/map-marker-style';
import { TransactionsService } from '@core/crm/services/transactions/transactions.service';

import { BaseDTO } from '@base/BaseDTO';
// [cm] L'ancienne `GridI18nMixin` a été supprimée : sa logique i18n (`_Translation`, `TranslateKey()`, `T()`) est portée par `GridComponentBase`.
import { GridComponentBase } from '@shared/components/grid/grid-component-base';

/**
 * Grille CRUD Transactions extraite de la page Biens.
 * Composant autonome réutilisable (chat, autres pages).
 */
@Component({
  selector: 'app-transaction-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective],
  templateUrl: './transaction-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionGridComponent extends GridComponentBase<TransactionsDTO, TransactionsCritereDTO> implements OnChanges, OnInit {
  //#region Attributes
  /**
   * Service Transactions injecté pour le mode server-side. Pilote : la grille
   * fait elle-même son `getAll(critere)` quand `[ServerSide]="true"`. En mode
   * client (rétrocompat), le parent garde la responsabilité du chargement.
   */
  private readonly _TransactionsService: TransactionsService = inject(TransactionsService);
  //#endregion

  //#region Properties
  /** Préfixe de référence (transaction). */
  protected readonly PREFIX: string = 'TRX';
  //#endregion

  //#region Inputs
  // Data, Loading, ServerSide, CritereInit : portés par GridComponentBase.

  /**
   * Active la barre de filtre au-dessus de la grille. Désactivée par défaut dans les popups
   * (marker, agent chat) où la grille n'affiche qu'une ligne de détail ou un résultat de lecture.
   */
  @Input() public Filterable: boolean = true;

  /** Active la sélection de lignes via checkboxes (défaut: false). Proxy vers app-grid. */
  @Input() public Selectable: boolean = false;
  /**
   * Mode lecture seule : désactive l'édition inline, l'ajout de ligne, et les actions edit/delete.
   */
  @Input() public override set ReadOnly(pValue: boolean) {
    this._ReadOnly = pValue;
  }
  /**
   * StorageKey pour la persistance des colonnes (largeur, visibilité, ordre).
   */
  @Input() public override StorageKey: string = 'crm-biens-transactions-grid';

  /**
   * Options des référentiels (chargées par le parent).
   * Mise à jour : déclenche la sync des FilterFields et EditorOptions.
   *
   */
  @Input() public RefOptions: {
    NatureAffaire: IInputOption[];
    Statut: IInputOption[];
    EtatCommercial: IInputOption[];
    MotifBlocage: IInputOption[];
    Contact: IInputOption[];
    Property: IInputOption[];
  } | null = null;

  /** Mode lecture seule hérité de `GridBase`. */

  /**
   * Pourcentage d'honoraires par defaut a pre-remplir sur une nouvelle ligne,
   * issu de la fiche ParametresDTO de l utilisateur courant (champ commissionParDefautPct).
   * Si null/undefined, la cellule honorairesPct reste vide (saisie manuelle).
   */
  @Input() public DefaultHonorairesPct: number | undefined;
  //#endregion

  //#region Outputs
  /** Émis après édition inline d'une cellule. Le parent gère la persistance. */
  @Output() public readonly CellEdited = new EventEmitter<GridCellEditedEvent<TransactionsDTO>>();

  /** Émis après clic sur une action de ligne (edit/delete). */
  @Output() public readonly ActionClicked = new EventEmitter<GridActionEvent<TransactionsDTO>>();

  /** Émis quand la sélection change (si Selectable=true). */
  @Output() public readonly SelectionChanged = new EventEmitter<TransactionsDTO[]>();

  /** RowAdded : porté par GridComponentBase (cf. KAN-GRID-AUTO-ADD-ROW). */
  //#endregion

  //#region ViewChild
  /** Référence vers la grid interne pour SetRowSaving/ClearRowSaving côté parent. */
  @ViewChild(GridComponent) public Grid!: GridComponent<TransactionsDTO>;
  //#endregion

  //#region Properties (computed/locales)
  /**
   * Lit la valeur d'une clé i18n en s'abonnant au tick de chargement.
   * - cm - Pattern identique au dashboard CRM (cf. crm-dashboard.component.ts) :
   *   on appelle InstantTick() pour que le computed se re-invalide à chaque
   *   chargement de JSON ou changement de langue. Pas de NG0600 car InstantTick
   *   est un signal Angular distinct.
   * @param pKey Clé i18n à résoudre (ex: 'transactions.reference').
   * @returns Chaîne traduite (ou la clé brute si non trouvée).
   */
  protected override TranslateKey(pKey: string): string {
    this.Translate.InstantTick(); // - cm - Abonnement réactif au tick
    return this.Translate.translate(pKey);
  }

  /** Texte vide affiché quand la grille n'a aucune ligne. */
  public readonly EmptyText: Signal<string> = computed<string>(() =>
    this.TranslateKey('grid.empty')
  );

  /** Libellé de l'action "Modifier" dans le menu de ligne. */
  public readonly EditActionLabel: Signal<string> = computed<string>(() =>
    this.TranslateKey('grid.actions.edit')
  );

  /** Libellé de l'action "Supprimer" dans le menu de ligne. */
  public readonly DeleteActionLabel: Signal<string> = computed<string>(() =>
    this.TranslateKey('grid.actions.delete')
  );

  // ---- Labels de colonnes (réactifs) ----

  /** Libellé colonne Référence. */
  public readonly ColReference: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.reference')
  );

  /**
   * Libellé colonne Bien (propertyId).
   * - cm - 2026-08-11 : ajouté pour permettre à l'utilisateur de choisir le bien
   * lié à la transaction depuis la grille (autocomplete 'select-search').
   */
  public readonly ColBien: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.property_id')
  );

  /** Libellé colonne Adresse. */
  public readonly ColAdresse: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.adresse_id')
  );

  /** Libellé colonne Ville (sous-colonne visuelle de l'adresse). */
  public readonly ColVille: Signal<string> = computed<string>(() =>
    this.TranslateKey('crm-biens.filter.ville')
  );

  /** Libellé colonne Nature de l'affaire. */
  public readonly ColNatureAffaire: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.nature_affaire_id')
  );

  /** Libellé colonne Surface. */
  public readonly ColSurface: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.surface')
  );

  /** Suffixe d'unité pour la surface (m²). */
  public readonly UnitM2: Signal<string> = computed<string>(() =>
    this.TranslateKey('crm-common.unit.m2')
  );

  /** Libellé colonne Statut. */
  public readonly ColStatut: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.statut_id')
  );

  /** Libellé colonne État commercial. */
  public readonly ColEtatCommercial: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.etat_commercial_id')
  );

  /** Libellé colonne Motif de blocage. */
  public readonly ColMotifBlocage: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.motif_blocage_id')
  );

  /** Libellé colonne Client. */
  public readonly ColClient: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.client_id')
  );

  /** Libellé colonne Prix affiché. */
  public readonly ColPrixAffiche: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.prix_affiche')
  );

  /** Libellé colonne Prix final. */
  public readonly ColPrixFinal: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.prix_final')
  );

  /** Libellé colonne Honoraires %. */
  public readonly ColHonorairesPct: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.honoraires_pct')
  );

  /** Suffixe pour les pourcentages (%). */
  public readonly UnitPercent: Signal<string> = computed<string>(() =>
    this.TranslateKey('crm-common.unit.percent')
  );

  /** Libellé colonne Commission estimée. */
  public readonly ColCommissionEstimee: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.commission_estimee')
  );

  /** Libellé colonne Part réseau %. */
  public readonly ColPartReseauPct: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.part_reseau_pct')
  );

  /** Libellé colonne Part réseau montant. */
  public readonly ColPartReseauMontant: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.part_reseau_montant')
  );

  /** Libellé colonne Montant TVA. */
  public readonly ColTvaMontant: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.tva_montant')
  );

  /** Libellé colonne Revenu variable. */
  public readonly ColRevenuVariable: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.revenu_variable')
  );

  /** Libellé colonne Revenu total encaissé. */
  public readonly ColRevenuTotalEncaisse: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.revenu_total_encaisse')
  );

  /** Libellé colonne Acquéreur potentiel. */
  public readonly ColAcquereurPotentiel: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.acquereur_potentiel')
  );

  /** Libellé colonne Date d'estimation. */
  public readonly ColDateEstimation: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.date_estimation')
  );

  /** Libellé colonne Date de prise de mandat. */
  public readonly ColDatePriseMandat: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.date_prise_mandat')
  );

  /** Libellé colonne Date de commercialisation. */
  public readonly ColDateCommercialisation: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.date_commercialisation')
  );

  /** Libellé colonne Date de signature authentique. */
  public readonly ColDateSignatureAuthentique: Signal<string> = computed<string>(() =>
    this.TranslateKey('transactions.date_signature_authentique')
  );

  // ---- Labels pour le popup marker (cellules custom) ----

  /** Label "Prix :". */
  public readonly PopupLabelPrix: Signal<string> = computed<string>(() =>
    this.TranslateKey('crm-biens.marker.popup.prix')
  );

  /** Label "Surface :". */
  public readonly PopupLabelSurface: Signal<string> = computed<string>(() =>
    this.TranslateKey('crm-biens.marker.popup.surface')
  );

  /** Label "Date :". */
  public readonly PopupLabelDate: Signal<string> = computed<string>(() =>
    this.TranslateKey('crm-biens.marker.popup.date')
  );

  /**
   * Configuration des champs de filtre de la grid Transactions.
   * - cm - Calculé à partir des `computed()` de labels ci-dessus pour rester réactif
   *   aux changements de langue (et au premier chargement asynchrone du JSON i18n).
   */
  public readonly TransactionFilterFields: Signal<FilterFieldConfig[]> = computed<FilterFieldConfig[]>(() => [
    { Key: 'reference', Label: this.ColReference(), Type: 'text', MaxLength: this.GetFieldMaxLength('reference'), Placeholder: this.TranslateKey('crm-biens.filter.referencePlaceholder') },
    { Key: 'adresse', Label: this.ColVille(), Type: 'address', Placeholder: this.TranslateKey('crm-biens.filter.villePlaceholder') },
    { Key: 'statutId', Label: this.ColStatut(), Type: 'select', Options: [] },
    { Key: 'natureAffaireId', Label: this.ColNatureAffaire(), Type: 'select', Options: [] }
  ]);
  //#endregion

  //#region CTOR
  /** @inheritdoc */
  public constructor() {
    super();
  }
  //#endregion

  //#region Lifecycle
  /**
   * Déclenche le premier chargement server-side si `ServerSide=true`.
   * En mode client (rétrocompat), ne fait rien : le parent gère via [Data].
   *
   * - cm - 2026-08-12 : on attend `ngOnInit` (pas le constructor) car le
   *      pattern `_Critere = signal(this._BuildInitialCritere())` est déjà
   *      évalué au constructeur. ngOnInit permet aussi aux `@Input()`
   *      optionnels d'être déjà résolus.
   */
  public ngOnInit(): void {
    if (this.ServerSide) {
      void this.LoadCurrentPage();
    }
  }

  /**
   * Détecte les changements de RefOptions pour mettre à jour les signaux internes
   * et synchroniser les FilterFields (Options des selects).
   * @param pChanges Les changements détectés.
   */
  public ngOnChanges(pChanges: SimpleChanges): void {
    if (pChanges['RefOptions'] && this.RefOptions) {
      // [cm] 2026-08-12 : `TypeBien` n'est plus passé : la FK n'existe pas sur crm.transactions (cf. commentaire dans le type RefOptions ci-dessus). Le 7e argument `Property` correspond bien à `setRefOptions(..., pProperty)` dans BienGridBase — la liste déroulante de la colonne `propertyId` (select-search) est ainsi correctement peuplée avec les biens.
      this.setRefOptions(
        this.RefOptions.NatureAffaire,
        this.RefOptions.Statut,
        this.RefOptions.EtatCommercial,
        this.RefOptions.MotifBlocage,
        this.RefOptions.Contact,
        this.RefOptions.Property
      );
      this.SyncFilterOptions();
    }
  }
  //#endregion

  //#region Methods
  /**
   * Synchronise les options des barres de filtre avec les référentiels chargés.
   * - cm - `TransactionFilterFields` est désormais un Signal : on injecte les
   *   Options dans la valeur courante (les références Select sont reconstruites
   *   par le template via le getter de la FilterBar).
   */
  private SyncFilterOptions(): void {
    const lStatut = this.StatutOptions();
    const lNature = this.NatureAffaireOptions();
    for (const lField of this.TransactionFilterFields()) {
      if (lField.Key === 'statutId') {
        lField.Options = lStatut;
      } else if (lField.Key === 'natureAffaireId') {
        lField.Options = lNature;
      }
    }
  }

  //#region Methods - server-side : portés par GridComponentBase
  //#endregion

  /**
   * Suivi des lignes transactions pour le ngFor (utilisé par la grid).
   * @param pItem La transaction.
   * @returns L'identifiant en chaîne.
   */
  public TrackByTransaction(pItem: TransactionsDTO): string {
    return String(pItem.id ?? '');
  }

  /** Réinitialise la sélection (proxy vers GridComponent.ClearSelection). */
  public ClearSelection(): void {
    this.Grid?.ClearSelection();
  }

  /**
   * Récupère la fonction de validation pour un champ éditable de transaction.
   * @param pKey La clé du champ (nom PascalCase de la propriété DTO).
   * @returns La fonction de validation ou null si aucune règle.
   */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: TransactionsDTO) => string | null) | null {
    const lValidator = GetTransactionsFieldValidator(pKey);
    if (!lValidator) {
      return null;
    }
    return (pValue: unknown, pRow: TransactionsDTO): string | null => lValidator(pValue, pRow);
  }

  /**
   * Lit la longueur max en caractères d'un champ depuis le validator TypeScript
   * (miroir de `MaximumLength(n)` côté C# FluentValidation). Utilisé pour binder
   * `[EditorMaxLength]` sur `<app-grid-column>` et `[MaxLength]` sur la FilterField
   * sans dupliquer la valeur entre le DTO et la grid.
   * @param pKey Clé du champ (camelCase).
   * @returns La longueur max ou null si aucune règle.
   */
  public GetFieldMaxLength(pKey: string): number | null {
    const lRule: { MaxLength?: number } | undefined = TransactionsValidator[pKey];
    return lRule?.MaxLength ?? null;
  }

  /**
   * Crée un nouveau DTO transaction avec une référence unique et les champs NOT NULL remplis.
   * Les référentiels doivent être chargés avant l'appel (setRefOptions).
   * @returns Un DTO transaction prêt à être ajouté à la grille.
   */
  public CreateNewTransaction = (): TransactionsDTO => {
    // [cm] 2026-08-12 : pré-remplir les FK NOT NULL pour que le Create passe côté back (sinon 400 FluentValidation « NatureAffaireId must not be empty »).
    const lRow: TransactionsDTO = this.CreateNewRow();
    const lNatureId = this.GetDefaultNatureAffaireId();
    if (lNatureId !== undefined) { lRow.natureAffaireId = lNatureId; }
    const lStatutId = this.GetDefaultStatutId();
    if (lStatutId !== undefined) { lRow.statutId = lStatutId; }
    if (this.DefaultHonorairesPct !== undefined && this.DefaultHonorairesPct !== null) {
      lRow.honorairesPct = this.DefaultHonorairesPct;
    }
    return lRow;
  };

  //#region Cell edit persistence (overrides GridComponentBase)
  /** Expose le service Transactions à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): TransactionsService { return this._TransactionsService; }
  /**
   * Recalcule les champs dérivés d'une transaction après une édition.
   * commissionEstimee = prixReference * honorairesPct / 100.
   * revenuTotalEncaisse = honorairesEncaisses + revenuVariable.
   * Les champs dérivés sont en lecture seule (colonne non éditable).
   * Public car `crm-dashboard` recalcule les commissions hors grille éditable.
   * @param pRow La transaction à recalculer.
   */
  public override Recalculate(pRow: TransactionsDTO): void {
    const lPrixReference: number = pRow.prixFinal ?? pRow.prixAffiche ?? 0;
    const lHonorairesPct: number = pRow.honorairesPct ?? 0;
    pRow.commissionEstimee = Math.round(lPrixReference * lHonorairesPct / 100 * 100) / 100;
    const lHonorairesEncaisses: number = pRow.honorairesEncaisses ?? 0;
    const lRevenuVariable: number = pRow.revenuVariable ?? 0;
    pRow.revenuTotalEncaisse = Math.round((lHonorairesEncaisses + lRevenuVariable) * 100) / 100;
  }
  /** En server-side, recharge la page courante pour refléter l'update et le recalcul financier. */
  protected override async ReloadAfterEdit(): Promise<void> { if (this.ServerSide) { await this.LoadCurrentPage(); } }
  //#endregion

  /**
   * Construit les marqueurs de carte enrichis pour les transactions affichées.
   * @param pData La liste des transactions à mapper.
   * @returns La liste des marqueurs (uniquement pour les transactions avec adresse géocodée).
   */
  public BuildMapMarkers(pData: TransactionsDTO[]): IMapMarker[] {
    return pData
      .filter((pItem: TransactionsDTO) => {
        const lLat: number = Number(pItem.adresse?.latitude ?? 0);
        const lLng: number = Number(pItem.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pItem: TransactionsDTO) => {
        const lReference: string = pItem.reference ?? `Transaction #${pItem.id ?? ''}`;
        const lPrix: number = pItem.prixFinal ?? pItem.prixAffiche ?? 0;
        const lPrixStr: string = lPrix > 0 ? this.FormatPrice(lPrix) : '';
        // [cm] 2026-08-12 : la surface n'est plus sur crm.transactions (champ migre vers crm.properties). Affichage via le bien lie si besoin.
        const lSurfaceStr: string = '';
        const lTypeBien: string = pItem.property?.typeBien?.libelle ?? '';
        const lStatut: string = pItem.statut?.libelle ?? '';
        const lNature: string = pItem.natureAffaire?.libelle ?? '';
        const lVille: string = pItem.adresse?.city ?? '';
        const lAdresse: string = [pItem.adresse?.housenumber, pItem.adresse?.street, lVille].filter((pPart: string | undefined) => !!pPart).join(' ');
        const lDate: string = this.FormatDate(pItem.dateSignatureAuthentique ?? pItem.dateCommercialisation ?? pItem.datePriseMandat);
        const lSubtitleParts: string[] = [lNature, lTypeBien, lStatut].filter((pPart: string) => pPart !== '');
        const lPopupLines: string[] = [
          `<strong>${lReference}</strong>`,
          lAdresse,
          lPrixStr ? `${this.PopupLabelPrix()} ${lPrixStr}` : '',
          lSurfaceStr ? `${this.PopupLabelSurface()} ${lSurfaceStr}` : '',
          lDate ? `${this.PopupLabelDate()} ${lDate}` : ''
        ].filter((pPart: string) => pPart !== '');
        const lStatutLower: string = lStatut.toLowerCase();
        // [cm] Couleur de base alignée sur le dashboard (var(--sm-primary)) [cm] avec variation par statut (succès si vendu, warning si bloqué).
        const lBaseStyle = GetMarkerStyle(EMarkerType.Transaction);
        const lColor: string =
          lStatutLower.includes('sign') || lStatutLower.includes('vendu') || lStatutLower.includes('conclu') || lStatutLower.includes('termin')
            ? 'var(--sm-success)'
            : lStatutLower.includes('bloc') || lStatutLower.includes('suspend') || lStatutLower.includes('annul')
              ? '#ff9800'
              : lBaseStyle.Color;
        return {
          Lat: Number(pItem.adresse?.latitude ?? 0),
          Lng: Number(pItem.adresse?.longitude ?? 0),
          Title: lReference,
          Subtitle: lSubtitleParts.join(' · ') || undefined,
          Popup: lPopupLines.join('<br>'),
          Color: lColor,
          // - cm - Icône centralisée via GetMarkerStyle (cf. map-marker-style.ts).
          Icon: lBaseStyle.Icon,
          Label: lVille ? lVille.substring(0, 3).toUpperCase() : undefined,
          Type: EMarkerType.Transaction,
          // [cm] Stocke le DTO source pour permettre au parent d'afficher la [cm] grille complète éditable dans le popup du marker.
          Data: pItem
        };
      });
  }
  //#endregion
}
