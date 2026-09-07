import { Component } from '@angular/core';

interface SliderDef {
  Title: string;
  /** Nombre d'éléments dans le dossier. */
  Count: number;
  /** Chemin relatif sous images/. */
  FolderPath: string;
  /** true si le dossier contient des vidéos mp4 au lieu d'images png. */
  IsVideo: boolean;
}

/**
 * Carrousels de créations (WPF, Cinema4D/Photoshop, AfterEffect/SonyVegas).
 * Navigation par ancres : chaque slide a un id slide-{i}-{n} et un bouton rond.
 */
@Component({
  selector: 'app-sliders',
  standalone: true,
  templateUrl: './sliders.component.html',
  styleUrl: './sliders.component.scss',
})
export class SlidersComponent {
  /** Définition des carrousels affichés. */
  public readonly Sliders: SliderDef[] = [
    { Title: 'Création WPF/C# 2022-2023', Count: 13, FolderPath: 'WPFCreation', IsVideo: false },
    { Title: 'Création Cinema 4d / Photoshop / 2013-2017', Count: 7, FolderPath: 'Cinema4d-Photoshop', IsVideo: false },
    { Title: 'Création After Effect / Sony Vegas / 2016-2017', Count: 2, FolderPath: 'AfterEffect-SonyVegas', IsVideo: true },
  ];

  /**
   * Construit le chemin d'un fichier du carrousel.
   * @param pSlider Carrousel.
   * @param pIndex Index 1-based de l'élément.
   */
  public ItemSrc(pSlider: SliderDef, pIndex: number): string {
    const lExt = pSlider.IsVideo ? 'mp4' : 'png';
    return `images/${pSlider.FolderPath}/${pIndex}.${lExt}`;
  }

  /**
   * Id d'ancre d'une slide.
   * @param pSliderIndex Index du carrousel.
   * @param pItemIndex Index 1-based de l'élément.
   */
  public SlideId(pSliderIndex: number, pItemIndex: number): string {
    return `slide-${pSliderIndex}-${pItemIndex}`;
  }
}