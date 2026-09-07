import { Component, inject, ViewChild, ElementRef, OnDestroy, AfterViewInit, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';

import { BaseComponent } from '@base/BaseComponent';
import { EvolutionMensuellePrixCommuneDTO } from '@core/dvfdb/dto/EvolutionMensuellePrixCommune/EvolutionMensuellePrixCommuneDTO';
import { EvolutionMensuellePrixCommuneCritereDTO } from '@core/dvfdb/dto/EvolutionMensuellePrixCommune/EvolutionMensuellePrixCommuneCritereDTO';
import { EvolutionMensuellePrixCommuneService } from '@core/dvfdb/services/EvolutionMensuellePrixCommune/EvolutionMensuellePrixCommuneService';

import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-evolution-mensuelle-prix-commune',
  standalone: true,
  templateUrl: './evolution-mensuelle-prix-commune.component.html',
  styleUrls: ['./evolution-mensuelle-prix-commune.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: []
})
export class EvolutionMensuellePrixCommuneComponent
  extends BaseComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  //#region Constants
  private readonly _DefaultNbMoisHistorique: number = 120;
  private readonly _DefaultValeurFoncMin: number = 10000;
  private readonly _DefaultSurfaceBatiMin: number = 9;
  private readonly _EvolutionColor: string = '#2563eb';
  private readonly _MedianColor: string = '#10b981';
  private readonly _SalesColor: string = '#f59e0b';
  //#endregion

  //#region Fields
  private readonly _Service: EvolutionMensuellePrixCommuneService = inject(EvolutionMensuellePrixCommuneService);

  private _ChartInstance: echarts.ECharts | null = null;
  private _ResizeHandler: () => void = (): void => this._ChartInstance?.resize();
  private _ResizeObserver: ResizeObserver | null = null;
  private _ChartContainerRef?: ElementRef<HTMLDivElement>;
  //#endregion

  //#region ViewChild
  @ViewChild('chartContainer')
  public set ChartContainerRef(pChartContainerRef: ElementRef<HTMLDivElement> | undefined)
  {
    this._ChartContainerRef = pChartContainerRef;
    this.InitChart();
  }
  //#endregion

  //#region State
  /**
   * Code postal utilisé pour charger l'évolution mensuelle.
   */
  @Input()
  public Longitude: number | null = null;

  /**
   * Latitude utilisée pour charger l'évolution mensuelle.
   */
  @Input()
  public Latitude: number | null = null;

  /**
   * Rayon de recherche en mètres utilisé pour charger l'évolution mensuelle.
   */
  @Input()
  public RayonMetres: number = 5000;

  /**
   * Type de bien utilisé pour charger l'évolution mensuelle.
   */
  @Input()
  public TypeBien: string = 'tous';

  public Data: EvolutionMensuellePrixCommuneDTO[] = [];
  //#endregion

  constructor () { super(); }

  //#region Lifecycle
  public ngAfterViewInit(): void
  {
    this.InitChart();
  }

  /**
   * Détecte les changements de paramètres transmis par le parent.
   * @param pChanges Changements détectés sur les inputs
   */
  public ngOnChanges(pChanges: SimpleChanges): void
  {
    if (pChanges['Longitude'] || pChanges['Latitude'] || pChanges['RayonMetres'] || pChanges['TypeBien'])
    {
      this.LoadFromInputs();
    }
  }

  public ngOnDestroy(): void
  {
    window.removeEventListener('resize', this._ResizeHandler);
    this._ResizeObserver?.disconnect();
    this._ResizeObserver = null;
    this._ChartInstance?.dispose();
    this._ChartInstance = null;
  }
  //#endregion

  //#region Public API (appelée par le parent via ViewChild)
  /**
   * Charge les données et met à jour le graphique.
   * Méthode unique appelée explicitement par le parent.
  * @param pLongitude  Longitude du point de recherche
  * @param pLatitude   Latitude du point de recherche
   * @param pTypeBien   Type de bien (tous, maison, appartement)
   * @returns Une promesse résolue une fois le graphique mis à jour
   */
  public async Load(pLongitude: number | null, pLatitude: number | null, pTypeBien: string = 'tous', pRayonMetres: number = 5000): Promise<void>
  {
    if (pLongitude === null || pLatitude === null || !this._ChartInstance) return;

    this._ChartInstance.showLoading('default', { text: 'Chargement...', color: '#9c27b0' });

    try
    {
      const lCritere: EvolutionMensuellePrixCommuneCritereDTO = {
        Longitude: pLongitude,
        Latitude: pLatitude,
        RayonMetres: pRayonMetres,
        TypeBien: pTypeBien || 'tous',
        NbMoisHistorique: this._DefaultNbMoisHistorique,
        ValeurFoncMin: this._DefaultValeurFoncMin,
        SurfaceBatiMin: this._DefaultSurfaceBatiMin
      };

      this.Data = (await this._Service.getAll(lCritere)) ?? [];
      this.UpdateChart();
    }
    catch (pError)
    {
      console.error('Erreur chargement données', pError);
      this.Data = [];
      this.UpdateChart();
    }
    finally
    {
      this._ChartInstance?.hideLoading();
    }
  }
  //#endregion

  //#region Private
  /**
   * Initialise le graphique dès que le container DOM existe.
   * @returns Void
   */
  private InitChart(): void
  {
    const lChartContainer: HTMLDivElement | undefined = this._ChartContainerRef?.nativeElement;
    if (!lChartContainer || this._ChartInstance) return;

    this._ChartInstance = echarts.init(lChartContainer);
    window.addEventListener('resize', this._ResizeHandler);
    this._ResizeObserver = new ResizeObserver((): void => this._ChartInstance?.resize());
    this._ResizeObserver.observe(lChartContainer);
    this.LoadFromInputs();
  }

  /**
   * Charge le graphique depuis les paramètres reçus en input.
   * @returns Une promesse résolue une fois le graphique mis à jour
   */
  private async LoadFromInputs(): Promise<void>
  {
    if (this.Longitude === null || this.Latitude === null || !this._ChartInstance) return;

    await this.Load(this.Longitude, this.Latitude, this.TypeBien || 'tous', this.RayonMetres);
  }

  private UpdateChart(): void
  {
    if (!this._ChartInstance) return;

    const lChartWidth: number = this._ChartContainerRef?.nativeElement.clientWidth ?? 0;
    const lIsCompact: boolean = lChartWidth > 0 && lChartWidth <= 430;
    const lIsVeryCompact: boolean = lChartWidth > 0 && lChartWidth <= 375;

    const lSortedData: EvolutionMensuellePrixCommuneDTO[] = [...this.Data]
      .filter((pItem: EvolutionMensuellePrixCommuneDTO): boolean => !!pItem.mois)
      .sort((pLeft: EvolutionMensuellePrixCommuneDTO, pRight: EvolutionMensuellePrixCommuneDTO): number =>
        new Date(pLeft.mois).getTime() - new Date(pRight.mois).getTime());

    const lDates: string[] = lSortedData.map((pItem: EvolutionMensuellePrixCommuneDTO): string =>
      new Date(pItem.mois).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));

    const lMedianPrices: number[] = lSortedData.map((pItem: EvolutionMensuellePrixCommuneDTO): number =>
      Math.round(pItem.prixM2MedianMois ?? 0));

    const lRollingPrices: number[] = lSortedData.map((pItem: EvolutionMensuellePrixCommuneDTO): number =>
      Math.round(pItem.prixM2MoyenGlissant12M ?? 0));

    const lSales: number[] = lSortedData.map((pItem: EvolutionMensuellePrixCommuneDTO): number =>
      pItem.nbVentesMois ?? 0);

    const lHasData: boolean = lSortedData.length > 0;

    const lOption: EChartsOption = {
      backgroundColor: 'transparent',
      title: lHasData ? undefined : {
        text: 'Aucune donnée disponible pour ce secteur',
        left: 'center', top: 'center',
        textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 'normal' }
      },
      legend: {
        show: lHasData,
        top: lIsCompact ? 4 : 0,
        left: 'center',
        orient: lIsVeryCompact ? 'vertical' : 'horizontal',
        itemWidth: lIsCompact ? 12 : 18,
        itemHeight: lIsCompact ? 6 : 8,
        itemGap: lIsCompact ? 6 : 10,
        textStyle: { color: '#4b5563', fontSize: lIsCompact ? 10 : 12, width: lIsVeryCompact ? 160 : undefined, overflow: 'truncate' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#111827' } },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e5e7eb', borderWidth: 1,
        extraCssText: 'box-shadow:0 12px 32px rgba(15,23,42,.14);border-radius:8px;',
        textStyle: { color: '#111827' },
        formatter: (pParams: any): string =>
        {
          const lItems: any[] = Array.isArray(pParams) ? pParams : [pParams];
          const lRows: string = lItems.map((pData: any): string =>
            `<div style="display:flex;justify-content:space-between;gap:18px;margin-top:6px;">
               <span>${pData.marker}${pData.seriesName}</span>
               <strong>${this.FormatTooltipValue(pData.seriesName, pData.value)}</strong>
             </div>`).join('');

          return `<div style="min-width:210px;padding:8px 10px;">
                    <strong>${lItems[0]?.name ?? ''}</strong>
                    ${lRows}
                  </div>`;
        }
      },
      grid: {
        left: lIsCompact ? 4 : '4%',
        right: lIsCompact ? 4 : '4%',
        bottom: lIsCompact ? 58 : 54,
        top: lIsVeryCompact ? 92 : lIsCompact ? 68 : 46,
        containLabel: true
      },
      xAxis: {
        type: 'category', boundaryGap: false, data: lDates, show: lHasData,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisLabel: {
          color: '#6b7280',
          fontSize: lIsCompact ? 9 : 11,
          rotate: lIsCompact ? 45 : lDates.length > 36 ? 45 : 0,
          hideOverlap: true,
          interval: lIsCompact ? 'auto' : 0,
          margin: lIsCompact ? 10 : 8
        }
      },
      yAxis: [
        {
          type: 'value', show: lHasData, name: lIsCompact ? '' : 'Prix / m²', axisLine: { show: false },
          splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } },
          axisLabel: { color: '#6b7280', fontSize: lIsCompact ? 9 : 11, formatter: (pValue: number): string => this.FormatCurrencyShort(pValue) }
        },
        {
          type: 'value', show: lHasData && !lIsVeryCompact, name: lIsCompact ? '' : 'Ventes', axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#6b7280', fontSize: lIsCompact ? 9 : 11, formatter: (pValue: number): string => pValue.toLocaleString('fr-FR') }
        }
      ],
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', height: lIsCompact ? 14 : 18, bottom: lIsCompact ? 12 : 14, borderColor: '#e5e7eb', fillerColor: 'rgba(37,99,235,.16)', handleStyle: { color: this._EvolutionColor } }
      ],
      series: [{
        name: 'Prix median / m²', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        lineStyle: { width: 3, color: this._EvolutionColor },
        itemStyle: { color: this._EvolutionColor },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37, 99, 235, 0.28)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.02)' }
          ])
        },
        emphasis: { focus: 'series' },
        data: lMedianPrices
      }, {
        name: 'Moyenne glissante 12 mois', type: 'line', smooth: true, symbol: 'none',
        lineStyle: { width: 3, color: this._MedianColor },
        emphasis: { focus: 'series' },
        data: lRollingPrices
      }, {
        name: 'Ventes mensuelles', type: 'bar', yAxisIndex: 1, barMaxWidth: 18,
        itemStyle: { color: `${this._SalesColor}52`, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: 'rgba(245, 158, 11, 0.55)' } },
        data: lSales
      }]
    };

    this._ChartInstance.setOption(lOption, true);
    setTimeout((): void => this._ChartInstance?.resize(), 50);
  }

  private FormatCurrencyShort(pValue: number): string
  {
    return `${Math.round(pValue).toLocaleString('fr-FR')} €`;
  }

  private FormatTooltipValue(pSeriesName: string, pValue: number): string
  {
    if (pSeriesName === 'Ventes mensuelles')
    {
      return `${pValue.toLocaleString('fr-FR')} ventes`;
    }

    return `${Math.round(pValue).toLocaleString('fr-FR')} €/m²`;
  }
  //#endregion
}
