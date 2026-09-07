// home-pro.component.ts
import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';


import { BaseComponent } from '@core/base/BaseComponent';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';
import { SplitterComponent } from '@shared/components/Splitter/splitter.component';
import { MessageCardComponent } from '@components/MessageCard/message-card.component';
import { StatsCardComponent } from '@components/StatsCard/stats-card.component';
import { MandatsComponent } from '../mandats/mandats.component';
import { OpportunitiesComponent } from '../Opportunities/opportunities.component';

@Component({
  selector: 'app-home-pro',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SectionCardComponent,
    SplitterComponent,
    MessageCardComponent,
    StatsCardComponent,
    MandatsComponent,
    OpportunitiesComponent
],
  templateUrl: './home-pro.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./home-pro.component.scss']
})
export class HomeProComponent extends BaseComponent {
  @Output() NavigateTo = new EventEmitter<string>();
  @Output() openNewDossier = new EventEmitter<void>();

  //#region Navigation
  /**
   * Navigation vers la vue dédiée des messages ("Voir tout" de la section Messages).
   */
  public GoToMessages(): void
  {
    this.Nav.Go('messages');
  }
  //#endregion
}