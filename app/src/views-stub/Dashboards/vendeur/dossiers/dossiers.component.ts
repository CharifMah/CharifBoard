import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OpportunitiesDTO } from '@core/sellmatchdb/dto';
import { VendeurStateService } from '@core/states/vendeur-state/vendeur-state.service';
import { BaseComponent } from '@core/base/BaseComponent';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ListComponent, TabConfig } from '@shared/components/List/list.component';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';
import { SplitterComponent } from '@shared/components/Splitter/splitter.component';

import { DossierItemComponent } from '@views/Dashboards/vendeur/dossiers/DossierItem/dossier-item.component';
import { OpportunitiesCritereDTO } from '@core/sellmatchdb/dto/opportunities/opportunities.critere';
import { BaseCritereDTO } from '@core/base/base.critere';
import { FilterSchemaField } from '@shared/components/FilterBar/filter-bar.component';
import { OPPORTUNITY_FILTER_SCHEMA, MapFlatFilterToOpportunitiesCritere } from '@core/sellmatchdb/dto/opportunities/opportunities-filter.helpers';
import { CandidatsCardComponent } from '../candidats/candidats-card/candidats-card.component';

type DossierTab = 'en_cours' | 'historique';

@Component({
  selector: 'app-dossiers',
  standalone: true,
  imports: [
    FormsModule,
    ListComponent,
    PopupComponent,
    ButtonComponent,
    DossierItemComponent,
    SectionCardComponent,
    SplitterComponent,
    CandidatsCardComponent
],
  templateUrl: './dossiers.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dossiers.component.scss']
})
export class DossiersComponent extends BaseComponent implements OnInit, OnDestroy
{

  //#region Attributes
  /** Liste des abonnements RxJS pour le nettoyage */
  private _Subscriptions: Subscription[] = [];
  /** Dossier sélectionné pour la suppression */
  private _DossierToDelete: OpportunitiesDTO | null = null;
  //#endregion

  //#region Properties
  /** Indique si l'onglet historique doit être affiché par défaut */
  @Input() public ShowHistorique: boolean = false;
  /** Émet un identifiant de navigation vers une route */
  @Output() public NavigateTo: EventEmitter<string> = new EventEmitter<string>();
  /** Émet un événement à l'ouverture d'un nouveau dossier */
  @Output() public OpenNewDossier: EventEmitter<void> = new EventEmitter<void>();

  /** Service d'état du vendeur */
  public readonly State: VendeurStateService = inject(VendeurStateService);

  /** Liste des dossiers en cours */
  public DossiersEnCours: OpportunitiesDTO[] = [];
  /** Liste de l'historique des ventes */
  public HistoriqueVentes: OpportunitiesDTO[] = [];
  /** Dossier actuellement sélectionné */
  public DossierSelectionne: OpportunitiesDTO | null = null;
  /** Requête de recherche en cours */
  public SearchQuery: string = '';
  /** Onglet actif courant */
  public ActiveTab: DossierTab = 'en_cours';
  /** Indique si les dossiers sont en cours de chargement */
  public DossiersLoading: boolean = false;
  /** Indique si la popup de suppression est visible */
  public ShowDeletePopup: boolean = false;

  /**
   * Filtre par défaut pour les dossiers
   */
  public Filter: OpportunitiesCritereDTO = { sort: 'createdAt', sortDirection: 'desc' };

  /** Schéma de la barre de filtres — réutilisé via constante partagée */
  public OpportunityFilterSchema: Record<string, FilterSchemaField> = OPPORTUNITY_FILTER_SCHEMA;

  /** Pagination par onglet (page et taille) */
  public PaginationByTab: Record<DossierTab, { page: number; pageSize: number }> = {
    en_cours: { page: 1, pageSize: 3 },
    historique: { page: 1, pageSize: 3 }
  };
  //#endregion

  //#region Methods
  /**
   * Initialise le composant et souscrit aux observables d'état.
   */
  public ngOnInit(): void {
    // - cm - Réinitialiser l'onglet avant les subscriptions pour éviter
    // - cm - que la valeur résiduelle du BehaviorSubject ne s'impose
    this.State.SetActiveTab(this.ShowHistorique ? 'historique' : 'en_cours');

    this._Subscriptions.push(
      this.State.DossiersEnCours$.subscribe((pDossiers: OpportunitiesDTO[]) => {
        this.DossiersEnCours = pDossiers;
      }),
      this.State.HistoriqueVentes$.subscribe((pHistorique: OpportunitiesDTO[]) => {
        this.HistoriqueVentes = pHistorique;
      }),
      this.State.SelectedDossier$.subscribe((pDossier: OpportunitiesDTO | null) => {
        this.DossierSelectionne = pDossier;
      }),
      this.State.ActiveTab$.subscribe((pTab: string) => {
        this.ActiveTab = (pTab as DossierTab) || 'en_cours';
      }),
      this.State.Loading$.subscribe((pLoading: boolean) => {
        this.DossiersLoading = pLoading;
      })
    );

    this.LoadCurrentTab();
  }

  /**
   * Nettoie les abonnements à la destruction du composant.
   */
  public ngOnDestroy(): void {
    this._Subscriptions.forEach((pSub: Subscription) => pSub.unsubscribe());
  }

  /**
   * Retourne la configuration des onglets (en cours / historique).
   * @returns Tableau de configuration des onglets
   */
  public GetDossiersTabs(): TabConfig[] {
    return [
      { Key: 'en_cours', Label: 'Dossiers en cours', Count: this.State.GetDossiersCount('en_cours'), Icon: 'folder_open' },
      { Key: 'historique', Label: 'Historique', Count: this.State.GetDossiersCount('historique'), Icon: 'history' }
    ];
  }

  /**
   * Change l'onglet actif et recharge les données.
   * @param pTabId Identifiant de l'onglet cible
   */
  public async OnTabChange(pTabId: string): Promise<void> {
    this.ActiveTab = pTabId as DossierTab;
    this.State.SetActiveTab(pTabId);
    this.PaginationByTab[this.ActiveTab].page = 1;
    await this.LoadCurrentTab();
  }

  /**
   * Change la page courante et recharge les données.
   * @param pPage Numéro de la page cible
   */
  public async OnPageChange(pPage: number): Promise<void> {
    this.PaginationByTab[this.ActiveTab].page = pPage;
    await this.LoadCurrentTab();
  }

  /**
   * Transforme les filtres plats en structure imbriquée OpportunitiesCritereDTO
   * et recharge les données.
   * @param pCritere Critères plats reçus de la FilterBar
   */
  public async OnFilterChanged(pCritere: BaseCritereDTO): Promise<void> {
    this.Filter = MapFlatFilterToOpportunitiesCritere(pCritere);
    await this.LoadCurrentTab();
  }

  /**
   * Change la taille de la page et recharge les données.
   * @param pPageSize Nouvelle taille de page
   */
  public async OnPageSizeChange(pPageSize: number): Promise<void> {
    this.PaginationByTab[this.ActiveTab].pageSize = pPageSize;
    this.PaginationByTab[this.ActiveTab].page = 1;
    await this.LoadCurrentTab();
  }

  /**
   * Ouvre la popup de confirmation de suppression.
   * @param pDossier Dossier à supprimer
   */
  public OpenDeletePopup(pDossier: OpportunitiesDTO): void {
    this._DossierToDelete = pDossier;
    this.ShowDeletePopup = true;
  }

  /**
   * Ferme la popup de confirmation de suppression.
   */
  public CloseDeletePopup(): void {
    this.ShowDeletePopup = false;
    this._DossierToDelete = null;
  }

  /**
   * Confirme la suppression du dossier sélectionné.
   */
  public async ConfirmDelete(): Promise<void> {
    if (!this._DossierToDelete?.id) {
      return;
    }

    const lDeleted: boolean = await this.State.DeleteDossier(this._DossierToDelete.id);
    this.CloseDeletePopup();

    if (lDeleted) {
      await this.LoadCurrentTab();
    }
  }

  /**
   * Charge la page courante des dossiers selon l'onglet actif et les filtres.
   */
  private async LoadCurrentTab(): Promise<void> {
    if (!this.UsersService.currentUser?.id || this.UsersService.currentUser?.id <= 0) {
      return;
    }

    const lPagination = this.PaginationByTab[this.ActiveTab];

    await this.State.LoadDossiersPage(
      this.UsersService.currentUser?.id,
      this.ActiveTab,
      lPagination.page,
      lPagination.pageSize,
      this.Filter
    );
  }
  //#endregion

}
