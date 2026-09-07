import { Component, ChangeDetectionStrategy, signal, computed, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';

/**
 * Section du playground regroupant toutes les animations CSS réutilisables
 * de l'application : animations de texte (gradient, typewriter, mot par mot),
 * apparitions (fade, slide, scale), pulsations, spinners, secousses, shimmer
 * et effets au survol.
 *
 * Chaque sous-section montre l'effet en boucle et expose un snippet copiable
 * pour l'utiliser dans un composant métier.
 */
@Component({
  selector: 'app-playground-animations-section',
  standalone: true,
  imports: [CommonModule, PlaygroundSectionComponent, InputComponent, ScrollRevealDirective],
  templateUrl: './playground-animations-section.component.html',
  styleUrls: ['./playground-animations-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundAnimationsSectionComponent implements OnDestroy {
  //#region Attributes
  /** Indique si on s'exécute côté navigateur (pour les timers typewriter). */
  private readonly _IsBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /** Timer du typewriter (interval d'écriture caractère par caractère). */
  private _TypewriterTimer: ReturnType<typeof setInterval> | null = null;

  /** Texte complet du typewriter, utilisé pour le reset. */
  private readonly _TypewriterFullText: string = 'SellMatch anime vos interfaces avec fluidité.';

  /** État courant du typewriter (texte affiché à l'instant T). */
  public readonly TypewriterText = signal<string>('');

  /** Indique si le caret du typewriter clignote (toujours vrai en mode browser). */
  public readonly TypewriterCaretVisible = signal<boolean>(true);

  /** Compteur de rejouer pour l'animation "fade in mot par mot" (force le re-déclenchement). */
  public readonly WordReplay = signal<number>(0);

  /** Indique si la liste stagger est visible. Bascule false/true pour re-monter les items. */
  public readonly StaggerVisible = signal<boolean>(true);

  /** Vitesse du typewriter en ms par caractère (slider de la démo). */
  public readonly TypewriterSpeedMs = signal<number>(55);

  /** Indique si la boucle d'erreur (shake) est active. */
  public readonly ShakeLoop = signal<boolean>(true);

  /** Force le redémarrage des animations "one-shot" (bounce, slide, scale). */
  public readonly ReplayToken = signal<number>(0);

  /** Mot courant à animer pour la démo "surbrillance séquentielle". */
  public readonly HighlightIndex = signal<number>(-1);

  private _HighlightTimer: ReturnType<typeof setInterval> | null = null;

  /** Indique si la boucle de surbrillance séquentielle est active. */
  public readonly HighlightLoop = signal<boolean>(true);

  /** Snippet de code : animation de texte gradient animé. */
  public readonly GradientTextCode: string =
`.gradient-text {
  background: linear-gradient(90deg, var(--sm-primary), var(--sm-accent), var(--sm-primary));
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: gradient-shift 4s ease-in-out infinite;
}`;

  /** Snippet de code : apparitions simples (fadeIn, slideUp, slideDown, scaleIn). */
  public readonly FadeInCode: string =
`.appear-fade    { animation: fadeIn 0.4s ease-out both; }
.appear-slide   { animation: slideUp 0.4s ease-out both; }
.appear-down    { animation: slideDown 0.3s ease-out both; }
.appear-scale   { animation: scaleIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }`;

  /** Snippet de code : typewriter (placeholder documenté pour usage Angular). */
  public readonly TypewriterCode: string =
`<span class="typewriter">
  {{ text() }}<span class="typewriter__caret">|</span>
</span>

/* SCSS */
.typewriter {
  font-family: monospace;
  &__caret {
    display: inline-block;
    margin-left: 2px;
    animation: caret-blink 1s steps(2) infinite;
  }
}`;

  /** Snippet de code : fade in mot par mot. */
  public readonly WordFadeCode: string =
`<span class="word-fade">
  @for (word of words; track $index) {
    <span class="word-fade__word" [style.--i]="$index"> {{ word }} </span>
  }
</span>

/* SCSS */
.word-fade__word {
  display: inline-block;
  opacity: 0;
  transform: translateY(8px);
  animation: word-fade-in 0.5s ease-out forwards;
  animation-delay: calc(var(--i) * 80ms);
}`;

  /** Snippet de code : apparition en cascade (slideUp). */
  public readonly StaggerCode: string =
`<div class="stagger-list">
  @for (item of items; track item.id) {
    <div class="stagger-list__item" [style.--i]="$index">...</div>
  }
</div>

/* SCSS */
.stagger-list__item {
  opacity: 0;
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: calc(var(--i) * 100ms);
}`;

  /** Snippet de code : spinner avec rotation. */
  public readonly SpinCode: string =
`<span class="spin-demo" aria-label="Chargement"></span>

/* SCSS */
.spin-demo {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid var(--sm-border-color);
  border-top-color: var(--sm-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}`;

  /** Snippet de code : skeleton shimmer (référence à app-skeleton mais version CSS). */
  public readonly ShimmerCode: string =
`<div class="shimmer-bar"></div>

/* SCSS */
.shimmer-bar {
  height: 16px;
  border-radius: 8px;
  background: linear-gradient(90deg,
    var(--sm-surface-muted) 0%,
    var(--sm-surface-hover) 50%,
    var(--sm-surface-muted) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}`;

  /** Snippet de code : bouton CTA avec halo pulsé. */
  public readonly PulseGlowCode: string =
`<button class="pulse-cta">Action principale</button>

/* SCSS */
.pulse-cta {
  animation: pulse-glow 2s ease-in-out infinite;
}`;

  /** Snippet de code : feedback d'erreur avec secousse. */
  public readonly ShakeCode: string =
`<div class="shake-on-error" [class.is-shaking]="hasError">
  ...
</div>

/* SCSS */
.shake-on-error.is-shaking {
  animation: shake 0.4s ease-in-out;
}`;

  /** Snippet de code : effet hover lift + glow. */
  public readonly HoverLiftCode: string =
`<div class="hover-lift">Carte interactive</div>

/* SCSS */
.hover-lift {
  transition: transform 200ms ease, box-shadow 200ms ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }
}`;

  /** Snippet : appScrollReveal (directive Cuberto-like mot par mot) de la home. */
  public readonly ScrollRevealCode: string =
`<!-- HTML : directive appScrollReveal reutilisee sur la home -->
<h1 appScrollReveal [Animation]="'word'" [StaggerDelay]="80">
  Mon titre qui apparait mot par mot
</h1>

<p appScrollReveal [Animation]="'fade'" [OffsetY]="40">
  Bloc qui fade-up au scroll
</p>`;

  /** Snippet : .text-gradient (de styles.scss) — gradient anime en boucle. */
  public readonly TextGradientCode: string =
`.text-gradient {
  background-image: linear-gradient(135deg, $primary-color 0%, $accent-color 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 4s ease-in-out infinite;
}`;

  /** Snippet : .hero__title-highlight — clip-path reveal puis gradient-shift. */
  public readonly HeroHighlightCode: string =
`.hero__title-highlight {
  display: inline-block;
  background: linear-gradient(135deg, $purple-300 0%, $pink-700 50%, $blue-300 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: hero-highlight-reveal 1.2s cubic-bezier(0.25, 0.1, 0.1, 1) 1s forwards,
             gradient-shift 4s ease-in-out 1s infinite;
  opacity: 0;
  transform-origin: left;
}

@keyframes hero-highlight-reveal {
  0%   { opacity: 0; clip-path: inset(0 100% 0 0); }
  60%  { opacity: 1; clip-path: inset(0 0% 0 0); }
  100% { opacity: 1; clip-path: inset(0 0 0 0); }
}`;

  /** Snippet : keyframes décoratifs définis dans home.component.scss. */
  public readonly HomeKeyframesCode: string =
`/* SCSS : home.component.scss */

@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.05); }
}

@keyframes gradient-rotate {
  0%   { transform: rotate(0deg)   scale(1.5); }
  50%  { transform: rotate(180deg) scale(2); }
  100% { transform: rotate(360deg) scale(1.5); }
}

@keyframes bg-glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 0.6; transform: scale(1.1); }
}`;

  /** Snippet de code : float (flottement permanent). */
  public readonly FloatCode: string =
`<span class="float-icon material-icons">arrow_upward</span>

/* SCSS */
.float-icon {
  animation: float 3s ease-in-out infinite;
}`;

  /** Snippet de code : ping (onde de notification style map). */
  public readonly PingCode: string =
`<span class="ping-wrap">
  <span class="ping-wrap__dot"></span>
  <span class="ping-wrap__ping"></span>
</span>

/* SCSS */
.ping-wrap__ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--sm-primary);
  opacity: 0.6;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}`;

  /** Mots utilisés pour la démo "fade in mot par mot". */
  public readonly WordFadeWords: readonly string[] =
    ['SellMatch', 'anime', 'vos', 'interfaces', 'avec', 'fluidité'];

  /** Items de la liste en cascade (stagger slideUp). */
  public readonly StaggerItems: readonly { id: number; label: string }[] = [
    { id: 1, label: 'Premier élément' },
    { id: 2, label: 'Deuxième élément' },
    { id: 3, label: 'Troisième élément' },
    { id: 4, label: 'Quatrième élément' },
    { id: 5, label: 'Cinquième élément' }
  ];

  /** Couleurs de gradient pour le titre animé. */
  public readonly GradientColors: readonly string[] = [
    'var(--sm-primary)',
    'var(--sm-accent, var(--sm-secondary))',
    'var(--sm-primary)'
  ];

  /** Vitesse du typewriter formatée pour l'input number. */
  public readonly TypewriterSpeedLabel = computed((): string => String(this.TypewriterSpeedMs()));

  /** Wrapper Number pour les bindings Angular templates. */
  public readonly Number = Number;
  //#endregion

  //#region CTOR
  /**
   * Initialise le typewriter côté navigateur et lance la boucle de surbrillance.
   * SSR-safe : aucun timer n'est démarré si on n'est pas dans un navigateur.
   */
  constructor() {
    if (this._IsBrowser) {
      this._StartTypewriter();
      this._StartHighlightLoop();
    }
  }
  //#endregion

  //#region Methods
  /**
   * Nettoie les timers à la destruction du composant (évite les fuites mémoire).
   */
  public ngOnDestroy(): void {
    if (this._TypewriterTimer !== null) {
      clearInterval(this._TypewriterTimer);
      this._TypewriterTimer = null;
    }
    if (this._HighlightTimer !== null) {
      clearInterval(this._HighlightTimer);
      this._HighlightTimer = null;
    }
  }

  /**
   * Démarre la boucle typewriter : écrit caractère par caractère puis reset.
   * @private
   */
  private _StartTypewriter(): void {
    if (this._TypewriterTimer !== null) {
      return;
    }
    let lIndex = 0;
    const lTick = (): void => {
      lIndex += 1;
      if (lIndex > this._TypewriterFullText.length) {
        // - cm - Pause d'une seconde une fois le texte complet avant de recommencer.
        setTimeout((): void => {
          lIndex = 0;
          this.TypewriterText.set('');
        }, 1000);
        return;
      }
      this.TypewriterText.set(this._TypewriterFullText.slice(0, lIndex));
    };
    this._TypewriterTimer = setInterval(lTick, this.TypewriterSpeedMs());
  }

  /**
   * Démarre la boucle de surbrillance séquentielle sur les mots de la démo.
   * Avance d'un mot toutes les 700ms, met en valeur le mot courant.
   * @private
   */
  private _StartHighlightLoop(): void {
    if (this._HighlightTimer !== null) {
      return;
    }
    let lIndex = -1;
    this._HighlightTimer = setInterval((): void => {
      if (!this.HighlightLoop()) {
        this.HighlightIndex.set(-1);
        return;
      }
      lIndex = (lIndex + 1) % this.WordFadeWords.length;
      this.HighlightIndex.set(lIndex);
    }, 700);
  }

  /**
   * Rejoue l'animation "fade in mot par mot" en bumpant le ReplayToken.
   * Force Angular à re-render le sous-arbre et re-déclenche les keyframes.
   */
  public ReplayWordFade(): void {
    this.WordReplay.update((pValue: number): number => pValue + 1);
  }

  /**
   * Rejoue l'animation d'apparition en cascade (stagger).
   * Bascule StaggerVisible false → true pour re-monter le @if du DOM,
   * ce qui force les animations CSS forwards a repartir de zero.
   * Petit delai entre les deux pour laisser Angular demounter avant remonter.
   */
  public ReplayStagger(): void {
    this.StaggerVisible.set(false);
    setTimeout((): void => {
      this.StaggerVisible.set(true);
    }, 50);
  }

  /**
   * Rejoue la secousse d'erreur.
   */
  public ReplayShake(): void {
    this.ReplayToken.update((pValue: number): number => pValue + 1);
  }

  /**
   * Bascule la boucle d'erreur (shake) entre actif et inactif.
   */
  public ToggleShakeLoop(): void {
    this.ShakeLoop.update((pValue: boolean): boolean => !pValue);
  }

  /**
   * Bascule la boucle de surbrillance séquentielle.
   */
  public ToggleHighlightLoop(): void {
    this.HighlightLoop.update((pValue: boolean): boolean => !pValue);
  }

  /**
   * Met à jour la vitesse du typewriter (ms par caractère).
   * Redémarre le timer avec la nouvelle cadence.
   * @param pValue Nouvelle vitesse en ms.
   */
  public SetTypewriterSpeed(pValue: number | string): void {
    const lValue: number = Number(pValue);
    if (!Number.isFinite(lValue) || lValue < 10 || lValue > 500) {
      return;
    }
    this.TypewriterSpeedMs.set(lValue);
    if (this._TypewriterTimer !== null) {
      clearInterval(this._TypewriterTimer);
      this._TypewriterTimer = null;
      this._StartTypewriter();
    }
  }

  /**
   * Indique si un mot de la démo "surbrillance" est le mot actif.
   * @param pIndex Index du mot testé.
   * @returns true si le mot est en cours de surbrillance.
   */
  public IsWordHighlighted(pIndex: number): boolean {
    return this.HighlightLoop() && this.HighlightIndex() === pIndex;
  }
  //#endregion
}
