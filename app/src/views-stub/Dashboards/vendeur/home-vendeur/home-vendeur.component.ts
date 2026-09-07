// dashboard-home.component.ts
import { Component, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { Subscription } from 'rxjs';

import { BaseComponent } from '@core/base/BaseComponent';

import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { DossiersComponent } from '@views/Dashboards/vendeur/dossiers/dossiers.component';


@Component({
  selector: 'app-home-vendeur',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    DossiersComponent
],
  templateUrl: './home-vendeur.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./home-vendeur.component.scss']
})
export class HomeVendeurComponent extends BaseComponent implements OnInit, OnDestroy
{
  //#region Outputs
  @Output() NavigateTo = new EventEmitter<string>();
  @Output() openNewDossier = new EventEmitter<void>();
  //#endregion

  //#region Subscriptions
  private _Subscriptions: Subscription[] = [];
  //#endregion

  //#region State
  public UserName: string = '';
  //#endregion

  //#region Lifecycle
  ngOnInit(): void
  {
    this._Subscriptions.push(
      this.UsersService.currentUser$.subscribe(user =>
      {
        if (user)
        {
          this.UserName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }
      })
    );
  }

  ngOnDestroy(): void
  {
    this._Subscriptions.forEach(s => s.unsubscribe());
  }
  //#endregion

  //#region Actions
  public onNouveauDossier(): void
  {
    this.openNewDossier.emit();
  }
    
  public onNavigate(route: any): void
  {
    this.NavigateTo.emit(route);
  }
  //#endregion
}
