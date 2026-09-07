import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BaseComponent } from '@base/BaseComponent';
import { SeoService } from '@core/services/seo/seo.service';
import { EvolutionMensuellePrixCommuneService } from '@core/dvfdb/services/EvolutionMensuellePrixCommune/EvolutionMensuellePrixCommuneService';
import { EvolutionMensuellePrixCommuneDTO } from '@core/dvfdb/dto/EvolutionMensuellePrixCommune/EvolutionMensuellePrixCommuneDTO';
import { EvolutionMensuellePrixCommuneComponent } from '@views/Public/OutilEstimation/EvolutionMensuellePrixCommune/evolution-mensuelle-prix-commune.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { AdressesService } from '@core/sellmatchdb/services/adresses/adresses.service';

/**
 * Page SEO de longue traîne : estimation immobilière par ville.
 * Route : /estimation-immobiliere/:ville
 * Affiche le prix au m² moyen, l'évolution des prix et un CTA vers l'outil d'estimation.
 */
@Component({
  selector: 'app-estimation-ville',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, EvolutionMensuellePrixCommuneComponent, ScrollRevealDirective],
  templateUrl: './estimation-ville.component.html',
  styleUrls: ['./estimation-ville.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class EstimationVilleComponent extends BaseComponent implements OnInit, OnDestroy
{
  //#region Attributes
  private readonly _Route: ActivatedRoute = inject(ActivatedRoute);
  private readonly _Seo: SeoService = inject(SeoService);
  private readonly _EvolutionService: EvolutionMensuellePrixCommuneService = inject(EvolutionMensuellePrixCommuneService);
  private readonly _AdressesService: AdressesService = inject(AdressesService);
  private readonly _IsBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  private _RouteSub?: Subscription;
  //#endregion

  //#region Properties
  /** Nom affichable de la ville (ex: "Lyon") */
  public VilleNom: string = '';

  /** Slug de la ville depuis l'URL (ex: "lyon") */
  public VilleSlug: string = '';

  /** Code postal de la ville */
  public CodePostal: string = '';

  /** Longitude de la ville pour les requêtes DVF+ */
  public Longitude: number | null = null;

  /** Latitude de la ville pour les requêtes DVF+ */
  public Latitude: number | null = null;

  /** Prix au m² moyen sur 12 mois glissants */
  public PrixM2Moyen: number | null = null;

  /** Prix au m² médian sur 12 mois glissants */
  public PrixM2Median: number | null = null;

  /** Nombre de ventes sur 12 mois */
  public NbVentes12M: number | null = null;

  /** Données d'évolution mensuelle pour le graphique */
  public EvolutionData: EvolutionMensuellePrixCommuneDTO[] = [];

  /** Indique si les données sont en cours de chargement */
  public IsLoading: boolean = true;

  /** Indique si la ville n'a pas été trouvée */
  public NotFound: boolean = false;
  //#endregion

  //#region Lifecycle

  /**
   * Initialise le composant : s'abonne aux changements du paramètre ville pour réagir à la navigation entre villes.
   */
  public ngOnInit(): void
  {
    // - cm - Abonnement à paramMap pour réagir aux changements de ville sans recharger le composant
    this._RouteSub = this._Route.paramMap.subscribe((pParams) =>
    {
      const lSlug: string | null = pParams.get('ville');

      // - cm - Réinitialisation de l'état avant chargement de la nouvelle ville
      this.NotFound = false;
      this.IsLoading = true;
      this.PrixM2Moyen = null;
      this.PrixM2Median = null;
      this.NbVentes12M = null;
      this.EvolutionData = [];
      this.Longitude = null;
      this.Latitude = null;
      this.CodePostal = ''

      if (!lSlug)
      {
        this.NotFound = true;
        this.IsLoading = false;
        return;
      }

      this.VilleSlug = lSlug;
      this.VilleNom = this.FormatVilleNom(lSlug);

      // - cm - SEO de base immédiat (avant chargement des données)
      this.SetSeoBase();

      // - cm - SSR-safe : le géocodage et les requêtes DVF+ se font côté navigateur uniquement
      if (!this._IsBrowser)
      {
        this.IsLoading = false;
        return;
      }

      this.LoadVilleData();
    });
  }

  /**
   * Nettoie l'abonnement à la route lors de la destruction du composant.
   */
  public ngOnDestroy(): void
  {
    this._RouteSub?.unsubscribe();
  }

  //#endregion

  //#region Methods

  /**
   * Formate un slug en nom affichable (ex: "saint-etienne" → "Saint-Etienne").
   * @param pSlug Le slug de la ville
   * @returns Le nom formaté
   */
  private FormatVilleNom(pSlug: string): string
  {
    return pSlug
      .split('-')
      .map((pPart: string) => pPart.charAt(0).toUpperCase() + pPart.slice(1))
      .join('-');
  }

  /**
   * Configure le SEO de base (title, meta, JSON-LD) avec le nom de la ville.
   */
  private SetSeoBase(): void
  {
    const lTitle: string = `Estimation immobilière à ${this.VilleNom} gratuite | SellMatch`;
    const lDescription: string = `Estimation immobilière gratuite à ${this.VilleNom} basée sur les données officielles DVF+. Prix au m², évolution du marché et estimation de votre bien en 2 minutes.`;
    const lCanonicalUrl: string = this._Seo.BuildUrl(`/estimation-immobiliere/${this.VilleSlug}`);

    this._Seo.SetPageMeta({
      Title: lTitle,
      Description: lDescription,
      CanonicalUrl: lCanonicalUrl,
      OgTitle: lTitle,
      OgDescription: lDescription
    });

    // - cm - JSON-LD : WebApplication localisé
    this._Seo.SetJsonLd('webapp', {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: `Estimation immobilière à ${this.VilleNom}`,
      description: `Estimez gratuitement la valeur de votre bien immobilier à ${this.VilleNom} grâce aux données officielles DVF+.`,
      url: lCanonicalUrl,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'All',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      provider: { '@type': 'Organization', name: 'SellMatch', url: 'https://www.sellmatch.fr' }
    });

    // - cm - JSON-LD : Service localisé
    this._Seo.SetJsonLd('service', {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `Estimation immobilière à ${this.VilleNom}`,
      description: `Estimation immobilière gratuite à ${this.VilleNom} basée sur les données officielles DVF+.`,
      provider: { '@type': 'Organization', name: 'SellMatch', url: 'https://www.sellmatch.fr' },
      areaServed: { '@type': 'City', name: this.VilleNom },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      url: lCanonicalUrl
    });

    // - cm - JSON-LD : HowTo (étapes d'estimation pour rich snippet)
    this._Seo.SetJsonLd('howto', {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `Estimer un bien immobilier à ${this.VilleNom}`,
      description: `Comment estimer gratuitement la valeur de votre bien immobilier à ${this.VilleNom} avec SellMatch.`,
      totalTime: 'PT2M',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Saisir l\'adresse', text: `Entrez l'adresse de votre bien à ${this.VilleNom}.` },
        { '@type': 'HowToStep', position: 2, name: 'Choisir le type de bien', text: 'Sélectionnez le type de bien (maison, appartement, terrain) et sa surface.' },
        { '@type': 'HowToStep', position: 3, name: 'Indiquer l\'état du bien', text: 'Renseignez l\'état général du bien (à rénover, correct, bon, excellent).' },
        { '@type': 'HowToStep', position: 4, name: 'Obtenir l\'estimation', text: `Recevez instantanément une fourchette de prix basée sur les transactions DVF+ à ${this.VilleNom}.` }
      ]
    });

    // - cm - JSON-LD : BreadcrumbList
    this._Seo.SetJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.sellmatch.fr/' },
        { '@type': 'ListItem', position: 2, name: 'Estimation immobilière', item: 'https://www.sellmatch.fr/estimation-immobiliere' },
        { '@type': 'ListItem', position: 3, name: this.VilleNom, item: lCanonicalUrl }
      ]
    });

    // - cm - JSON-LD : FAQPage localisée
    this._Seo.SetJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `Comment estimer un bien immobilier à ${this.VilleNom} ?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Utilisez l'outil d'estimation gratuit SellMatch en saisissant l'adresse de votre bien à ${this.VilleNom}. L'estimation est calculée à partir des transactions DVF+ récentes dans la zone.`
          }
        },
        {
          '@type': 'Question',
          name: `Quel est le prix au m² à ${this.VilleNom} ?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Le prix au m² à ${this.VilleNom} est calculé à partir des transactions officielles DVF+. Consultez l'évolution des prix ci-dessous pour obtenir le prix moyen et médian au m².`
          }
        },
        {
          '@type': 'Question',
          name: `L'estimation immobilière à ${this.VilleNom} est-elle gratuite ?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Oui, l'estimation SellMatch est entièrement gratuite et sans inscription. Vous obtenez une fourchette de prix basée sur les données DVF+ pour ${this.VilleNom}.`
          }
        }
      ]
    });
  }

  /**
   * Géocode la ville via l'API Adresse (data.gouv.fr) puis charge les données DVF+.
   */
  private async LoadVilleData(): Promise<void>
  {
    try
    {
      // - cm - Géocodage de la ville via l'API Adresse
      const lGeoData = await this.GeocodeVille(this.VilleSlug);

      if (!lGeoData)
      {
        this.NotFound = true;
        this.IsLoading = false;
        return;
      }

      this.Longitude = lGeoData.longitude;
      this.Latitude = lGeoData.latitude;
      this.CodePostal = lGeoData.codePostal;

      // - cm - Mise à jour du SEO avec les données enrichies
      this.SetSeoEnriched();

      // - cm - Chargement de l'évolution des prix DVF+
      await this.LoadEvolutionPrix();
    }
    catch (pError)
    {
      console.error('Erreur lors du chargement des données ville', pError);
      this.NotFound = true;
    }
    finally
    {
      this.IsLoading = false;
    }
  }

  /**
   * Géocode un slug de ville via le backend SellMatch (proxy Mapbox Search Box).
   * Le backend filtre par défaut sur la France et renvoie des `AdressesDTO`
   * avec latitude/longitude/code postal déjà normalisés.
   * @param pSlug Le slug de la ville
   * @returns Les coordonnées géographiques ou null si non trouvé
   */
  private async GeocodeVille(pSlug: string): Promise<{ longitude: number; latitude: number; codePostal: string } | null>
  {
    const lQuery: string = pSlug.replace(/-/g, ' ');
    // - cm - Filtre Mapbox "place" = uniquement les villes/communes (exclut rues, POI, codes postaux)
    const lResults = await this._AdressesService.SearchAsync(lQuery, 1, 'place');

    if (!lResults || lResults.length === 0)
    {
      return null;
    }

    const lResult = lResults[0];
    if (lResult.longitude == null || lResult.latitude == null)
    {
      return null;
    }

    return {
      longitude: Number(lResult.longitude),
      latitude: Number(lResult.latitude),
      codePostal: lResult.postcode ?? ''
    };
  }

  /**
   * Charge l'évolution mensuelle des prix DVF+ pour la ville.
   */
  private async LoadEvolutionPrix(): Promise<void>
  {
    if (this.Longitude == null || this.Latitude == null) return;

    try
    {
      const lData = await this._EvolutionService.getAll({
        Longitude: this.Longitude,
        Latitude: this.Latitude,
        RayonMetres: 5000,
        TypeBien: 'tous',
        NbMoisHistorique: 120,
        ValeurFoncMin: 10000,
        SurfaceBatiMin: 9
      } as any);

      this.EvolutionData = lData ?? [];

      // - cm - Extraction des statistiques sur 12 mois glissants
      if (this.EvolutionData.length > 0)
      {
        const lDernierMois = this.EvolutionData[this.EvolutionData.length - 1];
        this.PrixM2Moyen = lDernierMois.prixM2MoyenGlissant12M ?? null;
        this.PrixM2Median = lDernierMois.prixM2Pondere12M ?? null;
        this.NbVentes12M = lDernierMois.nbVentes12M ?? null;
      }

      // - cm - Mise à jour du SEO avec les prix réels
      this.SetSeoEnriched();
    }
    catch (pError)
    {
      console.error('Erreur lors du chargement de l\'évolution des prix', pError);
    }
  }

  /**
   * Configure le SEO enrichi avec les données de prix (si disponibles).
   */
  private SetSeoEnriched(): void
  {
    const lPrixInfo: string = this.PrixM2Moyen != null
      ? ` Prix au m² moyen : ${this.PrixM2Moyen.toLocaleString('fr-FR')} €.`
      : '';

    const lDescription: string = `Estimation immobilière gratuite à ${this.VilleNom} basée sur les données officielles DVF+.${lPrixInfo} Évolution du marché et estimation de votre bien en 2 minutes.`;

    const lCanonicalUrl: string = this._Seo.BuildUrl(`/estimation-immobiliere/${this.VilleSlug}`);

    this._Seo.SetPageMeta({
      Title: `Estimation immobilière à ${this.VilleNom} gratuite | SellMatch`,
      Description: lDescription,
      CanonicalUrl: lCanonicalUrl,
      OgTitle: `Estimation immobilière à ${this.VilleNom} gratuite | SellMatch`,
      OgDescription: lDescription
    });

    // - cm - FAQ enrichie avec les prix réels si disponibles
    const lPrixMoyenText: string = this.PrixM2Moyen != null
      ? ` Le prix au m² moyen à ${this.VilleNom} est de ${this.PrixM2Moyen.toLocaleString('fr-FR')} €.`
      : '';

    const lNbVentesText: string = this.NbVentes12M != null
      ? ` ${this.NbVentes12M.toLocaleString('fr-FR')} ventes ont été enregistrées à ${this.VilleNom} sur les 12 derniers mois.`
      : '';

    this._Seo.SetJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `Comment estimer un bien immobilier à ${this.VilleNom} ?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Utilisez l'outil d'estimation gratuit SellMatch en saisissant l'adresse de votre bien à ${this.VilleNom}. L'estimation est calculée à partir des transactions DVF+ récentes dans la zone.`
          }
        },
        {
          '@type': 'Question',
          name: `Quel est le prix au m² à ${this.VilleNom} ?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Le prix au m² à ${this.VilleNom} est calculé à partir des transactions officielles DVF+.${lPrixMoyenText} Consultez l'évolution des prix ci-dessus pour obtenir le détail.`
          }
        },
        {
          '@type': 'Question',
          name: `Combien de ventes à ${this.VilleNom} ?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${lNbVentesText || `Les transactions à ${this.VilleNom} sont suivies via la base DVF+ de l'administration fiscale.`}`
          }
        },
        {
          '@type': 'Question',
          name: `L'estimation immobilière à ${this.VilleNom} est-elle gratuite ?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Oui, l'estimation SellMatch est entièrement gratuite et sans inscription. Vous obtenez une fourchette de prix basée sur les données DVF+ pour ${this.VilleNom}.`
          }
        }
      ]
    });
  }

  //#endregion
}