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
import { AddressMapTooltipComponent } from '@shared/components/address-map-tooltip/address-map-tooltip.component';
import { FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { IInputOption } from '@shared/components/input/input.types';
import { LocationsDTO } from '@core/crm/dto/locations/locations.dto';
import { LocationsCritereDTO } from '@core/crm/dto/locations/locations.critere';
import { GetLocationsFieldValidator, LocationsValidator } from '@core/crm/dto/locations/locations.validator';
import { IMapMarker } from '@shared/components/map-card/IMapMarker';
import { EMarkerType } from '@shared/components/map-card/EMarkerType';
import { GetMarkerStyle } from '@shared/components/map-card/map-marker-style';
import { LocationsService } from '@core/crm/services/locations/locations.service';
import { BaseDTO } from '@base/BaseDTO';
import { GridComponentBase } from '@shared/components/grid/grid-component-base';

/**
 * Grille CRUD Locations extraite de la page Biens.
 * Composant autonome réutilisable (chat, autres pages).
 */
@Component({
  selector: 'app-location-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective, AddressMapTooltipComponent],
  templateUrl: './location-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationGridComponent extends GridComponentBase<LocationsDTO, LocationsCritereDTO> implements OnChanges, OnInit {
  //#region Attributes
  /**
   * Service Locations injecté pour le mode server-side. Pilote : la grille
   * fait elle-même son `getAll(critere)` quand `[ServerSide]="true"`. En mode
   * client (rétrocompat), le parent garde la responsabilité du chargement.
   */
  private readonly _LocationsService: LocationsService = inject(LocationsService);
  //#endregion

  //#region Properties
  /** Préfixe de référence (location). */
  protected readonly PREFIX: string = 'LOC';

  /** Suffixe d'unité pour la surface (m²). */
  public readonly UnitM2 = this.T('crm-common.unit.m2');
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
     * StorageKey pour la persistance des colonnes (largeur, visibilité, ordre).
     */
    @Input() public override StorageKey: string = 'crm-biens-locations-grid';

  /**
   * Options des référentiels (chargées par le parent).
   * Mise à jour : déclenche la sync des FilterFields et EditorOptions.
   */
  @Input() public RefOptions: {
    NatureAffaire: IInputOption[];
    Statut: IInputOption[];
    EtatCommercial: IInputOption[];
    MotifBlocage: IInputOption[];
    Contact: IInputOption[];
    Property: IInputOption[];
  } | null = null;

  /**
   * Mode lecture seule : désactive l'édition inline, l'ajout de ligne, et les actions edit/delete.
   * Utilisé par le chat agent pour afficher une liste sans permettre la modification.
   * - cm - Hérité de `GridBase` (`@Input() public set ReadOnly`). Pas besoin de
   * redéclaration ici — le décorateur `@Input()` est posé une seule fois dans la base.
   */
  //#endregion

  //#region Outputs
  /** Émis après édition inline d'une cellule. Le parent gère la persistance. */
  @Output() public readonly CellEdited = new EventEmitter<GridCellEditedEvent<LocationsDTO>>();

  /** Émis après clic sur une action de ligne (edit/delete). */
  @Output() public readonly ActionClicked = new EventEmitter<GridActionEvent<LocationsDTO>>();

  /** Émis quand la sélection change (si Selectable=true). */
  @Output() public readonly SelectionChanged = new EventEmitter<LocationsDTO[]>();

  /** RowAdded : porté par GridComponentBase (cf. KAN-GRID-AUTO-ADD-ROW). */
  //#endregion

  //#region ViewChild
  /** Référence vers la grid interne pour SetRowSaving/ClearRowSaving côté parent. */
  @ViewChild(GridComponent) public Grid!: GridComponent<LocationsDTO>;
  //#endregion

  //#region Methods - server-side : portés par GridComponentBase
  //#endregion

  //#region Lifecycle

  /**
   * Déclenche le premier chargement server-side si `ServerSide=true`.
   * En mode client (rétrocompat), ne fait rien : le parent gère via [Data].
   */
  public ngOnInit(): void {
    if (this.ServerSide) {
      void this.LoadCurrentPage();
    }
  }

  //#endregion

  //#region Properties (computed/locales)

  //#region i18n Signals (reactifs sur InstantTick)

  // ---- Labels de colonnes (réactifs) ----

  /** Libellé colonne Ville (sous-colonne visuelle de l'adresse). */
  public readonly ColVille = this.T('crm-biens.filter.ville');

  //#endregion

  /**
   * Configuration des champs de filtre (réactif via TranslateService.translate()).
   * Les labels sont résolus à chaque appel via `_Translation.translate()` qui se base
   * sur le namespace `crm-biens` (FilterFields) ou `locations` (colonnes).
   * - cm - Conservé en computed Signal pour rester réactif à InstantTick lors d'un
   * changement de langue (markForCheck via BaseComponent).
   */
  public readonly LocationFilterFields: Signal<FilterFieldConfig[]> = computed<FilterFieldConfig[]>(() => {
    this.Translate.InstantTick();
    return [
      { Key: 'reference', Label: this.Translate.translate('locations.reference'), Type: 'text', MaxLength: this.GetFieldMaxLength('reference'), Placeholder: this.Translate.translate('crm-biens.filter.referencePlaceholder') },
      { Key: 'adresse', Label: this.Translate.translate('crm-biens.filter.ville'), Type: 'address', Placeholder: this.Translate.translate('crm-biens.filter.villePlaceholder') },
      { Key: 'statutId', Label: this.Translate.translate('locations.statut_id'), Type: 'select', Options: [] },
      { Key: 'natureAffaireId', Label: this.Translate.translate('locations.nature_affaire_id'), Type: 'select', Options: [] }
    ];
  });
  //#endregion

  //#region CTOR
  /** @inheritdoc */
  public constructor() {
    super();
  }
  //#endregion

  //#region Lifecycle
  /**
   * Détecte les changements de RefOptions pour mettre à jour les signaux internes
   * et synchroniser les FilterFields (Options des selects).
   * @param pChanges Les changements détectés.
   */
  public ngOnChanges(pChanges: SimpleChanges): void {
    if (pChanges['RefOptions'] && this.RefOptions) {
      // [cm] 2026-08-12 : `TypeBien` n'est plus passé : la FK n'existe pas sur crm.locations (cf. commentaire dans le type RefOptions ci-dessus). Le 6e argument `Property` correspond bien à `setRefOptions(..., pProperty)` dans BienGridBase — la liste déroulante de la colonne `propertyId` (select-search) est ainsi correctement peuplée avec les biens.
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
   */
  private SyncFilterOptions(): void {
    const lStatut = this.StatutOptions();
    const lNature = this.NatureAffaireOptions();
    for (const lField of this.LocationFilterFields()) {
      if (lField.Key === 'statutId') {
        lField.Options = lStatut;
      } else if (lField.Key === 'natureAffaireId') {
        lField.Options = lNature;
      }
    }
  }

  /**
   * Suivi des lignes locations pour le ngFor (utilisé par la grid).
   * @param pItem La location.
   * @returns L'identifiant en chaîne.
   */
  public TrackByLocation(pItem: LocationsDTO): string {
    return String(pItem.id ?? '');
  }

  /** Réinitialise la sélection (proxy vers GridComponent.ClearSelection). */
  public ClearSelection(): void {
    this.Grid?.ClearSelection();
  }

  /**
   * Récupère la fonction de validation pour un champ éditable de location.
   * @param pKey La clé du champ (nom PascalCase de la propriété DTO).
   * @returns La fonction de validation ou null si aucune règle.
   */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: LocationsDTO) => string | null) | null {
    const lValidator = GetLocationsFieldValidator(pKey);
    if (!lValidator) {
      return null;
    }
    return (pValue: unknown, pRow: LocationsDTO): string | null => lValidator(pValue, pRow);
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
    const lRule: { MaxLength?: number } | undefined = LocationsValidator[pKey];
    return lRule?.MaxLength ?? null;
  }

  /**
   * Crée un nouveau DTO location avec une référence unique et les champs NOT NULL remplis.
   * Les référentiels doivent être chargés avant l'appel (setRefOptions).
   * @returns Un DTO location prêt à être ajouté à la grille.
   */
  public CreateNewLocation = (): LocationsDTO => {
      // - cm - 2026-08-12 : pré-remplit les FK NOT NULL (natureAffaireId, statutId).
      // - cm - KAN-106 : pré-remplit aussi userId (NOT NULL en BDD, obligatoire côté
      //      FluentValidation) et reference (générée unique). Sans userId dans l'objet,
      //      PrepareRowBeforeCreate skip (check `if (!('userId' in lRow))`) et l'API
      //      renvoie 400 « 'User Id' must not be empty ».
      const lRow: LocationsDTO = this.CreateNewRow();
      lRow.userId = Number(this.CurrentUserId ?? 0) || undefined;
      lRow.reference = this.GenerateReference();
      const lNatureId = this.GetDefaultNatureAffaireId();
      if (lNatureId !== undefined) {
        lRow.natureAffaireId = lNatureId;
      }
      const lStatutId = this.GetDefaultStatutId();
      if (lStatutId !== undefined) {
        lRow.statutId = lStatutId;
      }
      return lRow;
    };
  //#region Cell edit persistence (overrides GridComponentBase)
  /** Expose le service Locations à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): LocationsService { return this._LocationsService; }
  //#endregion

  /**
   * Construit les marqueurs de carte enrichis pour les locations affichées.
   * @param pData La liste des locations à mapper.
   * @returns La liste des marqueurs (uniquement pour les locations avec adresse géocodée).
   */
  public BuildMapMarkers(pData: LocationsDTO[]): IMapMarker[] {
    return pData
      .filter((pItem: LocationsDTO) => {
        const lLat: number = Number(pItem.adresse?.latitude ?? 0);
        const lLng: number = Number(pItem.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pItem: LocationsDTO) => {
        const lReference: string = pItem.reference ?? `Location #${pItem.id ?? ''}`;
        const lLoyer: number = pItem.loyerHc ?? 0;
        const lLoyerStr: string = lLoyer > 0 ? `${this.FormatPrice(lLoyer)}` : '';
        // [cm] 2026-08-12 : la surface n'est plus sur crm.locations (champ migre vers crm.properties). Affichage via le bien lie si besoin.
        const lSurface: number = 0;
        const lSurfaceStr: string = '';
        const lTypeBien: string = pItem.property?.typeBien?.libelle ?? '';
        const lStatut: string = pItem.statut?.libelle ?? '';
        const lNature: string = pItem.natureAffaire?.libelle ?? '';
        const lVille: string = pItem.adresse?.city ?? '';
        const lAdresse: string = [pItem.adresse?.housenumber, pItem.adresse?.street, lVille].filter((pPart: string | undefined) => !!pPart).join(' ');
        const lDate: string = this.FormatDate(pItem.dateSignatureBailEntree ?? pItem.dateCommercialisation ?? pItem.datePriseMandat);
        const lSubtitleParts: string[] = [lNature, lTypeBien, lStatut].filter((pPart: string) => pPart !== '');
        const lPopupLines: string[] = [
          `<strong>${lReference}</strong>`,
          lAdresse,
          lLoyerStr ? `${this.Translate.translate('crm-biens.marker.popup.loyerHc')} ${lLoyerStr}` : '',
          lSurfaceStr ? `${this.Translate.translate('crm-biens.marker.popup.surface')} ${lSurfaceStr}` : '',
          lDate ? `${this.Translate.translate('crm-biens.marker.popup.date')} ${lDate}` : ''
        ].filter((pPart: string) => pPart !== '');
        // - cm - Icône/couleur centralisées via GetMarkerStyle (cf. map-marker-style.ts).
        const lStyle = GetMarkerStyle(EMarkerType.Location);
        return {
          Lat: Number(pItem.adresse?.latitude ?? 0),
          Lng: Number(pItem.adresse?.longitude ?? 0),
          Title: lReference,
          Subtitle: lSubtitleParts.join(' · ') || undefined,
          Popup: lPopupLines.join('<br>'),
          Color: lStyle.Color,
          Icon: lStyle.Icon,
          Label: lVille ? lVille.substring(0, 3).toUpperCase() : undefined,
          Type: EMarkerType.Location,
          // [cm] Stocke le DTO source pour permettre au parent d'afficher la [cm] grille complète éditable dans le popup du marker.
          Data: pItem
        };
      });
  }
  //#endregion
}
