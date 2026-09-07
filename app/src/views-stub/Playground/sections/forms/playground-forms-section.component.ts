import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { FilterBarComponent, FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { UploadFileComponent, FileTypeConfig } from '@shared/components/UploadFile/upload-file.component';
import { JoditEditorComponent } from '@shared/components/jodit-editor/jodit-editor.component';
import { InputComponent } from '@shared/components/input/input.component';

/**
 * Section du playground démontrant les composants de formulaires :
 * FilterBar, UploadFile, JoditEditor.
 */
@Component({
  selector: 'app-playground-forms-section',
  standalone: true,
  imports: [
    FormsModule,
    PlaygroundSectionComponent,
    FilterBarComponent,
    UploadFileComponent,
    JoditEditorComponent,
    InputComponent
  ],
  templateUrl: './playground-forms-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundFormsSectionComponent extends BaseComponent
{
  //#region Attributes
  /** Configuration des champs de la FilterBar démo. */
  public readonly FilterFields: FilterFieldConfig[] = [
    { Key: 'nom', Label: 'Nom', Type: 'text', Placeholder: 'Rechercher un nom' },
    { Key: 'role', Label: 'Rôle', Type: 'select', Placeholder: 'Tous les rôles',
      Options: [
        { Label: 'Administrateur', Value: 'admin' },
        { Label: 'Utilisateur', Value: 'user' },
        { Label: 'Manager', Value: 'manager' }
      ] },
    { Key: 'date', Label: 'Date', Type: 'date' },
    { Key: 'actif', Label: 'Actif seulement', Type: 'checkbox' }
  ];

  /** Types de fichiers pour l'UploadFile démo. */
  public readonly UploadFileTypes: FileTypeConfig[] = [
    { type: 'image', label: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp'], maxSize: 5, icon: 'image' },
    { type: 'pdf', label: 'Document PDF', extensions: ['pdf'], maxSize: 10, icon: 'picture_as_pdf' }
  ];

  /** Contenu de l'éditeur Jodit exemple. */
  public readonly JoditContent = signal('<p>Contenu <strong>éditable</strong> avec Jodit.</p>');

  /** Active l'état disabled sur la FilterBar démo. */
  public readonly FilterBarDisabled = signal(false);
  /** Active l'upload automatique sur l'UploadFile démo. */
  public readonly UploadAutoUpload = signal(true);

  /** Configuration effective des champs de la FilterBar avec prise en compte du toggle disabled. */
  public readonly EffectiveFilterFields = computed((): FilterFieldConfig[] =>
  {
    return this.FilterFields.map((pField: FilterFieldConfig): FilterFieldConfig => ({ ...pField, Disabled: this.FilterBarDisabled() || pField.Disabled }));
  });

  /** Snippet copiable FilterBar. */
  public readonly FilterBarCode: string = `<app-filter-bar [Fields]="fields" [Collapsible]="true"
  (FilterChange)="onFilter($event)" />`;

  /** Snippet copiable UploadFile. */
  public readonly UploadFileCode: string = `<app-upload-file [fileTypes]="types" [showPreview]="true" [autoUpload]="autoUpload"
  (fileSelected)="onFile($event)" (uploadSuccess)="onSuccess($event)" />`;

  /** Snippet copiable JoditEditor. */
  public readonly JoditCode: string = `<app-jodit-editor [(ngModel)]="content" />`;
  //#endregion

  //#region Methods
  /**
   * Active ou désactive l'état disabled de la FilterBar démo.
   * @param pValue Nouvelle valeur de la checkbox.
   */
  public ToggleFilterBarDisabled(pValue?: boolean): void
  {
    if (typeof pValue === 'boolean')
    {
      this.FilterBarDisabled.set(pValue);
      return;
    }
    this.FilterBarDisabled.update((pCurrent: boolean): boolean => !pCurrent);
  }

  /**
   * Active ou désactive l'upload automatique de l'UploadFile démo.
   * @param pValue Nouvelle valeur de la checkbox.
   */
  public ToggleUploadAuto(pValue?: boolean): void
  {
    if (typeof pValue === 'boolean')
    {
      this.UploadAutoUpload.set(pValue);
      return;
    }
    this.UploadAutoUpload.update((pCurrent: boolean): boolean => !pCurrent);
  }

  /**
   * Gère le changement de filtre de la FilterBar démo.
   * @param pFilter Le filtre courant.
   */
  public OnFilterChange(pFilter: unknown): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_filter_change', 'tracking'), { filter: pFilter });
  }

  /**
   * Gère la sélection d'un fichier dans l'UploadFile démo.
   * @param pFile Le fichier sélectionné.
   */
  public OnFileSelected(pFile: File): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_file_selected', 'tracking'), { name: pFile.name });
  }

  /**
   * Gère une erreur d'upload.
   * @param pError Le message d'erreur.
   */
  public OnUploadError(pError: string): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_upload_error', 'tracking'), { error: pError });
  }

  /**
   * Gère le succès d'un upload.
   * @param pUrl L'URL du fichier uploadé.
   */
  public OnUploadSuccess(pUrl: string): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_upload_success', 'tracking'), { url: pUrl });
  }
  //#endregion
}