import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { GridComponent, GridCellEditedEvent, GridActionEvent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { ListComponent } from '@shared/components/List/list.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';

/** Ligne de la grid demo. */
interface IPlaygroundGridRow
{
  id: number;
  nom: string;
  email: string;
  role: string;
  actif: boolean;
  salaire: number;
}

/** Item de la liste demo. */
interface IPlaygroundListItem
{
  id: number;
  nom: string;
  role: string;
  actif: boolean;
}

/**
 * Section dediee du playground : Grid + List + Pagination (famille donnees).
 */
@Component({
  selector: 'app-playground-grid-list-section',
  standalone: true,
  imports: [
    PlaygroundSectionComponent,
    GridComponent,
    GridColumnDirective,
    ListComponent,
    PaginationComponent
  ],
  templateUrl: './playground-grid-list-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundGridListSectionComponent extends BaseComponent
{
  /** Donnees de la grid exemple. */
  public readonly GridData = signal<IPlaygroundGridRow[]>([
    { id: 1, nom: 'Dupont Jean', email: 'jean.dupont@example.com', role: 'Admin', actif: true, salaire: 45000 },
    { id: 2, nom: 'Martin Sophie', email: 'sophie.martin@example.com', role: 'User', actif: false, salaire: 32000 },
    { id: 3, nom: 'Bernard Paul', email: 'paul.bernard@example.com', role: 'Manager', actif: true, salaire: 51000 }
  ]);

  /** Factory de nouvelle ligne pour la grid (ajout de ligne). */
  public readonly NewGridRow = (): IPlaygroundGridRow => ({ id: 0, nom: '', email: '', role: 'User', actif: false, salaire: 0 });

  /** Items de l'exemple List. */
  public readonly ListItems: IPlaygroundListItem[] = [
    { id: 1, nom: 'Jean Dupont', role: 'Admin', actif: true },
    { id: 2, nom: 'Sophie Martin', role: 'User', actif: false },
    { id: 3, nom: 'Paul Bernard', role: 'Manager', actif: true }
  ];

  /** Snippet copiable Grid. */
  public readonly GridCode: string = `<app-grid [Data]="data()" [Editable]="true" [Selectable]="true"
  EditActionLabel="Modifier" DeleteActionLabel="Supprimer"
  [Filterable]="true" [FilterFields]="fields"
  [AllowExport]="true" [ExportFilenamePrefix]="'candidats'"
  (CellEdited)="onEdit($event)" (ActionClicked)="onAction($event)" (Exported)="onExported($event)"
  StorageKey="ma-grid">
  <app-grid-column Key="nom" Label="Nom" [Sortable]="true" [Editable]="true" />
  <app-grid-column Key="role" Label="Role" [Editable]="true" EditorType="select"
    [EditorOptions]="[{Value:'admin',Label:'Admin'}]" />
</app-grid>`;

  /** Snippet copiable List. */
  public readonly ListCode: string = `<app-list [Items]="items" [Paginated]="true" [PageSize]="5">
  <ng-template #itemTemplate let-item>
    <strong>{{ item.nom }}</strong>
  </ng-template>
</app-list>`;

  /** Snippet copiable Pagination. */
  public readonly PaginationCode: string = `<app-pagination [CurrentPage]="page()" [TotalItems]="total"
  [PageSize]="pageSize()" [PageSizeOptions]="[10, 25, 50, 100]"
  (PageChange)="onPage($event)" (PageSizeChange)="onSize($event)" />`;

  /** Page courante de la demo pagination. */
  public readonly DemoPage = signal<number>(1);
  /** Taille de page de la demo pagination. */
  public readonly DemoPageSize = signal<number>(10);
  /** Total d'elements de la demo pagination. */
  public readonly DemoTotal = 42;

  /**
   * Gere l'edition d'une cellule de la grid exemple.
   * @param pEvent L'evenement d'edition.
   */
  public OnCellEdited(pEvent: GridCellEditedEvent<IPlaygroundGridRow>): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_grid_edited', 'tracking'), { key: pEvent.Key });
  }

  /**
   * Gere l'event Exported emis par le Grid apres chaque export CSV.
   * @param pMeta Les metadonnees de l'export.
   */
  public OnGridExported(pMeta: { Count: number; Filename: string; HasFilter: boolean; HasSort: boolean }): void
  {
    console.info('[Playground] Grid export CSV :', pMeta);
    this.PostHog.Capture(this.BuildTrackingName('playground_grid_exported', 'tracking'), {
      count: pMeta.Count,
      filename: pMeta.Filename,
      has_filter: pMeta.HasFilter,
      has_sort: pMeta.HasSort
    });
  }

  /**
   * Gere le clic sur une action de la grid exemple.
   * @param pEvent L'evenement d'action.
   */
  public OnActionClicked(pEvent: GridActionEvent<IPlaygroundGridRow>): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_grid_action', 'tracking'), { action: pEvent.Action });
  }

  /**
   * Gere le clic sur un element de la liste demo.
   * @param pItem L'element clique.
   */
  public OnListItemClick(pItem: IPlaygroundListItem): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_list_item_click', 'tracking'), { id: pItem.id });
  }

  /**
   * Gere le changement de page de la demo pagination.
   * @param pPage Le numero de page (1-based).
   */
  public OnDemoPageChange(pPage: number): void
  {
    this.DemoPage.set(pPage);
    this.PostHog.Capture(this.BuildTrackingName('playground_pagination_page', 'tracking'), { page: pPage });
  }

  /**
   * Gere le changement de taille de page de la demo pagination.
   * @param pSize La nouvelle taille de page.
   */
  public OnDemoPageSizeChange(pSize: number): void
  {
    this.DemoPageSize.set(pSize);
    this.PostHog.Capture(this.BuildTrackingName('playground_pagination_size', 'tracking'), { size: pSize });
  }
}
