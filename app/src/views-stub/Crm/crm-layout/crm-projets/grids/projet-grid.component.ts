import { Component, ChangeDetectionStrategy, Input, inject, OnInit, signal, computed } from '@angular/core';
import { GridComponent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { IInputOption } from '@shared/components/input/input.types';
import { RecherchesDTO } from '@core/crm/dto/recherches/recherches.dto';
import { RecherchesCritereDTO } from '@core/crm/dto/recherches/recherches.critere';
import { RecherchesService } from '@core/crm/services/recherches/recherches.service';
import { GetRecherchesFieldValidator, RecherchesValidator } from '@core/crm/dto/recherches/recherches.validator';
import { GridComponentBase } from '@shared/components/grid/grid-component-base';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { RefTypeRechercheCritereDTO, RefStatutRechercheCritereDTO } from '@core/crm/dto';
import { RefTypeRechercheService } from '@core/crm/services/ref-type-recherche/ref-type-recherche.service';
import { RefStatutRechercheService } from '@core/crm/services/ref-statut-recherche/ref-statut-recherche.service';
import { ContactsService } from '@core/crm/services/contacts/contacts.service';

/**
 * Grille CRUD Recherches (projets).
 * La pagination, le tri, les filtres, la suppression simple et en lot sont gérés
 * nativement par GridComponentBase. Les surcharges se limitent à :
 * `Service` (DI), `BuildCritereFromInit` (defaut `contact: {}`), `LoadRefOptions`
 * (référentiels), `CreateNewProjet` (défauts métier), et les `ng-template #cell`
 * pour afficher les libellés des FK (inverse property).
 */
@Component({
  selector: 'app-projet-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective, PopupComponent, ButtonComponent],
  templateUrl: './projet-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjetGridComponent extends GridComponentBase<RecherchesDTO, RecherchesCritereDTO> implements OnInit {
  //#region Attributes
  private readonly _RecherchesService: RecherchesService = inject(RecherchesService);
  private readonly _RefTypeRechercheService: RefTypeRechercheService = inject(RefTypeRechercheService);
  private readonly _RefStatutRechercheService: RefStatutRechercheService = inject(RefStatutRechercheService);
  private readonly _ContactsService: ContactsService = inject(ContactsService);
  //#endregion

  //#region Properties
  /** Préfixe de référence (projet). */
  protected readonly PREFIX: string = 'PRJ';

  /** Options du référentiel type de recherche. */
  public readonly TypeRechercheOptions = signal<IInputOption[]>([]);
  /** Options du référentiel statut de recherche. */
  public readonly StatutOptionsProjet = signal<IInputOption[]>([]);

  /** Champs de filtre de la grid Projets. */
  public readonly ProjetFilterFields = computed<FilterFieldConfig[]>(() => [
    { Key: 'nomProjet', LabelCle: 'recherches.NomProjet', PlaceholderCle: 'recherches.nom_projetPlaceholder', Type: 'text', MaxLength: this.GetFieldMaxLength('nomProjet') },
    { Key: 'typeRechercheId', LabelCle: 'recherches.TypeBienId', Type: 'select', Options: this.TypeRechercheOptions() },
    { Key: 'statutId', LabelCle: 'recherches.StatutId', Type: 'select', Options: this.StatutOptionsProjet() },
    { Key: 'secteurRecherche', LabelCle: 'recherches.SecteurRecherche', PlaceholderCle: 'recherches.secteur_recherchePlaceholder', Type: 'text', MaxLength: this.GetFieldMaxLength('secteurRecherche') }
  ]);

  /** StorageKey pour la persistance des colonnes. */
  @Input() public override StorageKey: string = 'crm-projets-grid';
  /** Active la barre de filtre (true par défaut). */
  @Input() public Filterable: boolean = true;
  /** Active la sélection de lignes (false par défaut). */
  @Input() public Selectable: boolean = false;
  //#endregion

  //#region Lifecycle
  public ngOnInit(): void {
    void this.LoadRefOptions();
    if (this.ServerSide) {
      void this.LoadCurrentPage();
    }
  }
  //#endregion

  //#region Methods
  /** Charge les options des référentiels (type, statut, contact). */
  private async LoadRefOptions(): Promise<void> {
    try {
      const lTypeCritere: RefTypeRechercheCritereDTO = { style: {}, includeStyleEmpty: true };
      const lStatutCritere: RefStatutRechercheCritereDTO = { style: {}, includeStyleEmpty: true };
      const [lTypes, lStatuts, lContacts] = await Promise.all([
        this._RefTypeRechercheService.getAll(lTypeCritere),
        this._RefStatutRechercheService.getAll(lStatutCritere),
        this._ContactsService.getAll()
      ]);

      this.TypeRechercheOptions.set(
        lTypes
          .filter((pI) => pI.libelle != null && pI.id != null)
          .map((pI) => ({ Label: pI.libelle!, Value: pI.id!, style: pI.style }))
      );
      this.StatutOptionsProjet.set(
        lStatuts
          .filter((pI) => pI.libelle != null && pI.id != null)
          .map((pI) => ({ Label: pI.libelle!, Value: pI.id!, style: pI.style }))
      );

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
      console.error('Erreur chargement référentiels projets', pErr);
    }
  }

  /** TrackBy pour le ngFor de la grid. */
  public TrackByProjet(pItem: RecherchesDTO): string {
    return String(pItem.id ?? '');
  }

  /**
   * Récupère la fonction de validation pour un champ éditable.
   * @param pKey La clé du champ.
   */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: RecherchesDTO) => string | null) | null {
    const lValidator = GetRecherchesFieldValidator(pKey);
    if (!lValidator) { return null; }
    return (pValue: unknown, pRow: RecherchesDTO): string | null => lValidator(pValue, pRow);
  }

  /** Lit la longueur max d'un champ depuis le validator TS. */
  public GetFieldMaxLength(pKey: string): number | null {
    const lRule: { MaxLength?: number } | undefined = RecherchesValidator[pKey];
    return lRule?.MaxLength ?? null;
  }

  /**
     * Crée un nouveau DTO projet (recherche) avec id temporaire et statut NOT NULL.
     * - cm - Arrow function obligatoire : `this` doit rester lié au composant
     *      quand `app-grid` appelle `this.NewRowFactory()` (cf. skill
     *      sellmatch-angular-grid-crud, Problème 1).
     */
    public CreateNewProjet = (): RecherchesDTO => {
      const lStatutId: number | undefined = this.StatutOptionsProjet()[0]?.Value as number | undefined;
      return { id: this.GenerateTempId(), statutId: lStatutId } as RecherchesDTO;
    };

  /** Expose le service Recherches à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): RecherchesService { return this._RecherchesService; }

  /** Recharge la page courante après une édition (mode server-side). */
  protected override async ReloadAfterEdit(): Promise<void> { if (this.ServerSide) { await this.LoadCurrentPage(); } }

  /** Critère initial Recherches : injecte `contact: {}` par défaut (requis par le back .NET). */
  protected override BuildCritereFromInit(pInit: RecherchesCritereDTO | null): RecherchesCritereDTO {
    const lBase: RecherchesCritereDTO = super.BuildCritereFromInit(pInit);
    return { ...lBase, contact: pInit?.contact ?? {} };
  }
  //#endregion
}
