import { Component, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '@base/BaseComponent';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { ButtonComponent } from '@shared/components/button/button.component';
import { FaqEstimationComponent } from '@shared/components/faq-estimation/faq-estimation.component';
import { InputComponent } from '@shared/components/input/input.component';

/**
 * Identifiant d'une question dans la FAQ.
 * - cm - Sert a la fois de cle d'expansion (toggleQuestion) et d'identifiant
 * de traduction (`faq.sections.<category>.q<index>.q`). Le format est
 * deterministe : `<category>-<index>` (ex: 'general-1', 'sellers-3', 'agents-2').
 */
export type TFaqQuestionId = `${string}-${number}`;

/**
 * Definition declarative d'une question de la FAQ.
 * Les labels redactionnels sont resolus a la volee via `this.Translate.translate()`
 * (le markForCheck du BaseComponent garantit le re-render apres changement de langue).
 */
export interface IFaqQuestion
{
  /** Identifiant unique (cle d'expansion + cle i18n derivee). */
  id: TFaqQuestionId;
  /** Cle i18n du titre de la question (ex: 'faq.sections.general.q1.q'). */
  questionKey: string;
  /** Liste de cles i18n pour les paragraphes de la reponse. */
  answerKeys: string[];
  /** Liste de cles i18n pour les puces de la reponse (optionnel). */
  listKeys?: string[];
  /** Liste de cles i18n pour les paragraphes apres la liste (optionnel). */
  afterListKeys?: string[];
}

/**
 * Definition declarative d'une categorie de la FAQ.
 */
export interface IFaqCategory
{
  /** Identifiant logique (cle i18n derivee). */
  id: 'general' | 'sellers' | 'agents' | 'technical' | 'estimation';
  /** Cle i18n du titre de la categorie (ex: 'faq.sections.general.title'). */
  titleKey: string;
  /** Questions de la categorie. Vide pour 'estimation' (delegue a <app-faq-estimation>). */
  questions: IFaqQuestion[];
}

/**
 * Catalogue statique des categories/questions de la FAQ.
 * - cm - Source de verite unique pour l'ordre, les ids et les cles i18n.
 * Les textes sont resolus dynamiquement dans le template via `Translate.translate()`.
 */
const FAQ_CATALOG: IFaqCategory[] = [
  {
    id: 'general',
    titleKey: 'faq.sections.general.title',
    questions: [
      { id: 'general-1', questionKey: 'faq.sections.general.q1.q', answerKeys: ['faq.sections.general.q1.a.0', 'faq.sections.general.q1.a.1', 'faq.sections.general.q1.a.2'], listKeys: ['faq.sections.general.q1.list.0', 'faq.sections.general.q1.list.1', 'faq.sections.general.q1.list.2', 'faq.sections.general.q1.list.3'], afterListKeys: ['faq.sections.general.q1.aAfterList.0', 'faq.sections.general.q1.aAfterList.1', 'faq.sections.general.q1.aAfterList.2', 'faq.sections.general.q1.aAfterList.3'] },
      { id: 'general-2', questionKey: 'faq.sections.general.q2.q', answerKeys: ['faq.sections.general.q2.a.0'] },
      { id: 'general-3', questionKey: 'faq.sections.general.q3.q', answerKeys: ['faq.sections.general.q3.a.0', 'faq.sections.general.q3.a.1', 'faq.sections.general.q3.a.2', 'faq.sections.general.q3.a.3', 'faq.sections.general.q3.a.4', 'faq.sections.general.q3.a.5', 'faq.sections.general.q3.a.6'], listKeys: ['faq.sections.general.q3.list.0', 'faq.sections.general.q3.list.1'], afterListKeys: ['faq.sections.general.q3.aAfterList.0'] },
      { id: 'general-4', questionKey: 'faq.sections.general.q4.q', answerKeys: ['faq.sections.general.q4.a.0'] }
    ]
  },
  {
    id: 'sellers',
    titleKey: 'faq.sections.sellers.title',
    questions: [
      { id: 'sellers-1', questionKey: 'faq.sections.sellers.q1.q', answerKeys: ['faq.sections.sellers.q1.a.0', 'faq.sections.sellers.q1.a.1', 'faq.sections.sellers.q1.a.2', 'faq.sections.sellers.q1.a.3', 'faq.sections.sellers.q1.a.4', 'faq.sections.sellers.q1.a.5'], listKeys: ['faq.sections.sellers.q1.list.0', 'faq.sections.sellers.q1.list.1', 'faq.sections.sellers.q1.list.2'] },
      { id: 'sellers-2', questionKey: 'faq.sections.sellers.q2.q', answerKeys: ['faq.sections.sellers.q2.a.0', 'faq.sections.sellers.q2.a.1', 'faq.sections.sellers.q2.a.2', 'faq.sections.sellers.q2.a.3'], listKeys: ['faq.sections.sellers.q2.list.0', 'faq.sections.sellers.q2.list.1', 'faq.sections.sellers.q2.list.2', 'faq.sections.sellers.q2.list.3'], afterListKeys: ['faq.sections.sellers.q2.aAfterList.0', 'faq.sections.sellers.q2.aAfterList.1'] },
      { id: 'sellers-3', questionKey: 'faq.sections.sellers.q3.q', answerKeys: ['faq.sections.sellers.q3.a.0'] },
      { id: 'sellers-4', questionKey: 'faq.sections.sellers.q4.q', answerKeys: ['faq.sections.sellers.q4.a.0'] },
      { id: 'sellers-5', questionKey: 'faq.sections.sellers.q5.q', answerKeys: ['faq.sections.sellers.q5.a.0'] }
    ]
  },
  {
    id: 'agents',
    titleKey: 'faq.sections.agents.title',
    questions: [
      { id: 'agents-1', questionKey: 'faq.sections.agents.q1.q', answerKeys: ['faq.sections.agents.q1.a.0', 'faq.sections.agents.q1.a.1', 'faq.sections.agents.q1.a.2', 'faq.sections.agents.q1.a.3'] },
      { id: 'agents-2', questionKey: 'faq.sections.agents.q2.q', answerKeys: ['faq.sections.agents.q2.a.0', 'faq.sections.agents.q2.a.1', 'faq.sections.agents.q2.a.2', 'faq.sections.agents.q2.a.3', 'faq.sections.agents.q2.a.4', 'faq.sections.agents.q2.a.5'] }
    ]
  },
  {
    id: 'technical',
    titleKey: 'faq.sections.technical.title',
    questions: [
      { id: 'tech-1', questionKey: 'faq.sections.technical.q1.q', answerKeys: ['faq.sections.technical.q1.a.0'] },
      { id: 'tech-2', questionKey: 'faq.sections.technical.q2.q', answerKeys: ['faq.sections.technical.q2.a.0'] },
      { id: 'tech-3', questionKey: 'faq.sections.technical.q3.q', answerKeys: ['faq.sections.technical.q3.a.0'] },
      { id: 'tech-4', questionKey: 'faq.sections.technical.q4.q', answerKeys: ['faq.sections.technical.q4.a.0'] }
    ]
  },
  {
    id: 'estimation',
    titleKey: 'faq.sections.estimation.title',
    questions: []
  }
];

@Component({
  selector: 'app-faq',
  standalone: true,
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, RouterModule, ScrollRevealDirective, ButtonComponent, FaqEstimationComponent, InputComponent],
})
export class FaqComponent extends BaseComponent
{
  /** Catalogue declaratif des categories/questions. */
  public readonly categories: IFaqCategory[] = FAQ_CATALOG;

  searchQuery: string = '';
  activeCategory: string = 'all';
  expandedQuestions: Set<string> = new Set();

  constructor ()
  {
    super();
  }

  toggleQuestion(questionId: string): void
  {
    if (this.expandedQuestions.has(questionId))
    {
      this.expandedQuestions.delete(questionId);
    } else
    {
      this.expandedQuestions.add(questionId);
    }
  }

  isQuestionExpanded(questionId: string): boolean
  {
    return this.expandedQuestions.has(questionId);
  }

  setActiveCategory(categoryId: string): void
  {
    this.activeCategory = categoryId;
  }

  clearSearch(): void
  {
    this.searchQuery = '';
  }

  /**
   * Filtre une question selon la recherche courante (surcharge IFaqQuestion).
   * - cm - Utilise la cle i18n resolue (`Translate.translate`) pour matcher, ce qui
   * rend la recherche operationnelle dans toutes les langues supportees.
   * @param pQuestion Question a tester
   * @returns true si la question doit etre affichee
   */
  isQuestionMatchingSearch(pQuestion: IFaqQuestion): boolean;
  /**
   * Filtre une question selon la recherche courante (surcharge string, compat
   * template historique qui passait directement le texte de la question).
   * @param pQuestionText Texte brut de la question
   * @returns true si le texte matche la recherche
   */
  isQuestionMatchingSearch(pQuestionText: string): boolean;
  isQuestionMatchingSearch(pInput: IFaqQuestion | string): boolean
  {
    if (!this.searchQuery.trim()) { return true; }
    const lQuery: string = this.searchQuery.toLowerCase();
    if (typeof pInput === 'string')
    {
      return pInput.toLowerCase().includes(lQuery);
    }
    const lQuestionText: string = this.Translate.translate(pInput.questionKey).toLowerCase();
    if (lQuestionText.includes(lQuery)) { return true; }
    // - cm - Fallback : on cherche aussi dans les paragraphes de reponse
    return pInput.answerKeys.some((pKey) => this.Translate.translate(pKey).toLowerCase().includes(lQuery));
  }

  /**
   * Resout une cle i18n en texte (helper template).
   * @param pKey Cle de traduction
   * @returns Texte traduit
   */
  t(pKey: string): string
  {
    return this.Translate.translate(pKey);
  }

  /**
   * Suit une question (trackBy pour @for).
   * @param _pIndex Index (non utilise)
   * @param pQuestion Question courante
   * @returns Identifiant stable
   */
  trackQuestion(_pIndex: number, pQuestion: IFaqQuestion): string
  {
    return pQuestion.id;
  }
}
