import { Component, ChangeDetectionStrategy, Input, inject, OnInit, signal, computed } from '@angular/core';
import { GridComponent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { IInputOption } from '@shared/components/input/input.types';
import { TachesDTO } from '@core/crm/dto/taches/taches.dto';
import { TachesCritereDTO } from '@core/crm/dto/taches/taches.critere';
import { GetTachesFieldValidator, TachesValidator } from '@core/crm/dto/taches/taches.validator';
import { TachesService } from '@core/crm/services/taches/taches.service';
import { GridComponentBase } from '@shared/components/grid/grid-component-base';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { RefPrioriteTacheService } from '@core/crm/services/ref-priorite-tache/ref-priorite-tache.service';
import { RefPrioriteTacheCritereDTO } from '@core/crm/dto/ref-priorite-tache/ref-priorite-tache.critere';
import { ContactsService } from '@core/crm/services/contacts/contacts.service';
import { IMapMarker } from '@shared/components/map-card/IMapMarker';
import { EMarkerType } from '@shared/components/map-card/EMarkerType';

/**
 * Grille CRUD Tâches.
 * Pagination, tri, filtres, suppression simple/en lot gérés par GridComponentBase.
 * Surcharges : Service (DI), LoadRefOptions (référentiels priorité+contact),
 * CreateNewTache, BuildMapMarkers, GetPrioriteDisplay.
 */
@Component({
  selector: 'app-tache-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective, PopupComponent, ButtonComponent],
  templateUrl: './tache-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TacheGridComponent extends GridComponentBase<TachesDTO, TachesCritereDTO> implements OnInit {
  //#region Attributes
  private readonly _TachesService: TachesService = inject(TachesService);
  private readonly _RefPrioriteTacheService: RefPrioriteTacheService = inject(RefPrioriteTacheService);
  private readonly _ContactsService: ContactsService = inject(ContactsService);
  //#endregion

  //#region Properties
  /** Préfixe de référence (tâche). */
  protected readonly PREFIX: string = 'TCH';

  /** Source brute des priorités (id/code/libelle/style) chargée via LoadRefOptions. */
  private readonly _PrioriteRefs = signal<{ id?: number; code?: string; libelle?: string; style?: { icon?: string; color?: string; variant?: string } }[]>([]);

  /** Préfixe technique retourné par translateRef quand la traduction BDD est absente. */
  private static readonly _PrioriteFallbackPrefix: string = 'ref_ref_priorite_tache_';

  /** Options du référentiel priorité (computed réactif au tick i18n + changement de langue). */
  public readonly PrioriteOptions = computed<IInputOption[]>(() => {
    this.Translate.InstantTick();
    return (this._PrioriteRefs() ?? [])
      .filter((pR) => pR.id !== undefined)
      .map((pR) => {
        const lOpt: IInputOption & { code?: string } = {
          Value: pR.id as number,
          // - cm - PAS de 3e arg : on ne fallback PAS sur pR.libelle (qui resterait en FR).
          Label: this.Translate.translateRefReactive('ref_priorite_tache', pR.id as number),
          style: pR.style,
          code: pR.code
        };
        return lOpt;
      })
      // - cm - Retire les options dont la traduction BDD est absente pour la langue courante.
      .filter((pOpt) => !pOpt.Label.startsWith(TacheGridComponent._PrioriteFallbackPrefix));
  });

  // - cm - Options Oui/Non calculées dynamiquement pour suivre la langue courante.
  // PAS de string hardcodée FR : on passe par Translate.instant() qui réagit au
  // LanguageChanged (cf. TranslationService.setLanguage → InstantTick bump).
  public readonly ValideeOptions = computed<IInputOption[]>(() => {
    this.Translate.InstantTick();
    return [
      { Value: true, Label: this.Translate.translate('taches.common.oui') },
      { Value: false, Label: this.Translate.translate('taches.common.non') }
    ];
  });
  public readonly ArchiveeOptions = computed<IInputOption[]>(() => {
    this.Translate.InstantTick();
    return [
      { Value: true, Label: this.Translate.translate('taches.common.oui') },
      { Value: false, Label: this.Translate.translate('taches.common.non') }
    ];
  });

  /** Champs de filtre de la grid Tâches. */
  public readonly TacheFilterFields = computed<FilterFieldConfig[]>(() => [
    { Key: 'nom', LabelCle: 'taches.nom', Type: 'text', MaxLength: this.GetFieldMaxLength('nom') },
    { Key: 'prioriteId', LabelCle: 'taches.priorite_id', Type: 'select', Options: this.PrioriteOptions() },
    { Key: 'validee', LabelCle: 'taches.validee', Type: 'select', Options: this.ValideeOptions() },
    { Key: 'archivee', LabelCle: 'taches.archivee', Type: 'select', Options: this.ArchiveeOptions() }
  ]);

  /** StorageKey pour la persistance des colonnes. */
  @Input() public override StorageKey: string = 'crm-taches-grid';
  /** Active la barre de filtre (true par défaut). */
  @Input() public Filterable: boolean = true;
  /** Active la sélection de lignes (false par défaut). */
  @Input() public Selectable: boolean = false;
  //#endregion

  //#region Lifecycle
  public ngOnInit(): void {
    // - cm - Précharge les refTables BDD dans la langue COURANTE. Le TranslationService
    // re-préchargera automatiquement au prochain onLangChange (cf. _PreloadedRefTables).
    void this.Translate.preloadRefTable('ref_priorite_tache');
    void this.LoadRefOptions();
    if (this.ServerSide) { void this.LoadCurrentPage(); }
  }
  //#endregion

  //#region Methods
  /** Charge les sources brutes des référentiels (priorité + contact). */
  private async LoadRefOptions(): Promise<void> {
    try {
      const lPrioriteCritere: RefPrioriteTacheCritereDTO = { style: {}, includeStyleEmpty: true };
      const [lPriorites, lContacts] = await Promise.all([
        this._RefPrioriteTacheService.getAll(lPrioriteCritere),
        this._ContactsService.getAll()
      ]);

      // - cm - On stocke les sources BRUTES (pas les options i18n) : c'est le computed
      // `PrioriteOptions` qui dérive les `IInputOption[]` en lisant `translateRefReactive`
      // à chaque change detection / changement de langue.
      this._PrioriteRefs.set(lPriorites ?? []);

      const lContactOpts: IInputOption[] = lContacts
        .filter((pI) => pI.id != null)
        .map((pI) => {
          const lPrenom = (pI.prenom ?? '').toString().trim();
          const lNom = (pI.nom ?? '').toString().trim();
          const lLabel = [lPrenom, lNom].filter((p) => p.length > 0).join(' ') || `Contact #${pI.id}`;
          return { Label: lLabel, Value: pI.id! };
        });
      this.setRefOptions(undefined, undefined, undefined, undefined, lContactOpts);
    } catch (pErr) {
      console.error('Erreur chargement référentiels tâches', pErr);
    }
  }

  /** TrackBy pour le ngFor de la grid. */
  public TrackByTache(pItem: TachesDTO): string {
    return String(pItem.id ?? '');
  }

  /** Récupère la fonction de validation pour un champ éditable de tâche. */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: TachesDTO) => string | null) | null {
    const lValidator = GetTachesFieldValidator(pKey);
    if (!lValidator) { return null; }
    return (pValue: unknown, pRow: TachesDTO): string | null => lValidator(pValue, pRow);
  }

  /** Lit la longueur max d'un champ depuis le validator TS. */
  public GetFieldMaxLength(pKey: string): number | null {
    const lRule: { MaxLength?: number } | undefined = TachesValidator[pKey];
    return lRule?.MaxLength ?? null;
  }

  /**
   * Crée un nouveau DTO tâche avec id temporaire.
   * - cm - Arrow function obligatoire : `this` doit rester lié au composant
   *      quand `app-grid` appelle `this.NewRowFactory()` (cf. skill
   *      sellmatch-angular-grid-crud, Problème 1).
   */
  public CreateNewTache = (): TachesDTO => {
    return this.CreateNewRow();
  };

  /** Expose le service Taches à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): TachesService { return this._TachesService; }

  /** Recharge la page courante après une édition (mode server-side). */
  protected override async ReloadAfterEdit(): Promise<void> { if (this.ServerSide) { await this.LoadCurrentPage(); } }

  /**
   * Construit les marqueurs de carte enrichis pour les tâches affichées.
   * @param pData La liste des tâches.
   */
  public BuildMapMarkers(pData: TachesDTO[]): IMapMarker[] {
    return pData
      .filter((pItem: TachesDTO) => {
        const lLat: number = Number(pItem.contact?.adresse?.latitude ?? 0);
        const lLng: number = Number(pItem.contact?.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pItem: TachesDTO) => {
        const lPrioriteOpt: IInputOption | undefined = this.ResolveOption(pItem.prioriteId ?? pItem.priorite, this.PrioriteOptions());
        const lColor: string | undefined = lPrioriteOpt?.style?.color;
        const lContactLabel: string = pItem.contact
          ? `${pItem.contact.prenom ?? ''} ${pItem.contact.nom ?? ''}`.trim() || `Contact #${pItem.contact.id ?? ''}`
          : '';
        const lPrioriteLibelle: string = pItem.priorite?.libelle?.trim() ?? '';
        const lPopupLines: string[] = [
          `<strong>${pItem.nom ?? `Tâche #${pItem.id ?? ''}`}</strong>`,
          lContactLabel ? `Contact : ${lContactLabel}` : '',
          pItem.description ? pItem.description : '',
          lPrioriteLibelle ? `Priorité : ${lPrioriteLibelle}` : '',
          pItem.dateEcheance ? `Échéance : ${this.FormatDate(pItem.dateEcheance)}` : '',
          pItem.validee ? 'Validée' : '',
          pItem.archivee ? 'Archivée' : ''
        ].filter((pPart: string) => pPart !== '');
        return {
          Lat: Number(pItem.contact?.adresse?.latitude ?? 0),
          Lng: Number(pItem.contact?.adresse?.longitude ?? 0),
          Title: pItem.nom ?? `Tâche #${pItem.id ?? ''}`,
          Subtitle: [lPrioriteLibelle, lContactLabel].filter((pPart: string) => pPart !== '').join(' · ') || undefined,
          Popup: lPopupLines.join('<br>'),
          Color: lColor,
          Icon: 'task_alt',
          Type: EMarkerType.Tache
        };
      });
  }
  //#endregion
}
