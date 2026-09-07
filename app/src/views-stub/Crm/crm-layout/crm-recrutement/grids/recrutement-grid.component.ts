import {ChangeDetectionStrategy, Component, computed, inject, Input, OnInit, signal} from '@angular/core';
import {ButtonComponent} from '@shared/components/button/button.component';
import {FilterFieldConfig} from '@shared/components/FilterBar/filter-bar.component';
import {GridColumnDirective} from '@shared/components/grid/grid-column.directive';
import {GridComponentBase} from '@shared/components/grid/grid-component-base';
import {GridComponent} from '@shared/components/grid/grid.component';
import {IInputOption} from '@shared/components/input/input.types';
import {PopupComponent} from '@shared/components/popup/popup.component';
import {
  RefOrigineRecrutementCritereDTO, RefOrigineRecrutementDTO, RefStatutRecrutementCritereDTO,
  RefStatutRecrutementDTO
} from '@core/crm/dto';
import {RecrutementsCritereDTO} from '@core/crm/dto/recrutements/recrutements.critere';
import {RecrutementsDTO} from '@core/crm/dto/recrutements/recrutements.dto';
import {ContactsService, RefOrigineRecrutementService, RefStatutRecrutementService} from '@core/crm/services';
import {RecrutementsService} from '@core/crm/services/recrutements/recrutements.service';
import {SupportedLanguage} from '@core/services/i18n/TranslationService';

/**
 * Grille CRUD Recrutement.
 */
@Component({
  selector: 'app-recrutement-grid',
  standalone: true,
  imports: [ButtonComponent, GridColumnDirective, GridComponent, PopupComponent],
  templateUrl: './recrutement-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecrutementGridComponent extends GridComponentBase<RecrutementsDTO, RecrutementsCritereDTO> implements OnInit {
  //#region Attribute
  private readonly _ContactsService: ContactsService = inject(ContactsService);
  private readonly _RecrutementsService: RecrutementsService = inject(RecrutementsService);
  private readonly _RefOrigineRecrutementService: RefOrigineRecrutementService = inject(RefOrigineRecrutementService);
  private readonly _RefStatutRecrutementService: RefStatutRecrutementService = inject(RefStatutRecrutementService);
  //#endregion

  //#region Property
  /** Préfixe de référence utilisé par GenerateRef() de GridComponentBase (format `PREFIX-YYYYMMDDHHmmssRRR`). */
  protected readonly PREFIX: string = 'REC';

  /** Visuels des pastilles de classement (A=Étoile, B=Validé, C=Neutre, D=Baisse). */
  private static readonly _ClassementVisuals: Readonly<Record<string, {
    Icon: string;
    Color: string;
    Variant: 'soft' | 'solid' | 'outline'
  }>> = {
    A: {Icon: 'star', Color: '#f59e0b', Variant: 'solid'},
    B: {Icon: 'check_circle', Color: '#43a047', Variant: 'soft'},
    C: {Icon: 'remove', Color: '#757575', Variant: 'soft'},
    D: {Icon: 'arrow_downward', Color: '#e53935', Variant: 'soft'}
  };

  /**
   * Libellés FR/EN/ES/PT des valeurs de classement, mis en dur car pas de table BDD
   * de référence pour `classement` (colonnes de la grid recrutement, valeurs A/B/C/D).
   * - cm - Suit la langue courante via `this.Translate.getCurrentLanguage()`. Comme le
   * getter est réévalué à chaque change detection et que `BaseComponent` appelle
   * `markForCheck()` au `LanguageChanged` (cf. BaseComponent.ts:75-83), le dropdown
   * se rafraîchit en live au switch FR → EN / ES / PT.
   */
  private static readonly _ClassementLabels: Readonly<Record<SupportedLanguage, Readonly<Record<string, string>>>> = {
    fr: {A: 'Excellent', B: 'Bon', C: 'Moyen', D: 'À améliorer'},
    en: {A: 'Excellent', B: 'Good', C: 'Average', D: 'Needs improvement'},
    es: {A: 'Excelente', B: 'Bueno', C: 'Medio', D: 'Por mejorar'},
    pt: {A: 'Excelente', B: 'Bom', C: 'Médio', D: 'A melhorar'}
  };

  /** Options du select classement (A/B/C/D avec icon/color/variant). Suit la langue courante. */
  public get ClassementOpts(): IInputOption[] {
    // - cm - Lit la langue courante au moment de l'évaluation du getter.
    const lLang: SupportedLanguage = this.Translate.getCurrentLanguage();
    const lLabels: Readonly<Record<string, string>> = RecrutementGridComponent._ClassementLabels[lLang] ?? RecrutementGridComponent._ClassementLabels.fr;
    return ['A', 'B', 'C', 'D'].map((pKey) => {
      const lVisual = RecrutementGridComponent._ClassementVisuals[pKey];
      return {
        Label: lLabels[pKey] ?? pKey,
        Value: pKey,
        style: lVisual ? {icon: lVisual.Icon, color: lVisual.Color, variant: lVisual.Variant} : undefined
      };
    });
  }

  /** Source brute des origines (id/code/libelle/style) chargée via LoadRefOptions. */
  private readonly _OrigineRefs = signal<RefOrigineRecrutementDTO[]>([]);
  /** Source brute des statuts (id/code/libelle/style) chargée via LoadRefOptions. */
  private readonly _StatutRefs = signal<RefStatutRecrutementDTO[]>([]);

  /**
   * Options du référentiel origine (computed réactif au tick i18n + changement de langue).
   */
  public readonly OrigineOpts = computed<IInputOption[]>(() => {
    this.Translate.InstantTick();
    return (this._OrigineRefs() ?? [])
      .map((pR) => {
        const lOpt: IInputOption & { code?: string } = {
          Value: pR.id as number,
          Label: this.Translate.translateRefReactive('ref_origine_recrutement', pR.id as number, pR.libelle),
          style: pR.style
        };
        return lOpt;
      });
  });

  /**
   * Options du référentiel statut (computed réactif au tick i18n + changement de langue).
   */
  public readonly StatutOpts = computed<IInputOption[]>(() => {
    this.Translate.InstantTick();
    return (this._StatutRefs() ?? [])
      .map((pR) => {
        const lOpt: IInputOption & { code?: string } = {
          Value: pR.id as number,
          Label: this.Translate.translateRefReactive('ref_statut_recrutement', pR.id as number, pR.libelle),
          style: pR.style,
          code: pR.code
        };
        return lOpt;
      });
  });

  /** Champs de filtre de la grid Recrutement (computed sur les signals/computed). */
  public readonly RecrutementFilterFields = computed<FilterFieldConfig[]>(() => [
    {Key: 'contactId', LabelCle: 'recrutements.contact_id', Type: 'select', Options: this.ContactOptions()},
    {Key: 'classement', LabelCle: 'recrutements.classement', Type: 'select', Options: this.ClassementOpts},
    {Key: 'origineId', LabelCle: 'recrutements.origine_id', Type: 'select', Options: this.OrigineOpts()},
    {Key: 'statutId', LabelCle: 'recrutements.statut_id', Type: 'select', Options: this.StatutOpts()}
  ]);

  /** StorageKey pour la persistance des colonnes (largeur, visibilité, ordre). */
  @Input() public override StorageKey: string = 'crm-recrutement-grid';
  /** Active la barre de filtre (true par défaut). */
  @Input() public Filterable: boolean = true;
  //#endregion

  //#region Lifecycle
  public ngOnInit(): void {
    // - cm - Précharge les refTables BDD dans la langue COURANTE. Le TranslationService
    void this.Translate.preloadRefTable('ref_origine_recrutement');
    void this.Translate.preloadRefTable('ref_statut_recrutement');
    void this.LoadRefOptions();
    if (this.ServerSide) {
      void this.LoadCurrentPage();
    }
  }

  //#endregion

  //#region Method

  /** Charge les sources brutes des référentiels (origine, statut, contact). */
  private async LoadRefOptions(): Promise<void> {
    try {
      const lOrigineCritere: RefOrigineRecrutementCritereDTO = {style: {}, includeStyleEmpty: true};
      const lStatutCritere: RefStatutRecrutementCritereDTO = {style: {}, includeStyleEmpty: true};
      const [lOrigines, lStatuts, lContacts] = await Promise.all([
        this._RefOrigineRecrutementService.getAll(lOrigineCritere),
        this._RefStatutRecrutementService.getAll(lStatutCritere),
        this._ContactsService.getAll()
      ]);

      // - cm - On stocke les sources BRUTES (pas les options i18n) : c'est le computed
      // `OrigineOpts` / `StatutOpts` qui dérive les `IInputOption[]` en lisant
      // `translateRefReactive` à chaque change detection / changement de langue.
      this._OrigineRefs.set(lOrigines ?? []);
      this._StatutRefs.set(lStatuts ?? []);

      const lContactOpts: IInputOption[] = lContacts
        .map((pI) => {
          const lPrenom = pI.prenom;
          const lNom = pI.nom;
          const lLabel = lPrenom + ' ' + lNom;
          return {Label: lLabel, Value: pI.id!};
        });
      this.ContactOptions.set(lContactOpts);
    } catch (pErr) {
      //TODO AFFICHE UNE NOTIF OU UN POPUP
    }
  }

  public CreateNewRecrutement = (): RecrutementsDTO => {
      return {
        ...this.CreateNewRow(),
        classement: 'B',
        statutId: (this.StatutOpts()[0]?.Value as number) ?? 1,
        origineId: (this.OrigineOpts()[0]?.Value as number) ?? 1
      } as RecrutementsDTO;
    };

    // userId est pré-rempli automatiquement par GridComponentBase.PrepareRowBeforeCreate (cf. KAN-GRID-AUTO-ADD-ROW).

  // userId est pré-rempli automatiquement par GridComponentBase.PrepareRowBeforeCreate (cf. KAN-GRID-AUTO-ADD-ROW).

  /** Expose le service Recrutements à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): RecrutementsService {
    return this._RecrutementsService;
  }

  /**
   * Critère initial Recrutement : injecte `contact: {}` par défaut.
   * - cm - Requis car le critère de pagination côté back .NET attend un objet
   *      `contact` même vide (mapping API).
   */
  protected override BuildCritereFromInit(pInit: RecrutementsCritereDTO | null): RecrutementsCritereDTO {
    const lBase: RecrutementsCritereDTO = super.BuildCritereFromInit(pInit);
    return {
      ...lBase,
      contact: pInit?.contact ?? {},
      origine: pInit?.origine ?? {},
      statut: pInit?.statut ?? {}
    };
  }

  //#endregion
}
