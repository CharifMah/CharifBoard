import { Component, ChangeDetectionStrategy, signal, computed, ViewChild } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { TabsComponent, TabItem } from '@shared/components/tabs/tabs.component';
import { NavbarComponent } from '@shared/components/layout/navbar/navbar.component';

/**
 * Largeur / hauteur des viewports simules pour la demo de la navbar.
 * - cm - Cadrage responsive : on embarque la vraie <app-navbar> dans un cadre
 * redimensionne pour observer le comportement hamburger vs desktop sans devoir
 * recharger la page ni redimensionner la fenetre du navigateur.
 */
interface IViewportPreset
{
  /** Identifiant lisible du preset (utilise dans le switcher et les aria-label). */
  id: 'desktop' | 'tablet' | 'mobile';
  /** Libelle affiche dans le switcher. */
  label: string;
  /** Largeur du cadre en pixels. */
  width: number;
  /** Hauteur du cadre en pixels. */
  height: number;
  /** Icone Material Icons du preset. */
  icon: string;
}

/**
 * Section du playground demontrant le composant Tabs dans toutes ses
 * variantes, tailles, positions d'icone et etats. Couvre egalement le
 * comportement responsive (wrap desktop, colonne mobile).
 * Inclut aussi une vitrine de la vraie <app-navbar> reimportee telle quelle,
 * dans plusieurs viewports simules (desktop / tablette / mobile) pour valider
 * le rendu responsive sans toucher au DOM global.
 *
 * La navbar est incluse SANS AUCUN override de style : on reproduit fidelement
 * son comportement natif (menu hamburger en position: fixed, backdrop, etc.).
 * L'utilisateur peut forcer l'affichage du hamburger ou ouvrir/fermer le menu
 * via des controles dedies.
 */
@Component({
  selector: 'app-playground-navigation-section',
  standalone: true,
  imports: [
    PlaygroundSectionComponent,
    TabsComponent,
    NavbarComponent
  ],
  templateUrl: './playground-navigation-section.component.html',
  styleUrl: './playground-navigation-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundNavigationSectionComponent extends BaseComponent
{
  //#region Attributes
  /** Onglet actif (ex Tabs). */
  public readonly ActiveTab = signal('tab1');

  /** Liste des onglets de l'exemple principal (3 tabs avec icones + badge). */
  public readonly TabsList: TabItem[] = [
    { id: 'tab1', label: 'General', icon: 'home' },
    { id: 'tab2', label: 'Securite', icon: 'security', badge: 3 },
    { id: 'tab3', label: 'Notifications', icon: 'notifications' }
  ];

  /** Liste pour l'exemple avec etat desactive. */
  public readonly TabsWithDisabled: TabItem[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: 'dashboard' },
    { id: 'details', label: 'Details', icon: 'description' },
    { id: 'history', label: 'Historique', icon: 'history', disabled: true },
    { id: 'settings', label: 'Parametres', icon: 'settings' }
  ];

  /** Liste pour l'exemple sans icone. */
  public readonly TabsWithoutIcons: TabItem[] = [
    { id: 'day', label: 'Aujourd\'hui' },
    { id: 'week', label: 'Cette semaine', badge: 12 },
    { id: 'month', label: 'Ce mois-ci' },
    { id: 'year', label: 'Cette annee' }
  ];

  /** Liste pour l'exemple sans fullWidth (auto-fit). */
  public readonly TabsCompact: TabItem[] = [
    { id: 'inbox', label: 'Boite de reception', icon: 'inbox', badge: 5 },
    { id: 'sent', label: 'Envoyes', icon: 'send' },
    { id: 'drafts', label: 'Brouillons', icon: 'drafts' }
  ];

  /** Liste pour la demo des couleurs de badge automatiques. */
  public readonly BadgeColors: TabItem[] = [
    { id: 'urgent', label: 'Urgent', icon: 'priority_high', badge: 2, badgeType: 'urgent' },
    { id: 'new', label: 'Nouveaux', icon: 'fiber_new', badge: 7, badgeType: 'new' },
    { id: 'hot', label: 'Populaires', icon: 'local_fire_department', badge: 12, badgeType: 'hot' },
    { id: 'premium', label: 'Premium', icon: 'star', badge: 1, badgeType: 'premium' },
    { id: 'selectionnes', label: 'Selectionnes', icon: 'check_circle', badge: 4, badgeType: 'success' },
    { id: 'autres', label: 'Autres', icon: 'more_horiz', badge: 99 }
  ];

  /** Snippet copiable Tabs (exemple par defaut). */
  public readonly TabsCode: string = `<app-tabs [tabs]="tabs" [activeTab]="active()"
  (tabChange)="active.set($event)" [showIcons]="true" [fullWidth]="true" />`;

  //#endregion

  //#region Demo Navbar

  /**
   * Reference vers l'<app-navbar> embarque pour piloter son menu hamburger.
   * - cm - On utilise @ViewChild pour acceder a isMenuOpen + toggleMenu / closeMenu
   * de la navbar reelle, sans modifier le composant partage.
   */
  @ViewChild('DemoNavbar') private _Navbar?: NavbarComponent;

  /**
   * Viewports simules pour la vitrine navbar.
   * - cm - Largeurs alignees sur les breakpoints SellMatch. La navbar embarque
   * sa propre media-query `@include tablet` (max-width: 1024px) :
   * - desktop 1100px : menu horizontal complet (au-dessus du breakpoint)
   * - tablette 820px : declenchement du hamburger
   * - mobile 390px : hamburger confirme
   */
  public readonly ViewportPresets: IViewportPreset[] = [
    { id: 'desktop', label: 'Desktop 1100', width: 1100, height: 320, icon: 'desktop_windows' },
    { id: 'tablet', label: 'Tablette 820', width: 820, height: 480, icon: 'tablet_mac' },
    { id: 'mobile', label: 'Mobile 390', width: 390, height: 640, icon: 'phone_iphone' }
  ];

  /** Viewport actuellement selectionne pour le cadre responsive. */
  public readonly SelectedViewport = signal<IViewportPreset['id']>('desktop');

  /** Viewport courant (objet) derive du SelectedViewport pour le template. */
  public readonly CurrentViewport = computed<IViewportPreset>(() =>
    this.ViewportPresets.find((pPreset) => pPreset.id === this.SelectedViewport()) ?? this.ViewportPresets[0]
  );

  /**
   * Force l'affichage du hamburger meme sur grand cadre.
   * - cm - C'est purement un indicateur visuel pour le bouton de controle. Le
   * switch reel entre desktop/mobile se fait par la media query de la navbar
   * qui repond a la largeur du cadre. Ici on note juste l'intention.
   */
  public readonly ForceHamburger = signal(false);

  /**
   * Indique si le menu de la navbar est actuellement ouvert (suivi best-effort).
   * - cm - Reflet du state interne de la navbar. Quand l'utilisateur clique
   * directement le hamburger dans le cadre, ce signal reste desynchronise :
   * c'est un faux positif acceptable, le menu est reellement ouvert (ou ferme)
   * dans la navbar reelle, c'est juste l'indicateur UI qui n'est pas a jour.
   * Pour forcer la synchro, on peut cliquer "Ouvrir le menu" qui passe par
   * ToggleMenu() et met a jour MenuOpen.
   */
  public readonly MenuOpen = signal(false);

  /**
   * Snippet copiable de la navbar (montre comment l'utiliser dans une autre page).
   */
  public readonly NavbarCode: string = `<app-navbar></app-navbar>
<!-- Place la navbar en haut de la page. Le menu hamburger
     s'active automatiquement sous 1024px (breakpoint tablette). -->`;

  //#endregion

  //#region Methods
  /**
   * Gere le changement d'onglet Tabs (callback unique partage par toutes les demos).
   * @param pTabId L'identifiant du nouvel onglet.
   */
  public OnTabChange(pTabId: string): void
  {
    this.ActiveTab.set(pTabId);
  }

  /**
   * Bascule le viewport du cadre navbar.
   * - cm - Ferme le menu hamburger a chaque changement de viewport pour eviter
   * qu'un menu ouvert en mode mobile reste visible quand on passe en desktop.
   * @param pId Identifiant du preset a activer.
   */
  public SetViewport(pId: IViewportPreset['id']): void
  {
    this.SelectedViewport.set(pId);
    this.MenuOpen.set(false);
    if (this._Navbar?.isMenuOpen) { this._Navbar.closeMenu(); }
    this.PostHog.Capture(this.BuildTrackingName('playground_navbar_viewport', 'tracking'), { viewport: pId });
  }

  /**
   * Toggle le mode "forcer hamburger" : note l'intention utilisateur.
   * - cm - Sans override CSS, ce toggle sert surtout de marqueur visuel cote
   * playground (l'etat reel de la navbar repond a la media query, pas a ce
   * signal). En mode desktop simule, le bouton hamburger peut quand meme
   * apparaitre si on agit sur la navbar (clic) ou si on reduit la fenetre.
   */
  public ToggleForceHamburger(pForce?: boolean): void
  {
    const lNew = pForce ?? !this.ForceHamburger();
    this.ForceHamburger.set(lNew);
    if (!lNew) { this.MenuOpen.set(false); }
    this.PostHog.Capture(this.BuildTrackingName('playground_navbar_force_hamburger', 'tracking'), { force: lNew });
  }

  /**
   * Ouvre ou ferme le menu de la navbar dans le cadre.
   * - cm - Agit sur le state interne de la navbar via @ViewChild. Le lock du
   * body (SyncBodyScrollLock) est gere par la navbar elle-meme.
   */
  public ToggleMenu(): void
  {
    if (!this._Navbar) { return; }
    this._Navbar.toggleMenu();
    this.MenuOpen.set(this._Navbar.isMenuOpen);
    this.PostHog.Capture(this.BuildTrackingName('playground_navbar_menu_toggle', 'tracking'), { open: this._Navbar.isMenuOpen });
  }
  //#endregion
}