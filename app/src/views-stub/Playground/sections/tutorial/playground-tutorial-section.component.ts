import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { TutorialService } from '@core/services/tutorial/tutorial.service';
import { ITutorialStep } from '@core/services/tutorial/tutorial.types';

/**
 * Démo interactive du système de tutoriel guidé générique.
 *
 * Présente :
 * - Un parcours de 5 étapes avec différents placements (top/bottom/left/right/center).
 * - Une fausse UI ciblée par les selectors (`#demo-card`, `#demo-input`, `#demo-button`...).
 * - Un bouton "Lancer le tuto" qui démarre le flow, et un "Réinitialiser" qui
 *   efface le flag `done` pour permettre la rejeu immédiate.
 *
 * Le composant `<app-tutorial-overlay>` doit être monté une seule fois au niveau
 * racine (cf. `playground.component.ts`) pour que l'overlay puisse s'afficher
 * par-dessus toutes les sections.
 */
@Component({
  selector: 'app-playground-tutorial-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, ButtonComponent, InputComponent],
  templateUrl: './playground-tutorial-section.component.html',
  styleUrl: './playground-tutorial-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundTutorialSectionComponent extends BaseComponent {
  //#region Attributes
  /** Service de tuto (singleton partagé avec `<app-tutorial-overlay>` racine). */
  public readonly Tutorial: TutorialService = inject(TutorialService);

  /** localStorage key de la démo playground. */
  private readonly _DoneKey: string = 'sellmatch.playground.tutorial.done';

  /** Saisie libre dans l'input de la démo. */
  public readonly DemoInput = signal<string>('Jean Dupont');

  /** État coché pour la case. */
  public readonly DemoChecked = signal<boolean>(false);

  /** Computed : indique si la démo est déjà marquée comme "vue". */
  public readonly IsDone = computed<boolean>(() => this.Tutorial.DoneStorageKey === this._DoneKey && this.Tutorial.IsDone());

  /** Computed : indique si un tuto est en cours (pour désactiver les boutons). */
  public readonly IsRunning = computed<boolean>(() => this.Tutorial.IsActive());

  /** Snippet copiable : déclaration + démarrage. */
  public readonly TutorialServiceCode: string = `import { TutorialService } from '@core/services/tutorial/tutorial.service';
import { ITutorialStep } from '@core/services/tutorial/tutorial.types';

private readonly _Tutorial: TutorialService = inject(TutorialService);

private readonly _Steps: ITutorialStep[] = [
  { Id: 'welcome', Title: 'Bienvenue', Description: '...', Placement: 'center', Icon: 'waving_hand' },
  { Id: 'card', Title: 'Carte', Description: '...', Selector: '#demo-card', Placement: 'right', Icon: 'credit_card' }
];

this._Tutorial.Start({ Steps: this._Steps, DoneStorageKey: 'my.flow.done', Title: 'Mon tuto' });`;

  /** Snippet copiable : déclaration template racine. */
  public readonly TutorialOverlayCode: string = `<!-- À monter UNE fois au niveau racine (app.component ou layout principal) -->
<app-tutorial-overlay />`;

  /** Snippet copiable : ITutorialStep. */
  public readonly TutorialStepCode: string = `interface ITutorialStep {
  Id: string;             // Identifiant unique (analytics / debug)
  Title: string;          // Titre affiché dans le tooltip
  Description: string;    // Description affichée sous le titre
  Selector?: string;      // Sélecteur CSS de l'élément à spotlighter
  NavigateTo?: string;    // Vue à atteindre avant l'étape (via OnViewChange)
  Placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  Icon?: string;          // Icône Material Icons
}`;
  //#endregion

  //#region Methods
  /**
   * Démarre le parcours de démonstration (5 étapes sur des éléments fictifs).
   */
  public OnStartDemo(): void {
    // - cm - On configure le service avec la clé de la démo playground puis on lance
    const lSteps: ITutorialStep[] = [
      {
        Id: 'demo-welcome',
        Title: 'Tutoriel guidé',
        Description: 'Ce système de tuto réutilisable est générique : il fonctionne pour n\'importe quel parcours dans l\'app. Suivez les étapes pour voir les différents placements.',
        Placement: 'center',
        Icon: 'school'
      },
      {
        Id: 'demo-card',
        Title: 'Spotlight à droite',
        Description: 'L\'élément ciblé est mis en valeur par un cadre lumineux, le reste de l\'écran est assombri. Le tooltip se positionne automatiquement à droite par défaut.',
        Selector: '#demo-card',
        Placement: 'right',
        Icon: 'credit_card'
      },
      {
        Id: 'demo-input',
        Title: 'Spotlight en bas',
        Description: 'Le placement est libre : top, bottom, left, right ou center. Le composant flip automatiquement s\'il n\'a pas la place.',
        Selector: '#demo-input',
        Placement: 'bottom',
        Icon: 'edit'
      },
      {
        Id: 'demo-checkbox',
        Title: 'Spotlight à gauche',
        Description: 'Vous pouvez naviguer avec Précédent / Suivant, fermer avec la croix ou la touche Échap, ou cliquer Passer.',
        Selector: '#demo-checkbox',
        Placement: 'left',
        Icon: 'check_box'
      },
      {
        Id: 'demo-finish',
        Title: 'Bravo !',
        Description: 'Une fois terminé, l\'état "done" est persisté en localStorage pour ne plus relancer automatiquement. Utilisez "Réinitialiser" pour le rejouer.',
        Selector: '#demo-finish',
        Placement: 'top',
        Icon: 'celebration'
      }
    ];

    this.Tutorial.Start({
      Steps: lSteps,
      DoneStorageKey: this._DoneKey,
      Title: 'Démo Playground',
      Icon: 'school'
    });
  }

  /**
   * Coupe court au tuto en cours (équivalent du bouton "Passer").
   */
  public OnSkip(): void {
    this.Tutorial.Skip();
  }

  /**
   * Efface l'état "done" du localStorage pour permettre la rejeu.
   */
  public OnReset(): void {
    this.Tutorial.Reset();
    // - cm - On force le storage key courant pour que IsDone() reflète bien la clé playground
    this.Tutorial.Start({
      Steps: [],
      DoneStorageKey: this._DoneKey,
      Title: 'Démo Playground',
      Icon: 'school'
    });
    this.Tutorial.Skip();
  }

  /**
   * Tracking d'une interaction interne à la démo (pour montrer qu'on peut mixer
   * un tuto avec le reste de l'UI).
   */
  public OnDemoInputChanged(pValue?: string): void {
    if (typeof pValue === 'string') {
      this.DemoInput.set(pValue);
    }
  }

  /**
   * Toggle de la checkbox de démo.
   * @param pValue Nouvelle valeur (optionnel, toggle si absent).
   */
  public OnDemoCheckedToggle(pValue?: boolean): void {
    if (typeof pValue === 'boolean') {
      this.DemoChecked.set(pValue);
      return;
    }
    this.DemoChecked.update((pCurrent: boolean): boolean => !pCurrent);
  }
  //#endregion
}
