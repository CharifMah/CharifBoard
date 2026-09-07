import { Component, ChangeDetectionStrategy, Input, signal, computed, inject, OnInit, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GridComponent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { IInputOption } from '@shared/components/input/input.types';
import { ObjectifsDTO } from '@core/crm/dto/objectifs/objectifs.dto';
import { ObjectifsCritereDTO } from '@core/crm/dto/objectifs/objectifs.critere';
import { GetObjectifsFieldValidator } from '@core/crm/dto/objectifs/objectifs.validator';
import { ObjectifsService } from '@core/crm/services/objectifs/objectifs.service';
import { GridComponentBase } from '@shared/components/grid/grid-component-base';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { RefPeriodeObjectifService } from '@core/crm/services/ref-periode-objectif/ref-periode-objectif.service';
import { RefPeriodeObjectifCritereDTO } from '@core/crm/dto/ref-periode-objectif/ref-periode-objectif.critere';
import { RefPeriodeObjectifDTO } from '@core/crm/dto/ref-periode-objectif/ref-periode-objectif.dto';
import { TranslationService, SupportedLanguage } from '@core/services/i18n/TranslationService';

/**
 * Grille CRUD Objectifs.
 * Pagination, tri, filtres, suppression simple/en lot gérés par GridComponentBase.
 * Surcharges : Service (DI), LoadRefOptions (référentiel période), CreateNewObjectif (défauts).
 * i18n : toutes les options locales (PeriodeOpts, ValideeOpts) et labels de filtres
 * suivent les changements de langue via `computed()` + `Translate.InstantTick()`.
 * Le référentiel `ref_periode_objectif` est préchargé par ref_translations BDD
 * (Translate.translateRefReactive) — pas par libellé brut.
 */
@Component({
  selector: 'app-objectif-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective, PopupComponent, ButtonComponent],
  templateUrl: './objectif-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObjectifGridComponent extends GridComponentBase<ObjectifsDTO, ObjectifsCritereDTO> implements OnInit {
  //#region Attributes
  private readonly _ObjectifsService: ObjectifsService = inject(ObjectifsService);
  private readonly _RefPeriodeObjectifService: RefPeriodeObjectifService = inject(RefPeriodeObjectifService);
  private readonly _PlatformId: object = inject(PLATFORM_ID);
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);
  //#endregion

  //#region Properties
  /** Préfixe de référence (objectif). */
  protected readonly PREFIX: string = 'OBJ';

  /** Référentiel période objectif brut (datasource). Rechargé sur LanguageChanged. */
  private readonly _PeriodeRefs = signal<RefPeriodeObjectifDTO[]>([]);

  /** Options du référentiel période objectif, réactives au tick i18n + ref_translations. */
  public readonly PeriodeOpts = computed<IInputOption[]>(() => {
    void this.Translate.InstantTick();
    return this._PeriodeRefs()
      .filter((pI) => pI.id != null)
      .map((pI) => ({
        Value: pI.id!,
        Label: this.Translate.translateRefReactive('ref_periode_objectif', pI.id as number, pI.libelle ?? ''),
        style: pI.style
      }));
  });

  /** Options Oui/Non traduits via crm-common.bool (réactif au tick i18n). */
  public readonly ValideeOpts = computed<IInputOption[]>(() => {
    void this.Translate.InstantTick();
    return [
      { Value: true, Label: this.Translate.translate('crm-common.bool.yes') },
      { Value: false, Label: this.Translate.translate('crm-common.bool.no') }
    ];
  });

  /** Champs de filtre de la grid Objectifs (réactif au tick i18n). */
  public readonly ObjectifFilterFields = computed<FilterFieldConfig[]>(() => {
    void this.Translate.InstantTick();
    return [
      { Key: 'objectif', LabelCle: 'objectifs.filtersObjectif', Type: 'text', PlaceholderCle: 'objectifs.filtersObjectifPlaceholder' },
      { Key: 'periodeId', LabelCle: 'objectifs.filtersPeriodeId', Type: 'select', Options: this.PeriodeOpts() },
      { Key: 'validee', LabelCle: 'objectifs.filtersValidee', Type: 'select', Options: this.ValideeOpts() }
    ];
  });

  /** StorageKey pour la persistance des colonnes. */
  @Input() public override StorageKey: string = 'crm-objectifs-grid';
  /** Active la barre de filtre (true par défaut). */
  @Input() public Filterable: boolean = true;
  /** Active la sélection de lignes (false par défaut). */
  @Input() public Selectable: boolean = false;
  //#endregion

  //#region Lifecycle
  public ngOnInit(): void {
    if (isPlatformBrowser(this._PlatformId)) {
      // - cm - Précharge les ref_translations BDD pour la table période objectif,
      // sinon les libellés de la dropdown restent FR après switch EN/ES/PT.
      void this.Translate.preloadRefTable('ref_periode_objectif');
    }
    void this.LoadRefOptions();
    if (this.ServerSide) { void this.LoadCurrentPage(); }

    // - cm - OBLIGATOIRE : re-fetch des ref_translations à chaque changement de langue.
    // Sinon le dropdown "Période" reste figé sur la langue du boot (cf. skill
    // sellmatch-i18n-lazy-load PITFALL LanguageChanged).
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang: SupportedLanguage) => {
        void this.Translate.preloadRefTable('ref_periode_objectif', pLang);
      });
  }
  //#endregion

  //#region Methods
  /** Charge les référentiels (période). Source brute, dérivation des opts via computed(). */
  private async LoadRefOptions(): Promise<void> {
    try {
      const lCritere: RefPeriodeObjectifCritereDTO = { style: {}, includeStyleEmpty: true };
      const lPeriodes = await this._RefPeriodeObjectifService.getAll(lCritere);
      this._PeriodeRefs.set(lPeriodes ?? []);
    } catch (pErr) {
      console.error('Erreur chargement référentiels objectifs', pErr);
    }
  }

  /** TrackBy pour le ngFor de la grid. */
  public TrackByObjectif(pItem: ObjectifsDTO): string {
    return String(pItem.id ?? '');
  }

  /** Récupère la fonction de validation pour un champ éditable d'objectif. */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: ObjectifsDTO) => string | null) | null {
    const lValidator = GetObjectifsFieldValidator(pKey);
    if (!lValidator) { return null; }
    return (pValue: unknown, pRow: ObjectifsDTO): string | null => lValidator(pValue, pRow);
  }

  /**
     * Crée un nouveau DTO objectif avec id temporaire.
     * - cm - Arrow function obligatoire : `this` doit rester lié au composant
     *      quand `app-grid` appelle `this.NewRowFactory()` (cf. skill
     *      sellmatch-angular-grid-crud, Problème 1).
     */
    public CreateNewObjectif = (): ObjectifsDTO => {
      return { id: this.GenerateTempId() } as ObjectifsDTO;
    };

  /** Expose le service Objectifs à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): ObjectifsService { return this._ObjectifsService; }

  /** Recharge la page courante après une édition (mode server-side). */
  protected override async ReloadAfterEdit(): Promise<void> { if (this.ServerSide) { await this.LoadCurrentPage(); } }
  //#endregion
}
