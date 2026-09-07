import { Component, OnInit, OnDestroy, inject, Input, ChangeDetectionStrategy } from '@angular/core';

import { Subscription } from 'rxjs';
import { ApplicationsDTO } from '@core/sellmatchdb/dto';
import { ProStateService } from '@core/states/pro-state/pro-state.service';
import { BaseComponent } from '@core/base/BaseComponent';
import { ListComponent, TabConfig } from '@shared/components/List/list.component';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';
import { MandatItemComponent } from './MandatItem/mandat-item.component';
import { LeadPopupComponent } from './leadPopup/lead-popup.component';


@Component({
  selector: 'app-mandats',
  standalone: true,
  templateUrl: './mandats.component.html',
  styleUrls: ['./mandats.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    SectionCardComponent,
    ListComponent,
    MandatItemComponent,
    LeadPopupComponent
]
})
export class MandatsComponent extends BaseComponent implements OnInit, OnDestroy {

  //#region Attributes
  private _Subscriptions: Subscription[] = [];

  //#endregion

  //#region Properties
  /** Affiche le bouton "Voir tout" dans l'en-tête de la section (utilisé sur le dashboard accueil). */
  @Input() public ShowSeeAll: boolean = false;
  public readonly State: ProStateService = inject(ProStateService);
  public ActiveMandatTab: string = 'actifs';
  public MandatsLoading: boolean = false;
  public MandatsAcceptes: ApplicationsDTO[] = [];
  public IsOpenPopup: boolean = false;
  public Lead: ApplicationsDTO = {};
  //#endregion

  //#region Lifecycle
  ngOnInit(): void {
    this._Subscriptions.push(
      this.State.MandatsAcceptes$.subscribe((pMandats: ApplicationsDTO[]) => {
        this.MandatsAcceptes = pMandats;
      }),

      this.State.LoadingMandats$.subscribe((pLoading: boolean) => {
        this.MandatsLoading = pLoading;
      })
    );
  }

  ngOnDestroy(): void {
    this._Subscriptions.forEach(s => s.unsubscribe());
  }
  //#endregion

  //#region Navigation
  /**
   * Navigation vers la vue dédiée des mandats ("Voir tout").
   */
  public GoToMandats(): void
  {
    this.Nav.Go('candidatures');
  }
  //#endregion

  //#region Mandats Tabs
  public GetMandatsTabs(): TabConfig[] {
    return [
      { Key: 'actifs', Label: 'Actifs', Count: this.GetMandatsActifsCount(), Icon: 'folder_open' },
      { Key: 'historique', Label: 'Historique', Count: this.GetMandatsHistoriqueCount(), Icon: 'history' }
    ];
  }

  public SetActiveMandatTab(pTab: string): void {
    this.ActiveMandatTab = pTab;
  }

  public GetCurrentMandats(): ApplicationsDTO[] {
    if (this.ActiveMandatTab === 'actifs') {
      return this.MandatsAcceptes.filter((pApp: ApplicationsDTO) => {
        const lStatut: string = this.State.GetMandatStatut(pApp);
        return lStatut === 'actif';
      });
    }

    // Historique : vendus ou expirés
    return this.MandatsAcceptes.filter((pApp: ApplicationsDTO) => {
      const lStatut = this.State.GetMandatStatut(pApp);
      return lStatut === 'vendu' || lStatut === 'expire';
    });
  }

  public GetMandatsActifsCount(): number {
    return this.MandatsAcceptes.filter((pApp: ApplicationsDTO) =>
      this.State.GetMandatStatut(pApp) === 'actif'
    ).length;
  }

  public GetMandatsHistoriqueCount(): number {
    return this.MandatsAcceptes.filter((pApp: ApplicationsDTO) => {
      const lStatut = this.State.GetMandatStatut(pApp);
      return lStatut === 'vendu' || lStatut === 'expire';
    }).length;
  }

  public GetMandatsVendusCount(): number {
    return this.MandatsAcceptes.filter((pApp: ApplicationsDTO) =>
      this.State.GetMandatStatut(pApp) === 'vendu'
    ).length;
  }
  //#endregion

  //#region Mandat Helpers
  public VoirDetailsMandat(pMandat: ApplicationsDTO): void {
    this.IsOpenPopup = true;
    this.Lead = pMandat;
  }
  //#endregion
}
