import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { GridSkeletonComponent } from '@shared/components/grid-skeleton/grid-skeleton.component';
import { CardSkeletonComponent } from '@shared/components/card-skeleton/card-skeleton.component';
import { GridComponent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';

/**
 * Section du playground demontrant les skeletons : app-skeleton (bloc),
 * app-grid-skeleton (chargement d'une grille entiere), app-card-skeleton,
 * et le skeleton inline sur une cellule / ligne reelles (cas is-cell-saving / is-row-saving).
 *
 * Sert notamment a valider visuellement le fix du bug de positionnement
 * `.grid__cell-saving` (absolute) qui sortait de la cellule faute de
 * `position: relative` sur la cellule parente.
 */
@Component({
  selector: 'app-playground-skeleton-section',
  standalone: true,
  imports: [
    CommonModule,
    PlaygroundSectionComponent,
    SkeletonComponent,
    GridSkeletonComponent,
    CardSkeletonComponent,
    GridComponent,
    GridColumnDirective,
    InputComponent,
    ButtonComponent,
    TooltipComponent
  ],
  templateUrl: './playground-skeleton-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundSkeletonSectionComponent {
  //#region Attributes
  /** Hauteur du skeleton de base (pour le tester en differentes tailles). */
  public readonly SkeletonHeight = signal('16px');
  /** Largeur du skeleton de base (idem). */
  public readonly SkeletonWidth = signal('80%');
  /** Active la grille de demo de cellule en mode saving (test du fix positionnement). */
  public readonly ShowCellSavingDemo = signal(true);
  /** Active la demo d'une ligne entiere en mode saving. */
  public readonly ShowRowSavingDemo = signal(true);
  /** Toggle skeleton en mode compact (checkbox). */
  public readonly CompactSkeleton = signal(false);
  /** Row count pour la grid-skeleton. */
  public readonly SkeletonRowCount = signal(6);
  /** Col count pour la grid-skeleton. */
  public readonly SkeletonColCount = signal(5);
  /** Include actions dans la grid-skeleton. */
  public readonly SkeletonHasActions = signal(true);
  /** Include selection dans la grid-skeleton. */
  public readonly SkeletonSelectable = signal(false);

  /** Donnees factices pour la grille de demo (5 lignes avec colonnes select). */
  public readonly DemoData = signal<DemoContact[]>([
    { id: 1, name: 'Alice Martin', email: 'alice.martin@example.com', role: 'admin', status: 'actif' },
    { id: 2, name: 'Bob Dupont', email: 'bob.dupont@example.com', role: 'user', status: 'actif' },
    { id: 3, name: 'Celine Roy', email: 'celine.roy@example.com', role: 'manager', status: 'inactif' },
    { id: 4, name: 'David Bernard', email: 'david.bernard@example.com', role: 'user', status: 'actif' },
    { id: 5, name: 'Emma Petit', email: 'emma.petit@example.com', role: 'admin', status: 'inactif' }
  ]);

  /** Cle composee row|col utilisee par les methodes Is*Saving simulees. */
  public readonly SavingCells = signal<Set<string>>(new Set(['3|role', '4|status']));
  /** Ligne entiere en mode saving. */
  public readonly SavingRows = signal<Set<number>>(new Set([2]));

  /** Options pour le select "role". */
  public readonly RoleOptions = [
    { Value: 'admin', Label: 'Administrateur' },
    { Value: 'manager', Label: 'Manager' },
    { Value: 'user', Label: 'Utilisateur' }
  ];
  /** Options pour le select "status". */
  public readonly StatusOptions = [
    { Value: 'actif', Label: 'Actif' },
    { Value: 'inactif', Label: 'Inactif' },
    { Value: 'suspendu', Label: 'Suspendu' }
  ];

  /** Snippet copiable app-skeleton. */
  public readonly SkeletonCode: string =
`<app-skeleton [Width]="Width" [Height]="Height" [Size]="Size" />
<app-skeleton Size="sm" />
<app-grid-skeleton [ColumnCount]="5" [RowCount]="8" [Selectable]="true" [HasActions]="true" />
<app-card-skeleton [Count]="6" [HasHint]="true" />`;

  /** Snippet copiable : cellule en mode saving. */
  public readonly CellSavingCode: string =
`<td class="grid__td" [class.is-cell-saving]="IsCellSaving(row, col)">
  @if (IsCellSaving(row, col)) {
    <app-skeleton class="grid__cell-saving" Width="100%" Height="20px" />
  } @else {
    {{ row[col] }}
  }
</td>`;
  //#endregion

  //#region Methods
  /** Definit la cle composee d'une cellule. */
  public KeyToString(v: unknown): string {
    return String(v);
  }

  /** Indique si une cellule simulee est en mode saving (pour le test visuel). */
  public IsCellSaving(row: DemoContact, colKey: string): boolean {
    return this.SavingCells().has(`${row.id}|${colKey}`);
  }

  /** Indique si une ligne simulee est en mode saving. */
  public IsRowSaving(row: DemoContact): boolean {
    return this.SavingRows().has(row.id);
  }

  /** Bascule l'etat saving d'une cellule. */
  public ToggleCellSaving(row: DemoContact, colKey: string): void {
    const key = `${row.id}|${colKey}`;
    const next = new Set(this.SavingCells());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.SavingCells.set(next);
  }

  /** Bascule l'etat saving d'une ligne. */
  public ToggleRowSaving(row: DemoContact): void {
    const next = new Set(this.SavingRows());
    if (next.has(row.id)) next.delete(row.id);
    else next.add(row.id);
    this.SavingRows.set(next);
  }

  /** Reinitialise les flags saving. */
  public ResetSavingFlags(): void {
    this.SavingCells.set(new Set());
    this.SavingRows.set(new Set());
  }

  /** Change la taille du skeleton de base. */
  public SetHeight(value: number | string): void {
    const n = Number(value);
    this.SkeletonHeight.set(Number.isFinite(n) ? `${n}px` : '16px');
  }

  public SetWidth(value: number | string): void {
    const n = Number(value);
    this.SkeletonWidth.set(Number.isFinite(n) ? `${n}%` : '80%');
  }

  /** Accesseur pour le template : convertit '80%' en 80. */
  public GetWidthNumber(): number {
    return Number(String(this.SkeletonWidth()).replace('%', '')) || 80;
  }

  /** Accesseur pour le template : convertit '16px' en 16. */
  public GetHeightNumber(): number {
    return Number(String(this.SkeletonHeight()).replace('px', '')) || 16;
  }

  /** Wrapper Number global pour les templates Angular. */
  public readonly Number = Number;

  /** TrackBy pour le @for de la grille de demo. */
  public TrackById = (_: number, item: DemoContact): unknown => item.id;
  /** Version any pour le binding [TrackBy] d'app-grid (cast pour eviter l'inference T=number). */
  public TrackByAny = (_: unknown, item: { id: unknown }): unknown => item.id;

  /**
   * Calcule le delai d'animation shimmer (en ms) pour les cellules en mode saving
   * de la grille de demo locale. Decalage de 0.18s par ligne, modulo la duree du cycle.
   * @param pRowIdx Index de la ligne (0-based).
   * @returns Le delai en millisecondes.
   */
  public ComputeDemoShimmerDelay(pRowIdx: number): number {
    return (pRowIdx * 180) % 1400;
  }
  //#endregion
}

interface DemoContact {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}
