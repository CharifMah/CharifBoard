import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { TranslationService, SupportedLanguage } from '@core/services/i18n/TranslationService';

/**
 * Section du playground démontrant le composant `LanguageSelector`.
 * Démontre :
 *  - le mode `select` (avec/sans label)
 *  - le mode `chips` (3 tailles)
 *  - la traduction i18n via `computed` réactifs sur `TranslationService.InstantTick` (pattern navbar)
 *  - des intégrations complètes : navbar + footer
 */
@Component({
  selector: 'app-playground-language-selector-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, LanguageSelectorComponent, ButtonComponent],
  templateUrl: './playground-language-selector-section.component.html',
  styleUrls: ['./playground-language-selector-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundLanguageSelectorSectionComponent extends BaseComponent
{
  //#region Attributes

  /** Snippet copiable : dropdown. */
  public readonly SelectCode: string = `<app-language-selector mode="select" label="Langue" />`;

  /** Snippet copiable : chips. */
  public readonly ChipsCode: string = `<app-language-selector mode="chips" size="md" />`;

  /** Snippet copiable : démo i18n. */
  public readonly TranslationCode: string = `<app-language-selector mode="select" />`;

  /** Snippet copiable : navbar. */
  public readonly HeaderCode: string = `<app-language-selector mode="select" />`;

  /** Snippet copiable : footer. */
  public readonly FooterCode: string = `<app-language-selector mode="chips" size="sm" />`;

  /** Service de traduction pour écouter les changements. */
  private readonly _Translation: TranslationService = inject(TranslationService);

  //#endregion

  //#region Properties

  /** Signal de la langue courante (mis à jour par le service). */
  public readonly CurrentLang: ReturnType<typeof signal<SupportedLanguage>> = signal<SupportedLanguage>(this.Translate.getCurrentLanguage());

  /** Libellé natif de la langue courante. */
  public readonly CurrentLangLabel: ReturnType<typeof computed<string>> = computed<string>(() =>
  {
    const lMap: Record<SupportedLanguage, string> = {
      fr: 'Français',
      en: 'English',
      es: 'Español',
      pt: 'Português'
    };
    return lMap[this.CurrentLang()];
  });

  //#region i18n Labels (computed réactifs sur InstantTick — pattern navbar)

  /**
   * - cm - Computed branchés sur Translate.InstantTick via TranslateReactive : quand le JSON
   * i18n finit de charger (ou que la langue change), InstantTick s'incrémente, ce qui
   * invalide le computed → Angular recalcule le label au prochain cycle. Pas de NG0600.
   */
  public readonly HeroTitle = computed<string>(() => this.Translate.TranslateReactive('home.hero.title'));
  public readonly HeroHighlight = computed<string>(() => this.Translate.TranslateReactive('home.hero.titleHighlight'));
  public readonly HeroCta = computed<string>(() => this.Translate.TranslateReactive('home.hero.ctaEstimate'));

  public readonly NavDashboard = computed<string>(() => this.Translate.TranslateReactive('playground.languageSelector.demo.nav.dashboard'));
  public readonly NavListings = computed<string>(() => this.Translate.TranslateReactive('playground.languageSelector.demo.nav.listings'));
  public readonly NavCandidates = computed<string>(() => this.Translate.TranslateReactive('playground.languageSelector.demo.nav.candidates'));
  public readonly NavMessages = computed<string>(() => this.Translate.TranslateReactive('playground.languageSelector.demo.nav.messages'));
  public readonly NavSignin = computed<string>(() => this.Translate.TranslateReactive('playground.languageSelector.demo.nav.signin'));

  public readonly FooterCopyright = computed<string>(() => this.Translate.TranslateReactive('playground.languageSelector.demo.footer.copyright'));

  //#endregion

  //#endregion

  //#region CTOR

  constructor()
  {
    super();

    // - cm - Sync du signal de langue courante uniquement : les computed i18n se
    // mettent à jour tout seuls via TranslateReactive/InstantTick. Plus besoin de
    // SyncTranslations() ni de TranslationLoaded / queueMicrotask : le computed est
    // déjà réactif, comme dans la navbar.
    this.Translate.LanguageChanged.subscribe((pLang: SupportedLanguage) =>
    {
      this.CurrentLang.set(pLang);
    });
  }

  //#endregion

  //#region Methods

  /**
   * Action de démo du bouton dans la navbar/encart i18n.
   * Log + PostHog tracking.
   */
  public OnDemoClick(): void
  {
    this.PostHog.Capture('playground_lang_selector_demo_click', { lang: this.CurrentLang() });
  }

  //#endregion
}
