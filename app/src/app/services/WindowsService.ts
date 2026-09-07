import { Injectable, signal } from '@angular/core';

export type WindowId = 'cvWindows' | 'Comp';

/**
 * Service central des fenêtres modales (CV, compétences).
 * Une seule fenêtre ouverte à la fois.
 */
@Injectable({ providedIn: 'root' })
export class WindowsService {
  /** Identifiant de la fenêtre actuellement ouverte, null si aucune. */
  public readonly OpenWindow = signal<WindowId | null>(null);

  /**
   * Ouvre une fenêtre (ferme les autres).
   * @param pId Identifiant de la fenêtre.
   */
  public Open(pId: WindowId): void {
    this.OpenWindow.set(pId);
  }

  /**
   * Ferme la fenêtre si elle est ouverte.
   * @param pId Identifiant de la fenêtre.
   */
  public Close(pId: WindowId): void {
    if (this.OpenWindow() === pId) {
      this.OpenWindow.set(null);
    }
  }
}