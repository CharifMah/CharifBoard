import { Component, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { MapCardComponent } from '@shared/components/map-card/map-card.component';
import { EMapStyle } from '@shared/components/map-card/EMapStyle';
import { IMapMarker } from '@shared/components/map-card/IMapMarker';
import { SectionCardComponent } from '@shared/components/section-card/section-card.component';
import { ButtonComponent } from '@shared/components/button/button.component';

/**
 * Section dediee du playground : composant MapCard (carte interactive MapLibre).
 * Demo wrappee dans un SectionCard (Collapsible=true) avec selecteur de style (5 boutons) dans le slot header-actions.
 */
@Component({
  selector: 'app-playground-map-section',
  standalone: true,
  imports: [
    PlaygroundSectionComponent,
    MapCardComponent,
    SectionCardComponent,
    ButtonComponent
  ],
  templateUrl: './playground-map-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundMapSectionComponent extends BaseComponent
{
  /** Reference vers la carte de demo (pour InvalidateSize au depliage). */
  @ViewChild('playgroundMap') private readonly _PlaygroundMap!: MapCardComponent;

  /** Marqueurs de la MapCard demo (Paris). */
  public readonly MapMarkers: IMapMarker[] = [
    { Lat: 48.8566, Lng: 2.3522, Title: 'Paris', Popup: 'Centre de Paris', Icon: 'location_on' },
    { Lat: 48.8606, Lng: 2.3376, Title: 'Louvre', Popup: 'Musee du Louvre', Color: '#1976d2' }
  ];

  /** Style initial de la MapCard demo. */
  public MapStyle: EMapStyle = EMapStyle.Streets;

  /** Liste des styles de carte disponibles (utilisee par le selecteur du header). */
  public readonly MapStyles: { Value: EMapStyle; Label: string; Icon: string }[] = [
    { Value: EMapStyle.Streets, Label: 'Standard', Icon: 'map' },
    { Value: EMapStyle.Light, Label: 'Clair', Icon: 'light_mode' },
    { Value: EMapStyle.Dark, Label: 'Sombre', Icon: 'dark_mode' },
    { Value: EMapStyle.Satellite, Label: 'Satellite', Icon: 'satellite_alt' },
    { Value: EMapStyle.Terrain, Label: 'Terrain', Icon: 'terrain' }
  ];

  /** Snippet copiable MapCard (pattern wrapper). */
  public readonly MapCardCode: string = `<app-section-card [Collapsible]="true" Icon="map">
  <div slot="header-title">
    <h3>Carte des transactions</h3>
  </div>
  <div slot="header-actions">
    @for (lStyle of MapStyles; track lStyle.Value) {
      <app-button variant="ghost" size="sm" [circle]="true" [icon]="lStyle.Icon"
        [class.is-active]="MapStyle === lStyle.Value"
        (ButtonClick)="OnMapStyleChange(lStyle.Value)">
      </app-button>
    }
  </div>
  <app-map-card [Style]="MapStyle" [Markers]="markers" [ShowHeader]="false"
    [ShowStyleSelector]="false" (MapClick)="onMapClick($event)" />
</app-section-card>`;

  /**
   * Gere le clic sur la carte demo.
   * @param pCoords Les coordonnees { Lat, Lng } du clic.
   */
  public OnMapClick(pCoords: { Lat: number; Lng: number }): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_map_click', 'tracking'), pCoords);
  }

  /**
   * Gere le changement de style de carte via les boutons du slot header-actions.
   * @param pStyle Le nouveau style selectionne.
   */
  public OnMapStyleChange(pStyle: EMapStyle): void
  {
    this.MapStyle = pStyle;
    this.PostHog.Capture(this.BuildTrackingName('playground_map_style', 'tracking'), { style: pStyle });
  }

  /**
   * Gere le pliage/depliage de la carte de demo.
   * Au depliage, invalide le resize MapLibre pour recalculer la viewport.
   * @param pCollapsed `true` si la carte vient d'etre pliee, `false` si depliee.
   */
  public OnMapCollapsedChange(pCollapsed: boolean): void
  {
    if (pCollapsed) {
      return;
    }
    this._PlaygroundMap?.InvalidateSize();
    this.PostHog.Capture(this.BuildTrackingName('playground_map_collapsed', 'tracking'), { collapsed: pCollapsed });
  }

  /**
   * Gere le clic sur un marqueur de la carte demo.
   * @param pMarker Le marqueur clique.
   */
  public OnMarkerClick(pMarker: IMapMarker): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_marker_click', 'tracking'), { title: pMarker.Title });
  }
}