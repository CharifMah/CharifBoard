import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';

import { RouterLink, RouterModule } from '@angular/router';
import { BaseComponent } from '@core/base/BaseComponent';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { ScrollIndicatorComponent } from '@shared/components/scroll-indicator/scroll-indicator.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { SeoService } from '@core/services/seo/seo.service';

@Component({
  selector: 'app-comment-ca-marche',
  standalone: true,
  imports: [RouterModule, RouterLink, ScrollRevealDirective, ScrollIndicatorComponent, ButtonComponent, BadgeComponent],
  templateUrl: './comment-ca-marche.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./comment-ca-marche.component.scss']
})
export class CommentCaMarcheComponent extends BaseComponent implements OnInit
{
  //#region Attributes
  private readonly _Seo: SeoService = inject(SeoService);
  //#endregion

  //#region Lifecycle
  /**
   * Initialise le composant et configure les meta tags SEO de la page.
   */
  public ngOnInit(): void
  {
    // - cm - SEO : meta tags via le SeoService centralisé
    this._Seo.SetPageMeta({
      Title: 'Comment ça marche | SellMatch — Trouver un agent immobilier',
      Description: 'Découvrez comment SellMatch fonctionne en 3 étapes : créez votre dossier anonyme, comparez les propositions des agents immobiliers de votre secteur, et choisissez librement. Gratuit, sans engagement.',
      CanonicalUrl: this._Seo.BuildUrl('/comment-ca-marche'),
      OgTitle: 'Comment ça marche | SellMatch',
      OgDescription: 'Comparez les agents immobiliers de votre secteur en 3 étapes. Gratuit, anonyme, sans engagement.'
    });

    // - cm - Données structurées JSON-LD : HowTo
    this._Seo.SetJsonLd('howto', {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'Comment trouver le bon agent immobilier avec SellMatch',
      description: 'Comparez les professionnels de votre secteur en 3 étapes simples, gratuitement et sans engagement.',
      url: 'https://www.sellmatch.fr/comment-ca-marche',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Créez votre dossier de vente', text: 'Remplissez 4 questions simples : type de bien, surface, localisation et délai souhaité.' },
        { '@type': 'HowToStep', position: 2, name: 'Recevez et comparez les propositions', text: 'Votre dossier est diffusé anonymement. Recevez 3 à 5 propositions détaillées sous 24h.' },
        { '@type': 'HowToStep', position: 3, name: 'Choisissez en toute liberté', text: 'Sélectionnez le professionnel qui vous convient. Aucune obligation, aucune pression.' }
      ]
    });
  }
  //#endregion

  //#region Methods
  phases = [
    {
      number: 1,
      title: 'Créez votre dossier de vente',
      steps: [
        {
          number: 1,
          title: 'Remplissez 4 questions simples',
          description: 'Type de bien, surface, localisation et délai souhaité. C\'est tout ce dont nous avons besoin.',
          detail: 'Vos données restent strictement confidentielles et ne sont jamais partagées sans votre accord.'
        }
      ]
    },
    {
      number: 2,
      title: 'Recevez et comparez les propositions',
      steps: [
        {
          number: 2,
          title: 'Votre dossier est diffusé anonymement',
          description: 'Les professionnels de votre secteur découvrent votre projet sans connaître votre identité.',
          detail: 'Aucun démarchage, aucun appel non désiré. Vous restez invisible.'
        },
        {
          number: 3,
          title: 'Recevez des propositions détaillées',
          description: 'Chaque professionnel intéressé vous envoie une candidature complète avec :',
          bulletPoints: [
            'Leur stratégie de commercialisation personnalisée',
            'Les services inclus dans leur accompagnement',
            'Les délais de vente estimés',
            'Leurs honoraires transparents (pas de surprise)'
          ],
          highlight: 'En moyenne : 3 à 5 propositions reçues sous 24h'
        },
        {
          number: 4,
          title: 'Comparez facilement',
          description: 'Analysez les candidatures côte à côte : méthodes, services, délais et tarifs.',
          detail: 'Des critères objectifs pour faire le bon choix, fini les discours commerciaux.'
        }
      ]
    },
    {
      number: 3,
      title: 'Choisissez en toute liberté',
      steps: [
        {
          number: 5,
          title: 'Sélectionnez votre professionnel',
          description: 'Contactez le ou les professionnels qui vous correspondent. Vos coordonnées ne sont transmises qu\'à votre demande.',
          detail: 'Vous pouvez aussi décider de ne choisir personne. Aucune obligation, aucune pression.'
        }
      ]
    }
  ];

  advantages = [
    {
      title: 'Anonymat total',
      description: 'Aucun professionnel ne peut vous contacter sans votre accord explicite.'
    },
    {
      title: 'Honoraires compétitifs',
      description: 'Avec l\'option Premium, recevez uniquement des propositions à tarifs encadrés.'
    },
    {
      title: 'Comparaison transparente',
      description: 'Tous les éléments essentiels sont présentés de manière claire et structurée.'
    },
    {
      title: 'Zéro engagement',
      description: 'Vous décidez à chaque étape, sans aucune obligation.'
    },
    {
      title: 'Aucune commission SellMatch',
      description: 'Nous ne prenons aucun pourcentage sur votre vente. SellMatch n\'est pas une agence.'
    }
  ];

  // Icônes pour les avantages
  /**
   * Retourne l'icône Material associée à un avantage par son index.
   * @param pIndex L'index de l'avantage dans la liste
   * @returns Le nom de l'icône Material Icons
   */
  getAdvantageIcon(pIndex: number): string
  {
    const lIcons = ['visibility_off', 'euro', 'compare_arrows', 'thumb_up', 'money_off'];
    return lIcons[pIndex] || 'check_circle';
  }
  //#endregion
}
