import { Component, ChangeDetectionStrategy, Input, inject, OnInit, signal, computed, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GridComponent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { IInputOption } from '@shared/components/input/input.types';
import { HistoriqueEchangesDTO } from '@core/crm/dto/historique-echanges/historique-echanges.dto';
import { HistoriqueEchangesCritereDTO } from '@core/crm/dto/historique-echanges/historique-echanges.critere';
import { GetHistoriqueEchangesFieldValidator, HistoriqueEchangesValidator } from '@core/crm/dto/historique-echanges/historique-echanges.validator';
import { HistoriqueEchangesService } from '@core/crm/services/historique-echanges/historique-echanges.service';
import { GridComponentBase } from '@shared/components/grid/grid-component-base';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { RefTypeEchangeService } from '@core/crm/services/ref-type-echange/ref-type-echange.service';
import { RefTypeEchangeCritereDTO } from '@core/crm/dto/ref-type-echange/ref-type-echange.critere';
import { RefTypeEchangeDTO } from '@core/crm/dto/ref-type-echange/ref-type-echange.dto';
import { ContactsService } from '@core/crm/services/contacts/contacts.service';
import { TranslationService, SupportedLanguage } from '@core/services/i18n/TranslationService';

/**
 * Grille CRUD Historique des échanges.
 * Pagination, tri, filtres, suppression simple/en lot gérés par GridComponentBase.
 * Surcharges : Service (DI), LoadRefOptions (référentiels type+contact), CreateNewHistorique.
 */
@Component({
  selector: 'app-historique-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective, PopupComponent, ButtonComponent],
  templateUrl: './historique-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoriqueGridComponent extends GridComponentBase<HistoriqueEchangesDTO, HistoriqueEchangesCritereDTO> implements OnInit {
  //#region Attributes
  private readonly _HistoriqueEchangesService: HistoriqueEchangesService = inject(HistoriqueEchangesService);
  private readonly _RefTypeEchangeService: RefTypeEchangeService = inject(RefTypeEchangeService);
  private readonly _ContactsService: ContactsService = inject(ContactsService);
  private readonly _PlatformId: object = inject(PLATFORM_ID);
  private readonly _DestroyRef: DestroyRef = inject(DestroyRef);
  //#endregion

  //#region Properties
  /** Préfixe de référence (historique). */
  protected readonly PREFIX: string = 'HIS';

  /** Source brute des types d'échange (id/code/libelle/style) chargée via LoadRefOptions. */
  private readonly _TypeEchangeRefs = signal<RefTypeEchangeDTO[]>([]);

  /**
   * Options du référentiel type d'échange (computed réactif au tick i18n + changement de langue).
   * - cm - Suit le pattern de la grid recrutement : les `IInputOption` sont dérivées
   * à chaque change detection via `translateRefReactive` qui lit le cache BDD
   * `ref_translations` rafraîchi au changement de langue.
   */
  public readonly TypeEchangeOptions = computed<IInputOption[]>(() => {
    this.Translate.InstantTick();
    return (this._TypeEchangeRefs() ?? [])
      .map((pR: RefTypeEchangeDTO) => {
        const lOpt: IInputOption & { code?: string } = {
          Value: pR.id as number,
          Label: this.Translate.translateRefReactive('ref_type_echange', pR.id as number, pR.libelle),
          style: pR.style,
          code: pR.code
        };
        return lOpt;
      });
  });

  /** Champs de filtre de la grid Historique (computed sur les signals/computed). */
  public readonly FilterFields = computed<FilterFieldConfig[]>(() => {
    void this.Translate.InstantTick();
    return [
      { Key: 'actionEchange', LabelCle: 'historique-echanges.filtersAction', Type: 'text', MaxLength: this.GetFieldMaxLength('actionEchange'), PlaceholderCle: 'historique-echanges.filtersActionPlaceholder' },
      { Key: 'typeEchangeId', LabelCle: 'historique-echanges.filtersType', Type: 'select', Options: this.TypeEchangeOptions() },
      { Key: 'compteRendu', LabelCle: 'historique-echanges.filtersCompteRendu', Type: 'text', PlaceholderCle: 'historique-echanges.filtersCompteRenduPlaceholder' }
    ];
  });

  /** StorageKey pour la persistance des colonnes. */
  @Input() public override StorageKey: string = 'crm-historique-grid';
  /** Active la barre de filtre (true par défaut). */
  @Input() public Filterable: boolean = true;
  /** Active la sélection de lignes (false par défaut). */
  @Input() public Selectable: boolean = false;
  //#endregion

  //#region Lifecycle
  public ngOnInit(): void {
    // - cm - Précharge la refTable BDD dans la langue COURANTE (cache _RefCache).
    if (isPlatformBrowser(this._PlatformId)) {
      void this.Translate.preloadRefTable('ref_type_echange');
    }
    // - cm - Re-fetch de la refTable à CHAQUE changement de langue : sans ça, les
    // dropdowns (TypeEchangeOptions via translateRefReactive) restent sur la
    // langue du boot (FR figé) après switch FR→EN/ES/PT.
    this.Translate.LanguageChanged
      .pipe(takeUntilDestroyed(this._DestroyRef))
      .subscribe((pLang: SupportedLanguage) => {
        void this.Translate.preloadRefTable('ref_type_echange', pLang);
      });
    void this.LoadRefOptions();
    if (this.ServerSide) { void this.LoadCurrentPage(); }
  }
  //#endregion

  //#region Methods
  /** Charge les sources brutes des référentiels (type d'échange, contact). */
  private async LoadRefOptions(): Promise<void> {
    try {
      const lTypeCritere: RefTypeEchangeCritereDTO = { style: {}, includeStyleEmpty: true };
      const [lTypes, lContacts] = await Promise.all([
        this._RefTypeEchangeService.getAll(lTypeCritere),
        this._ContactsService.getAll()
      ]);

      // - cm - On stocke les sources BRUTES (pas les options i18n) : c'est le computed
      // `TypeEchangeOptions` qui dérive les `IInputOption[]` en lisant
      // `translateRefReactive` à chaque change detection / changement de langue.
      this._TypeEchangeRefs.set(lTypes ?? []);

      const lContactOpts: IInputOption[] = (lContacts ?? [])
        .filter((pI) => pI.id != null)
        .map((pI) => {
          const lPrenom = (pI.prenom ?? '').toString().trim();
          const lNom = (pI.nom ?? '').toString().trim();
          const lLabel = [lPrenom, lNom].filter((p) => p.length > 0).join(' ') || `Contact #${pI.id}`;
          return { Label: lLabel, Value: pI.id! };
        });
      this.ContactOptions.set(lContactOpts);
    } catch (pErr) {
      console.error('Erreur chargement référentiels historique', pErr);
    }
  }

  /** TrackBy pour le ngFor de la grid. */
  public TrackByHistorique(pItem: HistoriqueEchangesDTO): string {
    return String(pItem.id ?? '');
  }

  /** Récupère la fonction de validation pour un champ éditable d'historique. */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: HistoriqueEchangesDTO) => string | null) | null {
    const lValidator = GetHistoriqueEchangesFieldValidator(pKey);
    if (!lValidator) { return null; }
    return (pValue: unknown, pRow: HistoriqueEchangesDTO): string | null => lValidator(pValue, pRow);
  }

  /** Lit la longueur max d'un champ depuis le validator TS. */
  public GetFieldMaxLength(pKey: string): number | null {
    const lRule: { MaxLength?: number } | undefined = HistoriqueEchangesValidator[pKey];
    return lRule?.MaxLength ?? null;
  }

  /**
   * Crée un nouveau DTO historique avec date du jour et id temporaire.
   * - cm - Arrow function obligatoire : `this` doit rester lié au composant
   *      quand `app-grid` appelle `this.NewRowFactory()` (cf. skill
   *      sellmatch-angular-grid-crud, Problème 1).
   */
  public CreateNewHistorique = (): HistoriqueEchangesDTO => {
      // - cm - KAN-106 : pré-remplit userId (NOT NULL côté FluentValidation). Sans ça,
      //      PrepareRowBeforeCreate skip (la prop userId n'existe pas sur l'objet littéral)
      //      et l'API renvoie 400 « 'User Id' must not be empty ».
      return {
        id: this.GenerateTempId(),
        dateEchange: new Date().toISOString(),
        userId: Number(this.CurrentUserId ?? 0) || undefined
      } as HistoriqueEchangesDTO;
    };
  
  /** Expose le service Historique à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): HistoriqueEchangesService { return this._HistoriqueEchangesService; }

  /** Recharge la page courante après une édition (mode server-side). */
  protected override async ReloadAfterEdit(): Promise<void> { if (this.ServerSide) { await this.LoadCurrentPage(); } }
  //#endregion
}
