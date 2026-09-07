import { Component, ChangeDetectionStrategy, Input, inject, OnInit, signal, computed } from '@angular/core';
import { GridComponent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { AddressMapTooltipComponent } from '@shared/components/address-map-tooltip/address-map-tooltip.component';
import { FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { IInputOption } from '@shared/components/input/input.types';
import { ProspectionsDTO } from '@core/crm/dto/prospections/prospections.dto';
import { ProspectionsCritereDTO } from '@core/crm/dto/prospections/prospections.critere';
import { GetProspectionsFieldValidator } from '@core/crm/dto/prospections/prospections.validator';
import { ProspectionsService } from '@core/crm/services/prospections/prospections.service';
import { GridComponentBase } from '@shared/components/grid/grid-component-base';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { RefTypeProspectionService } from '@core/crm/services/ref-type-prospection/ref-type-prospection.service';
import { RefTypeProspectionCritereDTO } from '@core/crm/dto/ref-type-prospection/ref-type-prospection.critere';

/**
 * Grille CRUD Prospections.
 * Pagination, tri, filtres, suppression simple/en lot gérés par GridComponentBase.
 * Surcharges : Service (DI), LoadRefOptions (référentiel type), CreateNewProspection.
 */
@Component({
  selector: 'app-prospection-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective, AddressMapTooltipComponent, PopupComponent, ButtonComponent],
  templateUrl: './prospection-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProspectionGridComponent extends GridComponentBase<ProspectionsDTO, ProspectionsCritereDTO> implements OnInit {
  //#region Attributes
  private readonly _ProspectionsService: ProspectionsService = inject(ProspectionsService);
  private readonly _RefTypeProspectionService: RefTypeProspectionService = inject(RefTypeProspectionService);
  //#endregion

  //#region Properties
  /** Préfixe de référence (prospection). */
  protected readonly PREFIX: string = 'PRO';

  /** Source brute des types de prospection (id/code/libelle/style) chargée via LoadRefOptions. */
  private readonly _TypeProspectionRefs = signal<{
    id?: number;
    code?: string;
    libelle?: string;
    style?: { icon?: string; color?: string; variant?: string }
  }[]>([]);

  // - cm - Préfixe technique utilisé par translateRef quand la traduction BDD est absente.
  private static readonly _TypeProspectionFallbackPrefix: string = 'ref_ref_type_prospection_';

  /** Options du référentiel type de prospection (computed réactif au tick i18n + changement de langue). */
  public readonly TypeProspectionOptions = computed<IInputOption[]>(() => {
    this.Translate.InstantTick();
    return (this._TypeProspectionRefs() ?? [])
      .filter((pR) => pR.id !== undefined)
      .map((pR) => {
        const lOpt: IInputOption & { code?: string } = {
          Value: pR.id as number,
          // - cm - PAS de 3e arg : on ne fallback PAS sur pR.libelle (qui resterait en FR).
          Label: this.Translate.translateRefReactive('ref_type_prospection', pR.id as number),
          style: pR.style,
          code: pR.code
        };
        return lOpt;
      })
      // - cm - Retire les options dont la traduction BDD est absente pour la langue courante.
      .filter((pOpt) => !pOpt.Label.startsWith(ProspectionGridComponent._TypeProspectionFallbackPrefix));
  });

  /** Champs de filtre de la grid Prospections. */
  public readonly ProspectionFilterFields = computed<FilterFieldConfig[]>(() => [
    { Key: 'action', LabelCle: 'crm-prospection.action', Type: 'text' },
    { Key: 'typeProspectionId', LabelCle: 'crm-prospection.type', Type: 'select', Options: this.TypeProspectionOptions() },
    { Key: 'adresse', LabelCle: 'crm-prospection.adresse', Type: 'address' }
  ]);

  /** StorageKey pour la persistance des colonnes. */
  @Input() public override StorageKey: string = 'crm-prospection-grid';
  /** Active la barre de filtre (true par défaut). */
  @Input() public Filterable: boolean = true;
  /** Active la sélection de lignes (false par défaut). */
  @Input() public Selectable: boolean = false;
  //#endregion

  //#region Lifecycle
  public ngOnInit(): void {
    // - cm - Précharge la refTable BDD dans la langue COURANTE. Le TranslationService
    // re-précharge auto au changement de langue (cf. TranslationService.onLangChange).
    void this.Translate.preloadRefTable('ref_type_prospection');
    void this.LoadRefOptions();
    if (this.ServerSide) { void this.LoadCurrentPage(); }
  }
  //#endregion

  //#region Methods
  /** Charge les sources brutes du référentiel type de prospection. */
  private async LoadRefOptions(): Promise<void> {
    try {
      const lCritere: RefTypeProspectionCritereDTO = { style: {}, includeStyleEmpty: true };
      const lTypes = await this._RefTypeProspectionService.getAll(lCritere);

      // - cm - On stocke la source BRUTE (pas les options i18n) : c'est le computed
      // `TypeProspectionOptions` qui dérive les `IInputOption[]` en lisant
      // `translateRefReactive` à chaque change detection / changement de langue.
      this._TypeProspectionRefs.set(lTypes ?? []);
    } catch (pErr) {
      console.error('Erreur chargement référentiels prospection', pErr);
    }
  }

  /** TrackBy pour le ngFor de la grid. */
  public TrackByProspection(pItem: ProspectionsDTO): string {
    return String(pItem.id ?? '');
  }

  /** Récupère la fonction de validation pour un champ éditable de prospection. */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: ProspectionsDTO) => string | null) | null {
    const lValidator = GetProspectionsFieldValidator(pKey);
    if (!lValidator) { return null; }
    return (pValue: unknown, pRow: ProspectionsDTO): string | null => lValidator(pValue, pRow);
  }

  /**
     * Crée un nouveau DTO prospection avec id temporaire.
     * - cm - Arrow function obligatoire : `this` doit rester lié au composant
     *      quand `app-grid` appelle `this.NewRowFactory()` (cf. skill
     *      sellmatch-angular-grid-crud, Problème 1).
     */
    public CreateNewProspection = (): ProspectionsDTO => {
      return { id: this.GenerateTempId() } as ProspectionsDTO;
    };

  /** Expose le service Prospections à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): ProspectionsService { return this._ProspectionsService; }

  /** Recharge la page courante après une édition (mode server-side). */
  protected override async ReloadAfterEdit(): Promise<void> { if (this.ServerSide) { await this.LoadCurrentPage(); } }
  //#endregion
}
