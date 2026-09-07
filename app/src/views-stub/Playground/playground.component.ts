import { ActivatedRoute } from '@angular/router';
import { Component, ChangeDetectionStrategy, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundButtonsSectionComponent } from './sections/buttons/playground-buttons-section.component';
import { PlaygroundInputsSectionComponent } from './sections/inputs/playground-inputs-section.component';
import { PlaygroundNavigationSectionComponent } from './sections/navigation/playground-navigation-section.component';
import { PlaygroundFormsSectionComponent } from './sections/forms/playground-forms-section.component';
import { PlaygroundSkeletonSectionComponent } from './sections/skeleton/playground-skeleton-section.component';
import { PlaygroundGridListSectionComponent } from './sections/grid-list/playground-grid-list-section.component';
import { PlaygroundMapSectionComponent } from './sections/map/playground-map-section.component';
import { PlaygroundOverlaySectionComponent } from './sections/overlay/playground-overlay-section.component';
import { PlaygroundAiSectionComponent } from './sections/ai/playground-ai-section.component';
import { PlaygroundStripeSectionComponent } from './sections/stripe/playground-stripe-section.component';
import { PlaygroundTutorialSectionComponent } from './sections/tutorial/playground-tutorial-section.component';
import { PlaygroundLanguageSelectorSectionComponent } from './sections/language-selector/playground-language-selector-section.component';
import { PlaygroundStatCardSectionComponent } from './sections/stat-card/playground-stat-card-section.component';
import { PlaygroundPaletteSectionComponent } from './sections/palette/playground-palette-section.component';
import { PlaygroundBadgeSectionComponent } from './sections/badge/playground-badge-section.component';
import { PlaygroundAvatarSectionComponent } from './sections/avatar/playground-avatar-section.component';
import { PlaygroundCardsSectionComponent } from './sections/cards/playground-cards-section.component';
import { PlaygroundStepperSplitterSectionComponent } from './sections/stepper-splitter/playground-stepper-splitter-section.component';
import { PlaygroundAnimationsSectionComponent } from './sections/animations/playground-animations-section.component';
import { ScrollIndicatorComponent } from '@shared/components/scroll-indicator/scroll-indicator.component';
import { TabsComponent, TabItem } from '@shared/components/tabs/tabs.component';

/**
 * Mode d'affichage du playground : scroll (toutes les sections visibles) ou tabs (une section à la fois).
 */
type EPlaygroundViewMode = 'scroll' | 'tabs';

/**
 * Modèle d'une section du playground avec son ancre, libellé, catégorie et composant démo associé.
 */
interface IPlaygroundSectionItem
{
  /** Ancre DOM / id de la section. */
  id: string;
  /** Libellé affiché dans la TOC et les onglets. */
  label: string;
  /** Icône Material Icons pour le mode onglet. */
  icon: string;
  /** Catégorie métier utilisée pour le badge de statut. */
  category: 'Base' | 'Data' | 'Navigation' | 'Overlay' | 'AI' | 'Form' | 'Design';
  /** Termes de recherche additionnels (sous-sections) pour le filtre global. */
  searchTerms: string[];
}

/**
 * Playground des composants génériques SellMatch.
 * Page admin-only affichant tous les composants partagés avec un exemple d'utilisation
 * et le code à copier. Accessible sous /playground.
 * Orchestrateur léger : les démos sont réparties dans des sous-composants de section.
 * Supporte deux modes d'affichage : scroll (par défaut) ou tabs (onglets).
 */
@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [
      PlaygroundButtonsSectionComponent,
      PlaygroundInputsSectionComponent,
      PlaygroundNavigationSectionComponent,
      PlaygroundFormsSectionComponent,
      PlaygroundSkeletonSectionComponent,
      PlaygroundGridListSectionComponent,
      PlaygroundMapSectionComponent,
      PlaygroundOverlaySectionComponent,
      PlaygroundAiSectionComponent,
      PlaygroundStripeSectionComponent,
      PlaygroundTutorialSectionComponent,
      PlaygroundLanguageSelectorSectionComponent,
      PlaygroundStatCardSectionComponent,
      PlaygroundPaletteSectionComponent,
      PlaygroundBadgeSectionComponent,
      PlaygroundAvatarSectionComponent,
      PlaygroundCardsSectionComponent,
      PlaygroundStepperSplitterSectionComponent,
      PlaygroundAnimationsSectionComponent,
      ScrollIndicatorComponent,
      TabsComponent
    ],
  templateUrl: './playground.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './playground.component.scss'
})
export class PlaygroundComponent extends BaseComponent
{
  //#region Attributes
  /** Indique si on s'exécute côté navigateur (pour l'accès au DOM). */
  private readonly _IsBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /** Route courante pour lire la query param `?playground=` (deep-link vers une section). */
  private readonly _Route: ActivatedRoute = inject(ActivatedRoute);

  /** Mode d'affichage courant : scroll (toutes les sections) ou tabs (une section à la fois). */
  public readonly ViewMode = signal<EPlaygroundViewMode>('tabs');

  /**
   * Identifiant de la section active en mode tabs.
   * Initialisé depuis la query param `?playground=` si elle matche une section connue ;
   * sinon retombe sur 'button' (défaut historique).
   */
  public readonly ActiveSectionId = signal<string>(this._ResolveInitialSectionId());

  /** Recherche courante dans la barre de filtre des sections. */
  public readonly SearchQuery = signal('');

  /** Liste des ancres de la TOC (id + label + icône + catégorie) pour la navigation dans la page. */
    public readonly Sections: IPlaygroundSectionItem[] = [
        { id: 'button', label: 'Button', icon: 'smart_button', category: 'Base', searchTerms: ['button'] },
        { id: 'input', label: 'Input', icon: 'edit', category: 'Base', searchTerms: ['input'] },
        { id: 'badge', label: 'Badge', icon: 'badge', category: 'Data', searchTerms: ['badge', 'notification', 'pill'] },
        { id: 'avatar', label: 'Avatar', icon: 'account_circle', category: 'Data', searchTerms: ['avatar', 'user', 'profile'] },
        { id: 'cards', label: 'Cards', icon: 'dashboard', category: 'Data', searchTerms: ['cards', 'section-card', 'help-card', 'scroll-indicator'] },
        { id: 'skeleton', label: 'Skeleton', icon: 'hourglass_empty', category: 'Data', searchTerms: ['skeleton', 'shimmer', 'loading', 'cell-saving', 'row-saving', 'card-skeleton', 'grid-skeleton', 'is-cell-saving', 'is-row-saving'] },
        { id: 'grid-list', label: 'Grid & List', icon: 'grid_on', category: 'Data', searchTerms: ['grid', 'list', 'pagination', 'tableau', 'liste', 'table', 'editable', 'export-csv'] },
        { id: 'map', label: 'MapCard', icon: 'map', category: 'Data', searchTerms: ['map', 'carte', 'maplibre', 'marker', 'map-card', 'geolocalisation'] },
        { id: 'stepper-splitter', label: 'Stepper & Splitter', icon: 'linear_scale', category: 'Data', searchTerms: ['stepper', 'splitter', 'wizard', 'redimensionnable'] },
        { id: 'tabs', label: 'Navigation', icon: 'tab', category: 'Navigation', searchTerms: ['tabs'] },
        { id: 'filter-bar', label: 'Forms', icon: 'filter_alt', category: 'Form', searchTerms: ['filter-bar', 'upload-file', 'jodit-editor'] },
        { id: 'popup', label: 'Overlay', icon: 'layers', category: 'Overlay', searchTerms: ['popup', 'cookie-consent'] },
        { id: 'tutorial', label: 'Tutorial', icon: 'school', category: 'Overlay', searchTerms: ['tutorial', 'tutoriel', 'guide', 'onboarding', 'spotlight', 'overlay-tutoriel'] },
        { id: 'stripe', label: 'Stripe', icon: 'payment', category: 'Overlay', searchTerms: ['stripe', 'paiement', 'payment', 'checkout'] },
        { id: 'ai-crm-agent', label: 'CRM Agent AI', icon: 'psychology', category: 'AI', searchTerms: ['ai-crm-agent'] },
        { id: 'language-selector-select', label: 'Language selector', icon: 'language', category: 'Base', searchTerms: ['language', 'langue', 'i18n', 'traduction', 'translate', 'select', 'chips'] },
        { id: 'stat-card', label: 'StatCard', icon: 'analytics', category: 'Base', searchTerms: ['stat-card', 'kpi', 'carte', 'indicateur', 'stats', 'dashboard'] },
        { id: 'palette', label: 'Palette', icon: 'palette', category: 'Design', searchTerms: ['palette', 'couleur', 'color', 'variable', 'scss', 'gradient', 'variables.scss'] },
        { id: 'animations', label: 'Animations', icon: 'auto_awesome', category: 'Design', searchTerms: ['animation', 'keyframes', 'transition', 'spin', 'fade', 'slide', 'pulse', 'shimmer', 'shake', 'float', 'typewriter', 'hover', 'lift', 'gradient-text', 'stagger', 'ping', 'spinner'] }
      ];

  /** Onglets dérivés des sections pour le mode tabs. */
  public readonly SectionTabs = computed((): TabItem[] =>
    this.Sections.map((pSection: IPlaygroundSectionItem): TabItem => ({
      id: pSection.id,
      label: pSection.label,
      icon: pSection.icon
    }))
  );

  /** Sections filtrées selon la recherche utilisateur. */
  public readonly FilteredSections = computed((): IPlaygroundSectionItem[] =>
  {
    const lQuery: string = this.SearchQuery().trim().toLowerCase();
    if (!lQuery)
    {
      return this.Sections;
    }

    return this.Sections.filter((pSection: IPlaygroundSectionItem): boolean =>
      pSection.label.toLowerCase().includes(lQuery) ||
      pSection.category.toLowerCase().includes(lQuery) ||
      pSection.id.toLowerCase().includes(lQuery) ||
      pSection.searchTerms.some((pTerm: string): boolean => pTerm.toLowerCase().includes(lQuery))
    );
  });
  //#endregion

  //#region Methods
  /**
   * Lit la query param `?playground=<id>` à l'init pour deep-link vers une section précise.
   * Si l'id matche une section connue, on l'utilise ; sinon on retombe sur 'button'.
   * SSR-safe : en SSR pas de query string lue, on prend le défaut.
   * @returns L'identifiant de section à utiliser comme valeur initiale de `ActiveSectionId`.
   */
  private _ResolveInitialSectionId(): string {
      // - cm - Liste des ids valides (snapshot fige pour eviter la dependance a Sections a l'init)
      // - cm - Alias historique 'data-display' redirige vers 'badge' (le premier onglet du split data-display).
      // - cm - Alias 'data' redirige vers 'grid-list' (le premier onglet du split data).
      const lValidIds: ReadonlySet<string> = new Set([
        'language-selector-select', 'stat-card',
        'button', 'input',
        'badge', 'avatar', 'cards', 'skeleton', 'grid-list', 'map',
        'stepper-splitter',
        'data', 'data-display',
        'tabs', 'filter-bar', 'popup', 'tutorial', 'stripe', 'ai-crm-agent',
        'animations'
      ]);
      const lAliases: ReadonlyMap<string, string> = new Map([
        ['data-display', 'badge'],
        ['data', 'grid-list']
      ]);
      const lParam: string | null = this._Route.snapshot.queryParamMap.get('playground');
      if (lParam && lValidIds.has(lParam)) {
        return lAliases.get(lParam) ?? lParam;
      }
      return 'button';
    }

  /**
   * Bascule entre le mode scroll et le mode tabs.
   * @param pMode Le mode d'affichage à activer.
   */
  public SetViewMode(pMode: EPlaygroundViewMode): void
  {
    this.ViewMode.set(pMode);
    this.PostHog.Capture(this.BuildTrackingName('playground_view_mode_change', 'tracking'), { mode: pMode });
  }

  /**
   * Gère le changement d'onglet en mode tabs.
   * @param pSectionId L'identifiant de la section sélectionnée.
   */
  public OnSectionTabChange(pSectionId: string): void
  {
    this.ActiveSectionId.set(pSectionId);
    this.PostHog.Capture(this.BuildTrackingName('playground_tab_change', 'tracking'), { section: pSectionId });
  }

  /**
   * Met à jour la recherche et filtre les sections affichées dans la TOC.
   * @param pQuery La valeur saisie dans la barre de recherche.
   */
  public FilterSections(pQuery: string): void
  {
    this.SearchQuery.set(pQuery);
  }

  /**
   * Indique si une section doit être rendue selon le filtre de recherche actuel.
   * @param pId L'identifiant de la section à tester.
   * @returns true si la section correspond au filtre courant.
   */
  public IsSectionVisible(pId: string): boolean
  {
    return this.FilteredSections().some((pSection: IPlaygroundSectionItem): boolean => pSection.id === pId);
  }

  /**
   * Fait défiler la page vers la section ciblée par son ancre id.
   * Évite les problèmes de routage SPA liés aux ancres href="#...".
   * @param pId L'identifiant (ancre) de la section cible.
   */
  public ScrollToSection(pId: string): void
  {
    if (!this._IsBrowser) return;
    const lElement: HTMLElement | null = document.getElementById(pId);
    if (lElement)
    {
      lElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  //#endregion
}