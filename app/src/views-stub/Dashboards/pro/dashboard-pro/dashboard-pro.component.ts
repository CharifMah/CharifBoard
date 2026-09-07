import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ProStateService, SidebarStats } from '@core/states/pro-state/pro-state.service';
import { BaseViewComponent } from '@core/base/BaseView/BaseViewComponent';
import { DashboardLayoutComponent } from '@shared/components/layout/dashboard-layout/dashboard-layout.component';
import { MenuItem } from '@shared/components/layout/sidebar/sidebar.component';
import { ProfilComponent } from '@shared/components/profil/profil.component';
import { PopupSupportComponent } from '@components/popup-support/popup-support.component';
import { MandatsComponent } from '../mandats/mandats.component';
import { OpportunitiesComponent } from '../Opportunities/opportunities.component';
import { MessageComponent } from '@shared/components/message/message.component';
import { Params } from '@angular/router';
import { HomeProComponent } from '../home-pro/home-pro.component';
import { BlogAdminComponent } from '@components/blog-admin/blog-admin.component';
import { EmailBroadcastComponent } from '@views/email-broadcast/email-broadcast.component';
import { CrmTutorialLauncherComponent } from '@components/crm-tutorial-launcher/crm-tutorial-launcher.component';
import { DEFAULT_PRO_TUTORIAL_STEPS, PRO_TUTORIAL_DONE_KEY } from '@core/services/tutorial/tutorial.flows';

@Component({
  selector: 'app-dashboard-pro',
  standalone: true,
  imports: [
    DashboardLayoutComponent,
    HomeProComponent,
    OpportunitiesComponent,
    ProfilComponent,
    MandatsComponent,
    PopupSupportComponent,
    MessageComponent,
    BlogAdminComponent,
    EmailBroadcastComponent,
    CrmTutorialLauncherComponent
  ],
  templateUrl: './dashboard-pro.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard-pro.component.scss']
})
export class DashboardProComponent extends BaseViewComponent implements OnInit
{
  private _Stats: SidebarStats | undefined;

  public readonly State: ProStateService = inject(ProStateService);
  public IsImmoAidePopupOpen: boolean = false;

  /** Steps du tuto par défaut pour le dashboard pro. */
  public readonly ProTutorialSteps = DEFAULT_PRO_TUTORIAL_STEPS;

  /** Clé localStorage du tuto dashboard pro. */
  public readonly ProTutorialDoneKey = PRO_TUTORIAL_DONE_KEY;
  public get MenuItems(): MenuItem[]
  {
    this._Stats = this.State.GetStats();
    return [
      { Label: 'Tableau de bord', View: 'dashboard', icon: 'dashboard' },
      { Label: 'Opportunités', View: 'opportunities', icon: 'folder_open', badge: this._Stats?.DossiersEnCours },
      { Label: 'Mes mandats', View: 'candidatures', icon: 'people', badge: this._Stats?.MandatsActifs },
      { Label: 'Profil', View: 'profil', icon: 'person' },
      ...(this.UsersService.isAdmin() ? [{ Label: 'Blog', View: 'blog', icon: 'article' }] : []),
      ...(this.UsersService.isAdmin() ? [{ Label: 'Diffusion email', View: 'diffusion', icon: 'campaign' }] : [])
    ];
  }

  protected override async LoadData(): Promise<void>
  {
  }

  protected override ConfigQueryParams(pParams: Params) : void
  {
    super.ConfigQueryParams(pParams);

    // Vérifier si un paramètre pour ouvrir une modal est présent
    if (pParams['modal'])
    {
      if (pParams['modal'] === 'immodvisor')
      {
        this.IsImmoAidePopupOpen = true;
      }
    }
  }
}
