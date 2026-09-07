import { Component, inject, OnInit, Output, EventEmitter, PLATFORM_ID, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@base/BaseComponent';
import { ButtonComponent } from '@shared/components/button/button.component';
import { PopupComponent, PopupType } from '@shared/components/popup/popup.component';
import { UploadFileComponent } from '@shared/components/UploadFile/upload-file.component';
import { ImageComponent } from '@shared/components/image/image.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { InputComponent } from '@shared/components/input/input.component';
import { BlogArticlesService } from '@core/sellmatchdb/services/blog-articles/blog-articles.service';
import { BlogArticlesDTO } from '@core/sellmatchdb/dto/blog-articles/blog-articles.dto';
import { BlogArticlesCritereDTO } from '@core/sellmatchdb/dto/blog-articles/blog-articles.critere';
import { BlogArticleVersionsService } from '@core/sellmatchdb/services/blog-article-versions/blog-article-versions.service';
import { BlogArticleVersionsDTO } from '@core/sellmatchdb/dto/blog-article-versions/blog-article-versions.dto';

@Component({
  selector: 'app-blog-admin',
  standalone: true,
  imports: [FormsModule, ButtonComponent, PopupComponent, UploadFileComponent, ImageComponent, BadgeComponent, InputComponent],
  templateUrl: './blog-admin.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./blog-admin.component.scss']
})
export class BlogAdminComponent extends BaseComponent implements OnInit
{
  //#region Attributes
  private readonly _BlogService: BlogArticlesService = inject(BlogArticlesService);
  private readonly _VersionsService: BlogArticleVersionsService = inject(BlogArticleVersionsService);
  private readonly _IsBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _Cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  /** Émis après création/modification/suppression pour recharger la liste parent */
  @Output() DataChanged: EventEmitter<void> = new EventEmitter<void>();
  //#endregion

  //#region Properties
  public Articles: BlogArticlesDTO[] = [];
  public ShowEditor: boolean = false;
  public ShowPreview: boolean = false;
  public ShowHistory: boolean = false;
  public EditingArticle: BlogArticlesDTO | null = null;
  public IsSaving: boolean = false;

  // - cm - Historique des versions
  public Versions: BlogArticleVersionsDTO[] = [];
  public HistoryArticle: BlogArticlesDTO | null = null;
  public ShowVersionPreview: boolean = false;
  public PreviewingVersion: BlogArticleVersionsDTO | null = null;
  public ExpandedVersionId: number | null = null;
  public CompareMode: boolean = false;
  public CompareVersionA: BlogArticleVersionsDTO | null = null;
  public CompareVersionB: BlogArticleVersionsDTO | null = null;
  public PreviewMode: 'normal' | 'inline' | 'split' = 'normal';
  public DiffCompareTarget: 'current' | 'version' = 'current';
  public DiffCompareVersionId: number | null = null;

  // - cm - Champs du formulaire d'édition
  public FormTitle: string = '';
  public FormSlug: string = '';
  public FormMetaDescription: string = '';
  public FormExcerpt: string = '';
  public FormContent: string = '';
  public FormCategory: string = 'estimation';
  public FormTags: string = '';
  public FormCoverImage: string = '';
  public FormReadingTimeMinutes: number | null = null;
  public FormIsPublished: boolean = false;
  public FormIsFeatured: boolean = false;

  // - cm - Popup d'alerte générique (remplace alert())
  public ShowAlert: boolean = false;
  public AlertTitle: string = '';
  public AlertMessage: string = '';
  public AlertType: PopupType = 'error';

  // - cm - Popup de confirmation générique (remplace confirm())
  public ShowConfirm: boolean = false;
  public ConfirmTitle: string = '';
  public ConfirmMessage: string = '';
  private _ConfirmAction: (() => Promise<void>) | null = null;
  //#endregion

  //#region Lifecycle

  /**
   * Initialise le composant : charge tous les articles.
   */
  public ngOnInit(): void
  {
    this.BusyService.show();
    // - cm - SSR-safe : charger les articles uniquement côté navigateur
    if (this._IsBrowser)
    {
      this.LoadArticles();
    }
    else
    {
      this.BusyService.hide();
    }
  }

  //#endregion

  //#region Methods

  /**
   * Affiche une popup d'alerte générique.
   * @param pTitle Le titre de l'alerte
   * @param pMessage Le message de l'alerte
   * @param pType Le type de l'alerte (error, warning, info, success)
   */
  private DisplayAlert(pTitle: string, pMessage: string, pType: PopupType = 'error'): void
  {
    this.AlertTitle = pTitle;
    this.AlertMessage = pMessage;
    this.AlertType = pType;
    this.ShowAlert = true;
  }

  /**
   * Affiche une popup de confirmation générique.
   * @param pTitle Le titre de la confirmation
   * @param pMessage Le message de confirmation
   * @param pAction L'action à exécuter si confirmé
   */
  private DisplayConfirm(pTitle: string, pMessage: string, pAction: () => Promise<void>): void
  {
    this.ConfirmTitle = pTitle;
    this.ConfirmMessage = pMessage;
    this._ConfirmAction = pAction;
    this.ShowConfirm = true;
  }

  /**
   * Ferme la popup d'alerte.
   */
  public CloseAlert(): void
  {
    this.ShowAlert = false;
  }

  /**
   * Ferme la popup de confirmation et annule l'action en attente.
   */
  public CloseConfirm(): void
  {
    this.ShowConfirm = false;
    this._ConfirmAction = null;
  }

  /**
   * Confirme l'action en cours et l'exécute.
   */
  public async ConfirmAction(): Promise<void>
  {
    this.ShowConfirm = false;
    const lAction: (() => Promise<void>) | null = this._ConfirmAction;
    this._ConfirmAction = null;
    if (lAction)
    {
      await lAction();
    }
  }

  /**
   * Charge tous les articles (publiés et brouillons).
   */
  public async LoadArticles(): Promise<void>
  {
    try
    {
      this.Articles = await this._BlogService.getAll();
    }
    catch (pError)
    {
      console.error('Erreur lors du chargement des articles', pError);
    }
    finally
    {
      this.BusyService.hide();
    }
  }

  /**
   * Ouvre l'éditeur pour créer un nouvel article.
   */
  public OpenCreateEditor(): void
  {
    this.EditingArticle = null;
    this.FormTitle = '';
    this.FormSlug = '';
    this.FormMetaDescription = '';
    this.FormExcerpt = '';
    this.FormContent = '';
    this.FormCategory = 'estimation';
    this.FormTags = '';
    this.FormCoverImage = '';
    this.FormReadingTimeMinutes = null;
    this.FormIsPublished = false;
    this.FormIsFeatured = false;
    this.ShowEditor = true;
  }

  /**
   * Ouvre l'éditeur pour modifier un article existant.
   * @param pArticle L'article à modifier
   */
  public OpenEditEditor(pArticle: BlogArticlesDTO): void
  {
    this.EditingArticle = pArticle;
    this.FormTitle = pArticle.title ?? '';
    this.FormSlug = pArticle.slug ?? '';
    this.FormMetaDescription = pArticle.metaDescription ?? '';
    this.FormExcerpt = pArticle.excerpt ?? '';
    this.FormContent = pArticle.content ?? '';
    this.FormCategory = pArticle.category ?? 'estimation';
    this.FormTags = pArticle.tags ?? '';
    this.FormCoverImage = pArticle.coverImage ?? '';
    this.FormReadingTimeMinutes = pArticle.readingTimeMinutes ?? null;
    this.FormIsPublished = pArticle.isPublished ?? false;
    this.FormIsFeatured = pArticle.isFeatured ?? false;
    this.ShowEditor = true;
  }

  /**
   * Ferme l'éditeur sans sauvegarder.
   */
  public CloseEditor(): void
  {
    this.ShowEditor = false;
    this.EditingArticle = null;
  }

  /**
   * Getter pour le titre de l'éditeur (évite l'apostrophe dans le template).
   */
  public get EditorTitle(): string
  {
    return this.EditingArticle ? "Modifier l'article" : 'Nouvel article';
  }

  /**
   * Getter pour le titre de l'historique.
   */
  public get HistoryTitle(): string
  {
    return 'Historique — ' + (this.HistoryArticle?.title || '');
  }

  /**
   * Getter pour le titre de la preview de version.
   */
  public get VersionPreviewTitle(): string
  {
    return 'Aperçu — Version ' + (this.PreviewingVersion?.versionNumber || '');
  }

  /**
   * Handler pour la fermeture de l'éditeur via app-popup.
   * @param pIsOpen Le nouvel état d'ouverture
   */
  public OnEditorClosed(pIsOpen: boolean): void
  {
    this.ShowEditor = pIsOpen;
    if (!pIsOpen) this.CloseEditor();
  }

  /**
   * Handler pour la fermeture de l'historique via app-popup.
   * @param pIsOpen Le nouvel état d'ouverture
   */
  public OnHistoryClosed(pIsOpen: boolean): void
  {
    this.ShowHistory = pIsOpen;
    if (!pIsOpen) this.CloseHistory();
  }

  /**
   * Sauvegarde l'article (création ou modification).
   */
  public async SaveArticle(): Promise<void>
  {
    if (!this.FormTitle || !this.FormSlug)
    {
      this.DisplayAlert('Validation', 'Le titre et le slug sont obligatoires.', 'warning');
      return;
    }

    this.IsSaving = true;

    try
    {
      const lArticle: BlogArticlesDTO = {
        id: this.EditingArticle?.id,
        title: this.FormTitle,
        slug: this.FormSlug,
        metaDescription: this.FormMetaDescription || undefined,
        excerpt: this.FormExcerpt || undefined,
        content: this.FormContent || undefined,
        category: this.FormCategory || undefined,
        tags: this.FormTags || undefined,
        coverImage: this.FormCoverImage || undefined,
        readingTimeMinutes: this.FormReadingTimeMinutes ?? undefined,
        isPublished: this.FormIsPublished,
        isFeatured: this.FormIsFeatured,
        publishedAt: this.FormIsPublished ? (this.EditingArticle?.publishedAt ?? new Date().toISOString()) : undefined
      };

      if (this.EditingArticle?.id)
      {
        const lCritere: BlogArticlesCritereDTO = { id: this.EditingArticle.id };
        await this._BlogService.update(lArticle, lCritere);
      }
      else
      {
        await this._BlogService.create(lArticle);
      }

      this.CloseEditor();
      await this.LoadArticles();
      this.DataChanged.emit();
    }
    catch (pError)
    {
      console.error('Erreur lors de la sauvegarde', pError);
      this.DisplayAlert('Erreur', 'Erreur lors de la sauvegarde de l\'article.', 'error');
    }
    finally
    {
      this.IsSaving = false;
    }
  }

  /**
   * Supprime un article après confirmation.
   * @param pArticle L'article à supprimer
   */
  public async DeleteArticle(pArticle: BlogArticlesDTO): Promise<void>
  {
    if (!pArticle.id) return;

    this.DisplayConfirm(
      'Confirmation de suppression',
      `Supprimer l'article "${pArticle.title}" ?`,
      async () =>
      {
        try
        {
          const lCritere: BlogArticlesCritereDTO = { id: pArticle.id! };
          await this._BlogService.delete(lCritere);
          await this.LoadArticles();
          this.DataChanged.emit();
        }
        catch (pError)
        {
          console.error('Erreur lors de la suppression', pError);
          this.DisplayAlert('Erreur', 'Erreur lors de la suppression de l\'article.', 'error');
        }
      }
    );
  }

  /**
   * Bascule le statut publié/brouillon d'un article (mise à jour optimiste).
   * @param pArticle L'article à modifier
   */
  public async TogglePublish(pArticle: BlogArticlesDTO): Promise<void>
  {
    if (!pArticle.id) return;

    // - cm - Sauvegarde de l'état initial pour rollback en cas d'erreur
    const lPreviousPublished: boolean = pArticle.isPublished ?? false;
    const lPreviousPublishedAt: string | Date | undefined = pArticle.publishedAt;

    // - cm - Mise à jour optimiste : on applique le changement immédiatement dans la liste
    pArticle.isPublished = !pArticle.isPublished;
    pArticle.publishedAt = pArticle.isPublished ? (pArticle.publishedAt ?? new Date().toISOString()) : pArticle.publishedAt;

    this.BusyService.show('Sauvegarde...');
    try
    {
      const lCritere: BlogArticlesCritereDTO = { id: pArticle.id };
      await this._BlogService.update(pArticle, lCritere);
      this.DataChanged.emit();
    }
    catch (pError)
    {
      // - cm - Rollback : on restore l'état initial en cas d'échec
      pArticle.isPublished = lPreviousPublished;
      pArticle.publishedAt = lPreviousPublishedAt;
      console.error('Erreur lors du changement de statut', pError);
      this.DisplayAlert('Erreur', 'Erreur lors du changement de statut.', 'error');
    }
    finally
    {
      this.BusyService.hide();
    }
  }

  /**
   * Bascule le statut "à la une" d'un article (mise à jour optimiste).
   * @param pArticle L'article à modifier
   */
  public async ToggleFeatured(pArticle: BlogArticlesDTO): Promise<void>
  {
    if (!pArticle.id) return;

    // - cm - Sauvegarde de l'état initial pour rollback en cas d'erreur
    const lPreviousFeatured: boolean = pArticle.isFeatured ?? false;

    // - cm - Mise à jour optimiste : on applique le changement immédiatement dans la liste
    pArticle.isFeatured = !pArticle.isFeatured;

    this.BusyService.show('Sauvegarde...');
    try
    {
      const lCritere: BlogArticlesCritereDTO = { id: pArticle.id };
      await this._BlogService.update(pArticle, lCritere);
      this.DataChanged.emit();
    }
    catch (pError)
    {
      // - cm - Rollback : on restore l'état initial en cas d'échec
      pArticle.isFeatured = lPreviousFeatured;
      console.error('Erreur lors du changement de statut', pError);
      this.DisplayAlert('Erreur', 'Erreur lors du changement de statut.', 'error');
    }
    finally
    {
      this.BusyService.hide();
    }
  }

  /**
   * Génère automatiquement un slug à partir du titre.
   */
  public GenerateSlug(): void
  {
    this.FormSlug = this.FormTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Handler quand l'image de couverture est uploadée.
   * @param pUrl L'URL de l'image uploadée
   */
  public OnCoverUploaded(pUrl: string): void
  {
    this.FormCoverImage = pUrl;
    this._Cdr.detectChanges();
  }

  /**
   * Ouvre la preview de l'article en cours d'édition.
   */
  public OpenPreview(): void
  {
    this.ShowPreview = true;
  }

  /**
   * Ferme la preview.
   */
  public ClosePreview(): void
  {
    this.ShowPreview = false;
  }

  /**
   * Ouvre l'historique des versions d'un article.
   * @param pArticle L'article dont on veut voir l'historique
   */
  public async OpenHistory(pArticle: BlogArticlesDTO): Promise<void>
  {
    this.HistoryArticle = pArticle;
    this.ShowHistory = true;
    this.BusyService.show();

    try
    {
      if (pArticle.id)
      {
        this.Versions = await this._VersionsService.GetHistory(pArticle.id);
      }
    }
    catch (pError)
    {
      console.error('Erreur lors du chargement de l\'historique', pError);
    }
    finally
    {
      this.BusyService.hide();
    }
  }

  /**
   * Ferme l'historique.
   */
  public CloseHistory(): void
  {
    this.ShowHistory = false;
    this.HistoryArticle = null;
    this.Versions = [];
  }

  /**
   * Restaure une version précédente d'un article.
   * @param pVersion La version à restaurer
   */
  public async RevertVersion(pVersion: BlogArticleVersionsDTO): Promise<void>
  {
    if (!pVersion.id) return;

    this.DisplayConfirm(
      'Confirmation de restauration',
      `Restaurer la version ${pVersion.versionNumber} ? L'état actuel sera sauvegardé dans l'historique.`,
      async () =>
      {
        try
        {
          await this._VersionsService.Revert(pVersion.id!);
          await this.LoadArticles();
          this.DataChanged.emit();
          this.CloseHistory();
          this.CloseVersionPreview();
        }
        catch (pError)
        {
          console.error('Erreur lors de la restauration', pError);
          this.DisplayAlert('Erreur', 'Erreur lors de la restauration de la version.', 'error');
        }
      }
    );
  }

  /**
   * Ouvre la preview d'une version spécifique.
   * @param pVersion La version à prévisualiser
   */
  public PreviewVersion(pVersion: BlogArticleVersionsDTO): void
  {
    this.PreviewingVersion = pVersion;
    this.ShowVersionPreview = true;
  }

  /**
   * Change la version en cours de preview depuis la combobox.
   * @param pEvent L'événement de changement du select
   */
  public OnVersionSelectChange(pEvent: Event): void
  {
    const lSelect = pEvent.target as HTMLSelectElement;
    const lVersionId = Number(lSelect.value);
    const lVersion = this.Versions.find(v => v.id === lVersionId);
    if (lVersion)
    {
      this.PreviewingVersion = lVersion;
    }
  }

  /**
   * Ferme la preview d'une version.
   */
  public CloseVersionPreview(): void
  {
    this.ShowVersionPreview = false;
    this.PreviewingVersion = null;
  }

  /**
   * Bascule l'affichage des différences pour une version.
   * @param pVersion La version à comparer
   */
  public ToggleDiff(pVersion: BlogArticleVersionsDTO): void
  {
    this.ExpandedVersionId = this.ExpandedVersionId === (pVersion.id ?? null) ? null : (pVersion.id ?? null);
  }

  /**
   * Indique si les différences sont affichées pour une version.
   * @param pVersion La version
   * @returns True si les diffs sont affichées
   */
  public IsDiffExpanded(pVersion: BlogArticleVersionsDTO): boolean
  {
    return this.ExpandedVersionId === pVersion.id;
  }

  /**
   * Compare un champ entre la version et l'article actuel.
   * @param pVersion La version
   * @param pField Le champ à comparer
   * @returns True si le champ a changé
   */
  public HasChanged(pVersion: BlogArticleVersionsDTO, pField: string): boolean
  {
    if (!this.HistoryArticle) return false;

    const lCurrent: unknown = (this.HistoryArticle as Record<string, unknown>)[pField];
    const lVersion: unknown = (pVersion as Record<string, unknown>)[pField];

    return (lCurrent ?? '') !== (lVersion ?? '');
  }

  /**
   * Retourne la valeur actuelle d'un champ de l'article.
   * @param pField Le champ
   * @returns La valeur actuelle
   */
  public GetCurrent(pField: string): string
  {
    if (!this.HistoryArticle) return '';
    return String((this.HistoryArticle as Record<string, unknown>)[pField] ?? '—');
  }

  /**
   * Retourne la valeur d'un champ d'une version.
   * @param pVersion La version
   * @param pField Le champ
   * @returns La valeur de la version
   */
  public GetVersionValue(pVersion: BlogArticleVersionsDTO, pField: string): string
  {
    return String((pVersion as Record<string, unknown>)[pField] ?? '—');
  }

  /**
   * Retourne la liste des champs à comparer (généré dynamiquement depuis le DTO).
   */
  public get DiffFields(): { key: string; label: string }[]
  {
    return [
      { key: 'title', label: 'Titre' },
      { key: 'slug', label: 'Slug (URL)' },
      { key: 'metaDescription', label: 'Meta description' },
      { key: 'excerpt', label: 'Résumé' },
      { key: 'content', label: 'Contenu' },
      { key: 'category', label: 'Catégorie' },
      { key: 'tags', label: 'Mots-clés' },
      { key: 'coverImage', label: 'Image de couverture' },
      { key: 'ogImage', label: 'Image Open Graph' },
      { key: 'readingTimeMinutes', label: 'Temps de lecture' },
      { key: 'isPublished', label: 'Publié' },
      { key: 'isFeatured', label: 'À la une' },
      { key: 'publishedAt', label: 'Date de publication' },
      { key: 'createdAt', label: 'Date de création' },
      { key: 'updatedAt', label: 'Date de modification' },
      { key: 'authorId', label: 'Auteur' }
    ];
  }

  /**
   * Vérifie si une version n'a aucune différence avec l'article actuel.
   * @param pVersion La version
   * @returns True si aucun changement
   */
  public HasNoChanges(pVersion: BlogArticleVersionsDTO): boolean
  {
    return this.DiffFields.every(f => !this.HasChanged(pVersion, f.key));
  }

  /**
   * Active/désactive le mode comparaison entre deux versions.
   */
  public ToggleCompareMode(): void
  {
    this.CompareMode = !this.CompareMode;
    this.CompareVersionA = null;
    this.CompareVersionB = null;
  }

  /**
   * Sélectionne une version pour la comparaison.
   * @param pVersion La version à sélectionner
   */
  public SelectForCompare(pVersion: BlogArticleVersionsDTO): void
  {
    if (!this.CompareMode) return;

    if (this.CompareVersionA === null)
    {
      this.CompareVersionA = pVersion;
    }
    else if (this.CompareVersionB === null && pVersion.id !== this.CompareVersionA.id)
    {
      this.CompareVersionB = pVersion;
    }
    else
    {
      // - cm - Reset si on re-clique sur la même version
      if (this.CompareVersionA?.id === pVersion.id) this.CompareVersionA = null;
      else if (this.CompareVersionB?.id === pVersion.id) this.CompareVersionB = null;
    }
  }

  /**
   * Indique si une version est sélectionnée pour la comparaison.
   * @param pVersion La version
   * @returns 'A', 'B' ou null
   */
  public GetCompareSlot(pVersion: BlogArticleVersionsDTO): string | null
  {
    if (this.CompareVersionA?.id === pVersion.id) return 'A';
    if (this.CompareVersionB?.id === pVersion.id) return 'B';
    return null;
  }

  /**
   * Vérifie si deux versions peuvent être comparées.
   */
  public get CanCompare(): boolean
  {
    return this.CompareVersionA !== null && this.CompareVersionB !== null;
  }

  /**
   * Compare un champ entre les deux versions sélectionnées.
   * @param pField Le champ à comparer
   * @returns True si le champ diffère
   */
  public HasChangedBetween(pField: string): boolean
  {
    if (!this.CompareVersionA || !this.CompareVersionB) return false;

    const lValueA: unknown = (this.CompareVersionA as Record<string, unknown>)[pField];
    const lValueB: unknown = (this.CompareVersionB as Record<string, unknown>)[pField];

    return (lValueA ?? '') !== (lValueB ?? '');
  }

  /**
   * Retourne la valeur d'un champ pour la version A.
   * @param pField Le champ
   * @returns La valeur
   */
  public GetCompareA(pField: string): string
  {
    if (!this.CompareVersionA) return '—';
    return String((this.CompareVersionA as Record<string, unknown>)[pField] ?? '—');
  }

  /**
   * Retourne la valeur d'un champ pour la version B.
   * @param pField Le champ
   * @returns La valeur
   */
  public GetCompareB(pField: string): string
  {
    if (!this.CompareVersionB) return '—';
    return String((this.CompareVersionB as Record<string, unknown>)[pField] ?? '—');
  }

  /**
   * Génère un diff ligne par ligne (style git) entre deux textes.
   * @param pOldText L'ancien texte
   * @param pNewText Le nouveau texte
   * @returns Tableau de lignes avec type (added, removed, unchanged)
   */
  public GetLineDiff(pOldText: string, pNewText: string): { type: 'added' | 'removed' | 'unchanged'; text: string }[]
  {
    const lOldLines: string[] = (pOldText ?? '').split('\n');
    const lNewLines: string[] = (pNewText ?? '').split('\n');
    const lResult: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];

    // - cm - Algorithme LCS simplifié pour diff ligne par ligne
    const lMatrix: number[][] = Array(lOldLines.length + 1).fill(null).map(() => Array(lNewLines.length + 1).fill(0));

    for (let i = lOldLines.length - 1; i >= 0; i--)
    {
      for (let j = lNewLines.length - 1; j >= 0; j--)
      {
        if (lOldLines[i] === lNewLines[j])
          lMatrix[i][j] = lMatrix[i + 1][j + 1] + 1;
        else
          lMatrix[i][j] = Math.max(lMatrix[i + 1][j], lMatrix[i][j + 1]);
      }
    }

    let i = 0, j = 0;
    while (i < lOldLines.length && j < lNewLines.length)
    {
      if (lOldLines[i] === lNewLines[j])
      {
        lResult.push({ type: 'unchanged', text: lOldLines[i] });
        i++;
        j++;
      }
      else if (lMatrix[i + 1][j] >= lMatrix[i][j + 1])
      {
        lResult.push({ type: 'removed', text: lOldLines[i] });
        i++;
      }
      else
      {
        lResult.push({ type: 'added', text: lNewLines[j] });
        j++;
      }
    }

    while (i < lOldLines.length)
    {
      lResult.push({ type: 'removed', text: lOldLines[i] });
      i++;
    }

    while (j < lNewLines.length)
    {
      lResult.push({ type: 'added', text: lNewLines[j] });
      j++;
    }

    return lResult;
  }

  /**
   * Génère le diff ligne par ligne pour un champ spécifique entre la version preview et la cible.
   * @param pField Le champ à comparer
   * @returns Tableau de lignes avec type
   */
  public GetFieldDiff(pField: string): { type: 'added' | 'removed' | 'unchanged'; text: string }[]
  {
    if (!this.PreviewingVersion) return [];

    let lOldText: string = '';

    if (this.DiffCompareTarget === 'version' && this.DiffCompareVersionId !== null)
    {
      const lCompareVersion = this.Versions.find(pV => pV.id === this.DiffCompareVersionId);
      lOldText = String((lCompareVersion as Record<string, unknown>)?.[pField] ?? '');
    }
    else
    {
      lOldText = String((this.HistoryArticle as Record<string, unknown>)?.[pField] ?? '');
    }

    const lNewText: string = String((this.PreviewingVersion as Record<string, unknown>)[pField] ?? '');

    return this.GetLineDiff(lOldText, lNewText);
  }

  /**
   * Indique si un champ a changé entre la version preview et la cible.
   * @param pField Le champ
   * @returns True si le champ a changé
   */
  public HasFieldChanged(pField: string): boolean
  {
    if (!this.PreviewingVersion) return false;

    let lOldValue: unknown = '';

    if (this.DiffCompareTarget === 'version' && this.DiffCompareVersionId !== null)
    {
      const lCompareVersion = this.Versions.find(pV => pV.id === this.DiffCompareVersionId);
      lOldValue = (lCompareVersion as Record<string, unknown>)?.[pField];
    }
    else
    {
      lOldValue = (this.HistoryArticle as Record<string, unknown>)?.[pField];
    }

    const lNewValue: unknown = (this.PreviewingVersion as Record<string, unknown>)[pField];

    return String(lOldValue ?? '') !== String(lNewValue ?? '');
  }

  /**
   * Retourne la liste des champs qui ont changé.
   */
  public get ChangedFields(): { key: string; label: string }[]
  {
    return this.DiffFields.filter(pField => this.HasFieldChanged(pField.key));
  }

  /**
   * Retourne le label de la source de comparaison.
   */
  public get DiffSourceLabel(): string
  {
    if (this.DiffCompareTarget === 'version' && this.DiffCompareVersionId !== null)
    {
      const lVersion = this.Versions.find(v => v.id === this.DiffCompareVersionId);
      return lVersion ? `Version ${lVersion.versionNumber}` : 'Version';
    }
    return 'Actuel';
  }

  /**
   * Retourne la date de la version en cours de preview.
   */
  public get PreviewVersionDate(): string
  {
    return this.FormatDateTime(this.PreviewingVersion?.createdAt);
  }

  /**
   * Retourne la date de la source de comparaison.
   */
  public get DiffSourceDate(): string
  {
    if (this.DiffCompareTarget === 'version' && this.DiffCompareVersionId !== null)
    {
      const lVersion = this.Versions.find(pV => pV.id === this.DiffCompareVersionId);
      return this.FormatDateTime(lVersion?.createdAt);
    }
    return this.FormatDateTime(this.HistoryArticle?.updatedAt);
  }

  /**
   * Génère le diff du contenu entre les deux versions sélectionnées.
   * @returns Tableau de lignes avec type
   */
  public GetCompareContentDiff(): { type: 'added' | 'removed' | 'unchanged'; text: string }[]
  {
    if (!this.CompareVersionA || !this.CompareVersionB) return [];
    return this.GetLineDiff(this.CompareVersionA.content ?? '', this.CompareVersionB.content ?? '');
  }

  //#endregion
}
