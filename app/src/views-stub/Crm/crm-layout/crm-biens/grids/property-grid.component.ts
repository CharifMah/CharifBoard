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
import { PropertiesDTO } from '@core/crm/dto/properties/properties.dto';
import { PropertiesCritereDTO } from '@core/crm/dto/properties/properties.critere';
import { GetPropertiesFieldValidator, PropertiesValidator } from '@core/crm/dto/properties/properties.validator';

import { IMapMarker } from '@shared/components/map-card/IMapMarker';
import { EMarkerType } from '@shared/components/map-card/EMarkerType';
import { GetMarkerStyle } from '@shared/components/map-card/map-marker-style';
import { PropertiesService } from '@core/crm/services/properties/properties.service';
import { BaseDTO } from '@base/BaseDTO';
// [cm] L'ancienne `GridI18nMixin` a été supprimée : sa logique i18n (`_Translation`, `TranslateKey()`, `T()`) est portée par `GridComponentBase`.
import { GridComponentBase } from '@shared/components/grid/grid-component-base';

/**
 * Options des référentiels injectées par le parent (cf. `CrmBiensComponent`).
 * - cm - Extrait en interface nommée pour éviter l'index signature implicite
 * que TypeScript infère sur un literal d'objet inline (`{ NatureAffaire: ... }`)
 * — c'est cet index signature qui déclenchait l'erreur TS4111 sur
 * `this['TypeBienOptions']`.
 */
interface IPropertyGridRefOptions {
  NatureAffaire: IInputOption[];
  TypeBien: IInputOption[];
  Statut: IInputOption[];
  EtatCommercial: IInputOption[];
  MotifBlocage: IInputOption[];
  Contact: IInputOption[];
}

/**
 * Grille CRUD Properties extraite de la page Biens.
 * Composant autonome réutilisable (chat, autres pages).
 * Manipule l'entité racine `properties` (bien immobilier générique)
 * qui peut ensuite avoir des Transactions et/ou des Locations associées.
 *
 * Le parent fournit la liste des DTOs via [Data], les options référentielles via [RefOptions],
 * et écoute les événements (CellEdited, ActionClicked, RowAdded, RowValidated) pour
 * déléguer au service CRUD.
 *
 * Les libellés de colonnes, options du grid et champs de filtre sont traduits via
 * le fichier `properties.{lang}.json` co-localisé avec le DTO.
 */
@Component({
  selector: 'app-property-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective, AddressMapTooltipComponent],
  templateUrl: './property-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertyGridComponent extends GridComponentBase<PropertiesDTO, PropertiesCritereDTO> implements OnChanges, OnInit {
  //#region Attributes
  /**
   * Service Properties injecté pour le mode server-side.
   */
  private readonly _PropertiesService: PropertiesService = inject(PropertiesService);
  //#endregion

  //#region Properties
  /** Préfixe de référence (property). */
  protected readonly PREFIX: string = 'PROP';

  /** Options type de bien (signal local — non portée par `GridComponentBase` car seul property en a besoin). */
  public readonly TypeBienOptions = signal<IInputOption[]>([]);
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
  @Input() public override StorageKey: string = 'crm-biens-properties-grid';

  /**
   * Options des référentiels (chargées par le parent).
   * Mise à jour : déclenche la sync des FilterFields et EditorOptions.
   */
  /** Type explicite pour RefOptions — évite l'index signature implicite que TypeScript infère sur un literal d'objet inline. */
  @Input() public RefOptions: IPropertyGridRefOptions | null = null;

  //#endregion

  //#region Outputs
  /** Émis après édition inline d'une cellule. Le parent gère la persistance. */
  @Output() public readonly CellEdited = new EventEmitter<GridCellEditedEvent<PropertiesDTO>>();

  /** Émis après clic sur une action de ligne (edit/delete). */
  @Output() public readonly ActionClicked = new EventEmitter<GridActionEvent<PropertiesDTO>>();

  /** Émis quand la sélection change (si Selectable=true). */
  @Output() public readonly SelectionChanged = new EventEmitter<PropertiesDTO[]>();

  /** RowAdded : porté par GridComponentBase (cf. KAN-GRID-AUTO-ADD-ROW). */
  //#endregion

  //#region ViewChild
  /** Référence vers la grid interne. */
  @ViewChild(GridComponent) public Grid!: GridComponent<PropertiesDTO>;
  //#endregion

  //#region Lifecycle
  /** Déclenche le premier chargement server-side si `ServerSide=true`. */
  public ngOnInit(): void {
    if (this.ServerSide) {
      void this.LoadCurrentPage();
    }
  }
  //#endregion

  //#region Properties (computed/locales)
  /** Options type de bien exposées au template. */
  public get TypeBienOpts(): IInputOption[] {
  return this.TypeBienOptions();
  }

  /** Options contact exposées au template (FK proprietaireId). */
  public get ContactOpts(): IInputOption[] {
    return this.ContactOptions();
  }

  //#region i18n Signals (reactifs sur InstantTick)
  /** Libellé de l'action "Modifier" dans le menu de ligne. */
  public readonly EditActionLabel = this.T('grid.actions.edit');

  /** Libellé de l'action "Supprimer" dans le menu de ligne. */
  public readonly DeleteActionLabel = this.T('grid.actions.delete');

  /** Texte vide affiché quand la grille n'a aucune ligne. */
  public readonly EmptyText = this.T('grid.empty');

  // ---- Labels de colonnes (réactifs) ----

  /** Libellé colonne Référence. */
  public readonly ColReference = this.T('properties.reference');

  /** Libellé colonne Type de bien. */
  public readonly ColTypeBien = this.T('properties.type_bien_id');

  /** Libellé colonne Adresse. */
  public readonly ColAdresse = this.T('properties.adresse_id');

  /** Libellé colonne Ville (sous-colonne visuelle de l'adresse). */
  public readonly ColVille = this.T('crm-biens.filter.ville');

  /** Libellé colonne Propriétaire. */
  public readonly ColProprietaire = this.T('properties.proprietaire_id');

  /** Libellé colonne Surface. */
  public readonly ColSurface = this.T('properties.surface');

  /** Libellé colonne Surface terrain. */
  public readonly ColSurfaceTerrain = this.T('properties.surface_terrain');

  /** Libellé colonne Nombre de pièces. */
  public readonly ColNbPieces = this.T('properties.nb_pieces');

  /** Libellé colonne Nombre de chambres. */
  public readonly ColNbChambres = this.T('properties.nb_chambres');

  /** Libellé colonne Étage. */
  public readonly ColEtage = this.T('properties.etage');

  /** Libellé colonne Ascenseur. */
  public readonly ColAscenseur = this.T('properties.ascenseur');

  /** Libellé colonne Stationnement. */
  public readonly ColStationnement = this.T('properties.stationnement');

  /** Libellé colonne Année construction. */
  public readonly ColAnneeConstruction = this.T('properties.annee_construction');

  /** Libellé colonne DPE. */
  public readonly ColDpe = this.T('properties.dpe');

  /** Libellé colonne GES. */
  public readonly ColGes = this.T('properties.ges');

  /** Libellé colonne Chauffage. */
  public readonly ColChauffage = this.T('properties.chauffage');

  /** Libellé colonne Climatisation. */
  public readonly ColClimatisation = this.T('properties.climatisation');

  /** Libellé colonne État général. */
  public readonly ColEtatGeneral = this.T('properties.etat_general');

  /** Libellé colonne Prix affiché. */
  public readonly ColPrixAffiche = this.T('properties.prix_affiche');

  /** Libellé colonne Charges. */
  public readonly ColCharges = this.T('properties.charges');

  /** Libellé colonne Disponibilité. */
  public readonly ColDisponibilite = this.T('properties.disponibilite');

  /** Libellé colonne Date de commercialisation. */
  public readonly ColDateCommercialisation = this.T('properties.date_commercialisation');

  /** Libellé colonne Statut. */
  public readonly ColStatut = this.T('properties.statut');

  /** Libellé "Oui" (booléen). */
  public readonly BoolYes = this.T('bool.yes');

  /** Libellé "Non" (booléen). */
  public readonly BoolNo = this.T('bool.no');

  /** Suffixe d'unité pour la surface (m²). */
  public readonly UnitM2 = this.T('crm-common.unit.m2');
  // #endregion #endregion

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
      // [cm] 2026-08-12 : la signature de `BienGridBase.setRefOptions` ne porte plus `pTypeBien` (la FK n'existe pas sur transactions/locations et le bien porte lui-même son type via `row.typeBien`). L'appel passe directement TypeBien à `TypeBienOptions.set(...)` via le code local ci-dessous — `property-grid` est la seule grille qui consomme le type de bien, et elle le gère dans son propre handler.
      this.NatureAffaireOptions.set(this.RefOptions.NatureAffaire ?? []);
      this.StatutOptions.set(this.RefOptions.Statut ?? []);
      this.EtatCommercialOptions.set(this.RefOptions.EtatCommercial ?? []);
      this.MotifBlocageOptions.set(this.RefOptions.MotifBlocage ?? []);
      this.ContactOptions.set(this.RefOptions.Contact ?? []);
      this.TypeBienOptions.set(this.RefOptions.TypeBien ?? []);
      this.SyncFilterOptions();
    }
  }
  //#endregion

  //#region Methods
  /**
   * Configuration des champs de filtre (réactif via TranslateService.translate()).
   * - cm - Conservé en computed Signal pour rester réactif à InstantTick lors d'un
   * changement de langue (markForCheck via BaseComponent).
   */
  public readonly PropertyFilterFields: Signal<FilterFieldConfig[]> = computed<FilterFieldConfig[]>(() => {
    this.Translate.InstantTick();
    return [
      { Key: 'reference', Label: this.Translate.translate('properties.reference'), Type: 'text', MaxLength: this.GetFieldMaxLength('reference'), Placeholder: this.Translate.translate('crm-biens.filter.referencePlaceholder') },
      { Key: 'adresse', Label: this.Translate.translate('crm-biens.filter.ville'), Type: 'address', Placeholder: this.Translate.translate('crm-biens.filter.villePlaceholder') },
      { Key: 'typeBienId', Label: this.Translate.translate('properties.type_bien_id'), Type: 'select', Options: [] },
      { Key: 'statut', Label: this.Translate.translate('properties.statut'), Type: 'text', MaxLength: this.GetFieldMaxLength('statut'), Placeholder: this.Translate.translate('crm-biens.filter.statutPlaceholder') }
    ];
  });

  /**
   * Synchronise les options des barres de filtre avec les référentiels chargés.
   */
  private SyncFilterOptions(): void {
    const lType = this.TypeBienOptions();
    for (const lField of this.PropertyFilterFields()) {
      if (lField.Key === 'typeBienId') {
        lField.Options = lType;
      }
    }
  }

  /**
   * Suivi des lignes properties pour le ngFor (utilisé par la grid).
   * @param pItem Le bien.
   * @returns L'identifiant en chaîne.
   */
  public TrackByProperty(pItem: PropertiesDTO): string {
    return String(pItem.id ?? '');
  }

  /** Réinitialise la sélection (proxy vers GridComponent.ClearSelection). */
  public ClearSelection(): void {
    this.Grid?.ClearSelection();
  }

  /**
   * Récupère la fonction de validation pour un champ éditable de property.
   * @param pKey La clé du champ (nom PascalCase de la propriété DTO).
   * @returns La fonction de validation ou null si aucune règle.
   */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: PropertiesDTO) => string | null) | null {
    const lValidator = GetPropertiesFieldValidator(pKey);
    if (!lValidator) {
      return null;
    }
    return (pValue: unknown, pRow: PropertiesDTO): string | null => lValidator(pValue, pRow);
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
    const lRule: { MaxLength?: number } | undefined = PropertiesValidator[pKey];
    return lRule?.MaxLength ?? null;
  }

  /**
   * Crée un nouveau DTO property avec une référence unique.
   * Les référentiels doivent être chargés avant l'appel (setRefOptions).
   * @returns Un DTO property prêt à être ajouté à la grille.
   */
  public CreateNewProperty = (): PropertiesDTO => {
    // - cm - 2026-08-12 : pré-remplir typeBienId (FK NOT NULL côté back).
    const lDto: PropertiesDTO = {
      id: this.GenerateTempId(),
      reference: this.GenerateReference()
    } as PropertiesDTO;
    const lTypeBienId = this.TypeBienOptions()[0]?.Value as number | undefined;
    if (lTypeBienId !== undefined) { lDto.typeBienId = lTypeBienId; }
    return lDto;
  };

  //#region Cell edit persistence (overrides GridComponentBase)
  /** Expose le service Properties à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): PropertiesService { return this._PropertiesService; }
  //#endregion

  /**
   * Construit les marqueurs de carte enrichis pour les biens affichés.
   * @param pData La liste des biens à mapper.
   * @returns La liste des marqueurs (uniquement pour les biens avec adresse géocodée).
   */
  public BuildMapMarkers(pData: PropertiesDTO[]): IMapMarker[] {
    return pData
      .filter((pItem: PropertiesDTO) => {
        const lLat: number = Number(pItem.adresse?.latitude ?? 0);
        const lLng: number = Number(pItem.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pItem: PropertiesDTO) => {
        const lReference: string = pItem.reference ?? `Bien #${pItem.id ?? ''}`;
        const lTypeBien: string = pItem.typeBien?.libelle ?? '';
        const lSurface: number = pItem.surface ?? 0;
        const lSurfaceStr: string = lSurface > 0 ? `${lSurface} ${this.Translate.translate('crm-common.unit.m2')}` : '';
        const lPieces: number = pItem.nbPieces ?? 0;
        const lPiecesStr: string = lPieces > 0 ? `${lPieces} ${this.Translate.translate('crm-common.unit.piece')}` : '';
        const lChambres: number = pItem.nbChambres ?? 0;
        const lChambresStr: string = lChambres > 0 ? `${lChambres} ${this.Translate.translate('crm-common.unit.chambre')}` : '';
        const lPrix: number = pItem.prixAffiche ?? 0;
        const lPrixStr: string = lPrix > 0 ? this.FormatPrice(lPrix) : '';
        const lVille: string = pItem.adresse?.city ?? '';
        const lAdresse: string = [pItem.adresse?.housenumber, pItem.adresse?.street, lVille].filter((pPart: string | undefined) => !!pPart).join(' ');
        const lDisponibilite: string = this.FormatDate(pItem.disponibilite);
        const lSubtitleParts: string[] = [lTypeBien, lSurfaceStr, lPiecesStr, lChambresStr].filter((pPart: string) => pPart !== '');
        const lPopupLines: string[] = [
          `<strong>${lReference}</strong>`,
          lAdresse,
          lPrixStr ? `${this.Translate.translate('crm-biens.marker.popup.prix')} ${lPrixStr}` : '',
          lDisponibilite ? `${this.Translate.translate('crm-biens.marker.popup.disponibleLe')} ${lDisponibilite}` : '',
          pItem.statut ? `${this.Translate.translate('crm-biens.marker.popup.statut')} ${pItem.statut}` : ''
        ].filter((pPart: string) => pPart !== '');
        // - cm - Icône/couleur centralisées via GetMarkerStyle (cf. map-marker-style.ts).
        const lStyle = GetMarkerStyle(EMarkerType.Property);
        return {
          Lat: Number(pItem.adresse?.latitude ?? 0),
          Lng: Number(pItem.adresse?.longitude ?? 0),
          Title: lReference,
          Subtitle: lSubtitleParts.join(' · ') || undefined,
          Popup: lPopupLines.join('<br>'),
          Color: lStyle.Color,
          Icon: lStyle.Icon,
          Label: lVille ? lVille.substring(0, 3).toUpperCase() : undefined,
          Type: EMarkerType.Property,
          // [cm] Stocke le DTO source pour permettre au parent d'afficher la [cm] grille complète éditable dans le popup du marker.
          Data: pItem
        };
      });
  }
  //#endregion
}
