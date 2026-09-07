import { Component, inject, OnInit, OnDestroy, Output, EventEmitter, Input, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { OpportunitiesDTO, ApplicationsDTO } from '@core/sellmatchdb/dto';
import { ProStateService } from '@core/states/pro-state/pro-state.service';
import { BaseComponent } from '@core/base/BaseComponent';
import { ListComponent, TabConfig } from '@shared/components/List/list.component';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';

import { OpportunitiesItemComponent } from './OpportunitiesItem/opportunities-item.component';
import { OpportunitiesCritereDTO } from '@core/sellmatchdb/dto/opportunities/opportunities.critere';
import { BaseCritereDTO } from '@core/base/base.critere';
import { FilterSchemaField } from '@shared/components/FilterBar/filter-bar.component';
import { OPPORTUNITY_FILTER_SCHEMA, MapFlatFilterToOpportunitiesCritere } from '@core/sellmatchdb/dto/opportunities/opportunities-filter.helpers';
import { CandidaturePopupComponent } from '@views/Dashboards/vendeur/candidats/candidature-popup/candidature-popup.component';

type OpportuniteTab = 'nouvelles' | 'candidatures';

@Component({
  selector: 'app-opportunities',
  standalone: true,
  templateUrl: './opportunities.component.html',
  styleUrls: ['./opportunities.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    RouterModule,
    CandidaturePopupComponent,
    SectionCardComponent,
    ListComponent,
    OpportunitiesItemComponent
]
})
export class OpportunitiesComponent extends BaseComponent implements OnInit, OnDestroy {
  private _Subscriptions: Subscription[] = [];
  public Filter: OpportunitiesCritereDTO = { sort: 'createdAt', sortDirection: 'desc' };

  @Input() public UserId: number = 0;
  /** Affiche le bouton "Voir tout" dans l'en-tête de la section (utilisé sur le dashboard accueil). */
  @Input() public ShowSeeAll: boolean = false;
  @Output() CandidatureCreated: EventEmitter<ApplicationsDTO> = new EventEmitter<ApplicationsDTO>();

  public readonly State: ProStateService = inject(ProStateService);

  /**
   * Navigation vers la vue dédiée des opportunités ("Voir tout").
   */
  public GoToOpportunities(): void
  {
    this.Nav.Go('opportunities');
  }

  /** Schéma de la barre de filtres — réutilisé via constante partagée */
  public OpportunityFilterSchema: Record<string, FilterSchemaField> = OPPORTUNITY_FILTER_SCHEMA;

  public OpportunitesNouvelles: OpportunitiesDTO[] = [];
  public OpportunitesCandidatures: OpportunitiesDTO[] = [];
  public ShowCandidatureModal: boolean = false;
  public Loading: boolean = false;
  public ActiveTab: OpportuniteTab = 'nouvelles';
  public OpportuniteSelectionnee: OpportunitiesDTO | null = null;

  public PaginationByTab: Record<OpportuniteTab, { page: number; pageSize: number }> = {
    nouvelles: { page: 1, pageSize: 3 },
    candidatures: { page: 1, pageSize: 3 }
  };

  ngOnInit(): void {
    this._Subscriptions.push(
      this.State.OpportunitesNouvelles$.subscribe((pOpportunites: OpportunitiesDTO[]) => {
        this.OpportunitesNouvelles = pOpportunites;
      }),
      this.State.OpportunitesCandidatures$.subscribe((pOpportunites: OpportunitiesDTO[]) => {
        this.OpportunitesCandidatures = pOpportunites;
      }),
      this.State.Loading$.subscribe((pLoading: boolean) => {
        this.Loading = pLoading;
      })
    );

    // Chargement initial comme Dossiers
    this.LoadCurrentTab();
    this.LoadMandats();
  }

  ngOnDestroy(): void {
    this._Subscriptions.forEach((pSub: Subscription) => pSub.unsubscribe());
  }

  public GetOpportunitesTabs(): TabConfig[] {
    return [
      { Key: 'nouvelles', Label: 'Nouvelles', Count: this.State.GetOpportunitesCount('nouvelles') },
      { Key: 'candidatures', Label: 'Mes candidatures', Count: this.State.GetOpportunitesCount('candidatures') }
    ];
  }

  public async SetActiveTab(pTab: string): Promise<void> {
    const lTab = pTab as OpportuniteTab;
    if (this.ActiveTab === lTab) return; // évite reload inutile

    this.ActiveTab = lTab;
    this.PaginationByTab[this.ActiveTab].page = 1;
    await this.LoadCurrentTab();
  }

  public async OnPageChange(pPage: number): Promise<void> {
    if (this.PaginationByTab[this.ActiveTab].page === pPage) return;
    this.PaginationByTab[this.ActiveTab].page = pPage;
    await this.LoadCurrentTab();
  }

  public async OnPageSizeChange(pPageSize: number): Promise<void> {
    if (this.PaginationByTab[this.ActiveTab].pageSize === pPageSize) return;
    this.PaginationByTab[this.ActiveTab].pageSize = pPageSize;
    this.PaginationByTab[this.ActiveTab].page = 1;
    await this.LoadCurrentTab();
  }

  /**
   * Transforme les filtres plats en structure imbriquée OpportunitiesCritereDTO
   * et recharge les données.
   * @param pCritere Critères plats reçus de la FilterBar
   */
  public async OnFilterChanged(pCritere: BaseCritereDTO): Promise<void> {
    this.Filter = MapFlatFilterToOpportunitiesCritere(pCritere);
    this.PaginationByTab[this.ActiveTab].page = 1;
    await this.LoadCurrentTab();
  }

  private async LoadCurrentTab(): Promise<void> {
    const lUserId: number = this.UsersService.currentUser?.id ?? 0;
    if (!lUserId || lUserId <= 0) return;

    this.UserId = lUserId;

    const lPagination = this.PaginationByTab[this.ActiveTab];

    await this.State.LoadOpportunitesPage(
      lUserId,
      this.ActiveTab,
      lPagination.page,
      lPagination.pageSize,
      this.Filter
    );
  }

  private async LoadMandats(): Promise<void> {
    const lUserId: number = this.UserId > 0 ? this.UserId : (this.UsersService.currentUser?.id ?? 0);
    if (!lUserId || lUserId <= 0) return;

    await this.State.LoadMandatsAcceptes(lUserId);
  }

  public Candidater(pOpportunite: OpportunitiesDTO): void {
    this.OpportuniteSelectionnee = pOpportunite;
    this.ShowCandidatureModal = true;
  }

  public CloseCandidatureModal(): void {
    this.ShowCandidatureModal = false;
    this.OpportuniteSelectionnee = null;
  }

  public OnCandidatureCreated(pApplication: ApplicationsDTO): void {
    this.CandidatureCreated.emit(pApplication);
    this.CloseCandidatureModal();
  }
}
