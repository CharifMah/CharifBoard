import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@core/base/BaseComponent';
import { ProStateService, SidebarStats } from '@core/states/pro-state/pro-state.service';


interface StatItem
{
  key: keyof SidebarStats;
  label: string;
  value: number;
}

@Component({
  selector: 'app-stats-card',
  standalone: true,
  templateUrl: './stats-card.component.html',
  styleUrls: ['./stats-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: []
})
export class StatsCardComponent extends BaseComponent
{
  private _State: ProStateService = inject(ProStateService);

  constructor () 
  {
    super();
  }

  public get Stats(): StatItem[]
  {
    const lStats: SidebarStats = this._State.GetStats();
    return [
      { key: 'DossiersEnCours', label: 'Dossiers en cours', value: lStats.DossiersEnCours },
      { key: 'DossiersHistorique', label: 'Dossiers vendus', value: lStats.DossiersHistorique },
      { key: 'MandatsActifs', label: 'Mandats actifs', value: lStats.MandatsActifs },
      { key: 'TotalCandidatures', label: 'Total candidatures', value: lStats.TotalCandidatures },
      { key: 'ChiffreAffaires', label: "Chiffre d'affaires", value: lStats.ChiffreAffaires },
      { key: 'TauxConversion', label: 'Taux de conversion', value: lStats.TauxConversion }
    ];
  }
}
