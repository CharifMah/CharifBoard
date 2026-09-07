import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersDTO, ApplicationsDTO, OpportunitiesDTO } from '@core/sellmatchdb/dto';
import { VendeurStateService } from '@core/states/vendeur-state/vendeur-state.service';
import { BaseComponent } from '@core/base/BaseComponent';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { CandidatPopupComponent } from '@views/Dashboards/vendeur/candidats/candidat-popup/candidat-popup.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { EFeeType } from '@views/Dashboards/vendeur/candidats/candidature-popup/steps/step-honoraires/EFeeType';
import { AvatarComponent } from '@shared/components/Avatar/avatar.component';
import { TabsComponent, TabItem } from '@shared/components/tabs/tabs.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-candidats',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PopupComponent,
    CandidatPopupComponent,
    BadgeComponent,
    AvatarComponent,
    TabsComponent,
    InputComponent,
    ButtonComponent
  ],
  templateUrl: './candidats.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./candidats.component.scss']
})
export class CandidatsComponent extends BaseComponent implements OnInit
{
  private readonly _vendeurState = inject(VendeurStateService);

  public EFeeType = EFeeType;

  _User: UsersDTO | null = null;
  _Loading = true;
  _SearchQuery = '';
  _ActiveTab = 'tous';

  _Opportunites: OpportunitiesDTO[] = [];
  _SelectedOpportunite: OpportunitiesDTO | null = null;

  _Applications: ApplicationsDTO[] = [];
  _CandidatsFiltres: ApplicationsDTO[] = [];
  _CandidatSelectionne: ApplicationsDTO | null = null;

  _ShowCandidatPopup = false;
  _ShowConfirmationPopup = false;
  _ConfirmationRaison = '';
  _CandidatForAction: ApplicationsDTO | null = null;

  _TabItems: TabItem[] = [];

  async ngOnInit(): Promise<void>
  {
    try
    {
      this._Opportunites = await this._vendeurState.LoadCandidatsOpp();

      if (this._Opportunites.length > 0)
      {
        await this._ChargerCandidats(this._Opportunites[0]);
      }
    } catch (error)
    {
      console.error('Erreur chargement opportunités:', error);
    } finally
    {
      this._Loading = false;
    }
  }

  // --- Chargement candidats ---

  private async _ChargerCandidats(pOpportunite: OpportunitiesDTO): Promise<void>
  {
    this._SelectedOpportunite = pOpportunite;
    this._Loading = true;

    try
    {
      if (pOpportunite.applications)
      {
        this._Applications = pOpportunite.applications;

        this._AppliquerFiltres();
        this._UpdateTabItems();
      }
    } catch (error)
    {
      console.error('Erreur chargement candidats:', error);
      this._Applications = [];
      this._CandidatsFiltres = [];
    } finally
    {
      this._Loading = false;
    }
  }

  // --- Popup Candidat ---

  OuvrirPopupCandidat(pCandidat: ApplicationsDTO): void
  {
    this._CandidatSelectionne = pCandidat;
    this._ShowCandidatPopup = true;
  }

  OnCandidatPopupChange(pIsOpen: boolean): void
  {
    this._ShowCandidatPopup = pIsOpen;
    if (!pIsOpen) this._CandidatSelectionne = null;
  }

  // --- Filtres & Tabs ---

  AppliquerFiltres(): void
  {
    this._AppliquerFiltres();
  }

  ChangerOnglet(pOnglet: string): void
  {
    if (pOnglet === 'tous' || pOnglet === 'selectionnes')
    {
      this._ActiveTab = pOnglet;
      this._AppliquerFiltres();
    }
  }

  async ChangerOpportunite(pEvent: Event): Promise<void>
  {
    const lId = +(pEvent.target as HTMLSelectElement).value;
    const lOpp = this._Opportunites.find(o => o.id === lId);

    if (lOpp)
    {
      this._vendeurState.SelectDossier(lOpp);
      await this._ChargerCandidats(lOpp);
    }
  }

  GetSelectedCount(): number
  {
    return this._Applications.filter(c => c.selectedAt).length;
  }

  // --- Confirmation ---

  OuvrirPopupConfirmation(pCandidat: ApplicationsDTO): void
  {
    if (pCandidat.selectedAt) return;

    this._CandidatForAction = pCandidat;
    this._ConfirmationRaison = `Sélectionner ${pCandidat.professional?.firstName || 'ce professionnel'} pour cette opportunité ?`;
    this._ShowConfirmationPopup = true;
  }

  async ConfirmerAction(): Promise<void>
  {
    if (!this._CandidatForAction || !this._SelectedOpportunite)
    {
      this._ResetConfirmation();
      return;
    }

    this.BusyService.show();
    try
    {
      // Sélectionner la candidature
      await this._vendeurState.SelectionnerCandidature(this._CandidatForAction);

      // Recharger toutes les opportunités
      this._Opportunites = await this._vendeurState.LoadCandidatsOpp();

    } catch (error)
    {
      console.error('Erreur lors de la confirmation:', error);
    } finally
    {
      this.BusyService.hide();
      this._ResetConfirmation();
    }
  }

  AnnulerAction(): void
  {
    this._ResetConfirmation();
  }

  // --- Helpers ---

  IsNewCandidat(pCandidat: ApplicationsDTO): boolean
  {
    if (!pCandidat.createdAt) return false;
    const lDiffHours = (Date.now() - new Date(pCandidat.createdAt).getTime()) / 3_600_000;
    return lDiffHours < 48 && !pCandidat.selectedAt;
  }

  GetScoreClass(pScore: number): string
  {
    if (pScore >= 85) return 'score-excellent';
    if (pScore >= 70) return 'score-good';
    if (pScore >= 50) return 'score-medium';
    return 'score-low';
  }

  GetTimeAgo(pDate: Date | string | undefined): string
  {
    if (!pDate) return '';

    const lDiffMs = Date.now() - new Date(pDate).getTime();
    const lMins = Math.floor(lDiffMs / 60_000);
    const lHours = Math.floor(lDiffMs / 3_600_000);
    const lDays = Math.floor(lDiffMs / 86_400_000);

    if (lMins < 60) return `Il y a ${lMins} min`;
    if (lHours < 24) return `Il y a ${lHours}h`;
    if (lDays === 1) return 'Hier';
    if (lDays < 7) return `Il y a ${lDays} jours`;

    return new Date(pDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  getStatusClass(candidat: ApplicationsDTO): string
  {
    return candidat.selectedAt ? 'selected' : 'pending';
  }

  isSelectedCandidate(candidat: ApplicationsDTO): boolean
  {
    return !!candidat.selectedAt;
  }

  // --- Privé ---

  private _AppliquerFiltres(): void
  {
    let result = this._Applications ?? [];

    if (this._SearchQuery)
    {
      const q = this._SearchQuery.toLowerCase();
      result = result.filter(c =>
        c.professional?.firstName?.toLowerCase().includes(q) ||
        c.professional?.lastName?.toLowerCase().includes(q) ||
        c.professional?.email?.toLowerCase().includes(q)
      );
    }

    if (this._ActiveTab === 'selectionnes')
    {
      result = result.filter(c => c.selectedAt != null);
    }

    this._CandidatsFiltres = result;
  }

  private _UpdateTabItems(): void
  {
    this._TabItems = [
      { id: 'tous', label: 'Tous les candidats', icon: 'inbox', badge: this._Applications.length, badgeAnimated: false, badgePulse: false, disabled: false },
      { id: 'selectionnes', label: 'Sélectionnés', icon: 'check_circle', badge: this.GetSelectedCount(), badgeIcon: 'check_circle', badgeAnimated: true, badgePulse: true, disabled: false }
    ];
  }

  private _ResetConfirmation(): void
  {
    this._ShowConfirmationPopup = false;
    this._ShowCandidatPopup = false;
    this._CandidatForAction = null;
    this._ConfirmationRaison = '';
  }
}
