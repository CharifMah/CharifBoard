import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { BaseComponent } from '@core/base/BaseComponent';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ListComponent } from '@shared/components/List/list.component';
import { VendeurStateService } from '@core/states/vendeur-state/vendeur-state.service';
import { OpportunitiesDTO, ApplicationsDTO } from '@core/sellmatchdb/dto';
import { CandidatPopupComponent } from '../candidat-popup/candidat-popup.component';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '@shared/components/Avatar/avatar.component';

@Component({
  selector: 'app-candidats-card',
  standalone: true,
  templateUrl: './candidats-card.component.html',
  styleUrls: ['./candidats-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, ButtonComponent, ListComponent, SectionCardComponent, CandidatPopupComponent, PopupComponent, AvatarComponent, RouterLink]
})
export class CandidatsCardComponent extends BaseComponent implements OnInit, OnDestroy {
  //#region Services
  private readonly _State: VendeurStateService = inject(VendeurStateService);
  //#endregion

  //#region Properties
  private _Subscriptions: Subscription[] = [];

  public DossierSelectionne: OpportunitiesDTO | null = null;
  public ActiveTab: string = 'en_cours';
  public Candidats: ApplicationsDTO[] = [];
  _ShowConfirmationPopup: boolean = false;
  // Propriétés pour le popup
  public _ShowCandidatPopup: boolean = false;
  public _CandidatSelectionne: ApplicationsDTO | null = null;
  //#endregion
  //#region State - Confirmation
  _ConfirmationRaison: string = '';
  _CandidatForAction: ApplicationsDTO | null = null;
  //#endregion
  //#region Lifecycle
  public ngOnInit(): void {
    this._Subscriptions.push(
      this._State.SelectedDossier$.subscribe(async (pDossier: OpportunitiesDTO | null) => {
        this.DossierSelectionne = pDossier;
        this.Candidats = await this._State.LoadCandidatsForDossier(pDossier);
      }),
      this._State.ActiveTab$.subscribe((pTab: string) => {
        this.ActiveTab = pTab;
      })
    );
  }

  public ngOnDestroy(): void {
    this._Subscriptions.forEach((pSub: Subscription) => pSub.unsubscribe());
  }
  //#endregion

  //#region Helpers
  public GetCandidatNom(pApp: ApplicationsDTO): string {
    const lPro = pApp.professional;
    if (!lPro) return 'Sans nom';
    return `${lPro.firstName ?? ''} ${lPro.lastName ?? ''}`.trim() || 'Sans nom';
  }

  public GetCandidatStatut(pApp: ApplicationsDTO): string {
    if (pApp.rejectedAt) return 'Refusé';
    if (pApp.selectedAt) return 'Sélectionné';
    if (pApp.shortlistedAt) return 'Présélectionné';
    return 'En attente';
  }

  public GetCandidatStatutClass(pApp: ApplicationsDTO): string {
    if (pApp.rejectedAt) return 'statut-inactif';
    if (pApp.selectedAt) return 'statut-premium';
    if (pApp.shortlistedAt) return 'statut-actif';
    return 'statut-attente';
  }
  //#endregion

  //#region Actions
  public VoirCandidat(pApp: ApplicationsDTO): void {
    this._CandidatSelectionne = pApp;
    this._ShowCandidatPopup = true;
  }

  public GoToCandidats(): void {
    this.Nav.Go('candidats');
  }

  // Méthodes pour gérer le popup
  public OnCandidatPopupChange(isOpen: boolean): void {
    this._ShowCandidatPopup = isOpen;
    if (!isOpen) {
      this._CandidatSelectionne = null;
    }
  }

  //#region Confirmation Popup
  public OuvrirPopupConfirmation(pCandidat: ApplicationsDTO): void {
    // Si le candidat est déjà sélectionné, ne rien faire
    if (pCandidat.selectedAt) {
      return;
    }

    this._CandidatForAction = pCandidat;
    this._ConfirmationRaison = `Sélectionner ${pCandidat.professional?.firstName || 'ce professionnel'} pour cette opportunité ?`;
    this._ShowConfirmationPopup = true;
  }

  public async ConfirmerAction(): Promise<void> {
    this.BusyService.show();
    if (!this._CandidatForAction) {
      this._ResetConfirmation();
      return;
    }

    await this._State.SelectionnerCandidature(this._CandidatForAction);
    this._ResetConfirmation();

    this.BusyService.hide();
  }

  public AnnulerAction(): void {
    this._ResetConfirmation();
  }

  private _ResetConfirmation(): void {
    this._ShowConfirmationPopup = false;
    this._ShowCandidatPopup = false;
    this._CandidatForAction = null;
    this._ConfirmationRaison = '';
  }

  //#endregion

  //#endregion
}
