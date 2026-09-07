import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { VendeurStateService } from '@core/states/vendeur-state/vendeur-state.service';
import { OpportunitiesDTO } from '@core/sellmatchdb/dto';
import { DashboardLayoutComponent } from '@shared/components/layout/dashboard-layout/dashboard-layout.component';
import { MenuItem } from '@shared/components/layout/sidebar/sidebar.component';
import { ProfilComponent } from '@shared/components/profil/profil.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { NouvelleVentePopupComponent } from '../nouvelle-vente-popup/nouvelle-vente-popup.component';
import { PopupSupportComponent } from '@components/popup-support/popup-support.component';
import { CandidatsComponent } from '../candidats/candidats.component';

import { MessageComponent } from '@shared/components/message/message.component';
import { BaseViewComponent } from '@core/base/BaseView/BaseViewComponent';
import { HomeVendeurComponent } from '../home-vendeur/home-vendeur.component';
import { CrmTutorialLauncherComponent } from '@components/crm-tutorial-launcher/crm-tutorial-launcher.component';
import { DEFAULT_VENDEUR_TUTORIAL_STEPS, VENDEUR_TUTORIAL_DONE_KEY } from '@core/services/tutorial/tutorial.flows';
import { DossiersComponent } from '@views/Dashboards/vendeur/dossiers/dossiers.component';

@Component({
  selector: 'app-dashboard-vendeur',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    HomeVendeurComponent,
    DossiersComponent,
    CandidatsComponent,
    ProfilComponent,
    ButtonComponent,
    NouvelleVentePopupComponent,
    PopupSupportComponent,
    MessageComponent,
    CrmTutorialLauncherComponent
],
  templateUrl: './dashboard-vendeur.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard-vendeur.component.scss']
})
export class DashboardVendeurComponent extends BaseViewComponent
{
  public readonly State: VendeurStateService = inject(VendeurStateService);

  /** Steps du tuto par défaut pour le dashboard vendeur. */
  public readonly VendeurTutorialSteps = DEFAULT_VENDEUR_TUTORIAL_STEPS;

  /** Clé localStorage du tuto dashboard vendeur. */
  public readonly VendeurTutorialDoneKey = VENDEUR_TUTORIAL_DONE_KEY;

  public get MenuItems(): MenuItem[]
  {
    const lStats = this.State.GetStats();

    return [
      { Label: 'Tableau de bord', View: 'dashboard', icon: 'dashboard' },
      { Label: 'Mes dossiers', View: 'dossiers', icon: 'folder_open', badge: this.State.GetDossiersCount('en_cours') },
      { Label: 'Historique', View: 'historique', icon: 'history', badge: lStats.DossiersHistorique },
      { Label: 'Candidats', View: 'candidats', icon: 'people', badge: lStats.TotalCandidatures },
      { Label: 'Profil', View: 'profil', icon: 'person' }
    ];
  }

  protected async LoadData(): Promise<void>
  {
    if (!this.User?.id)
    {
      return;
    }

    this.State.SetActiveTab('en_cours');
  }

  public async OnDossierCreated(pDossier: OpportunitiesDTO): Promise<void>
  {
    this.State.ShowNewDossier = false;
    this.Go('dossiers');

    // Rechargement depuis le back pour rester source of truth
    if (this.User?.id)
    {
      await this.State.LoadDossiersPage(this.User.id, 'en_cours', 1, 3);
    }
  }
}
