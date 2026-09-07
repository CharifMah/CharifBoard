import { Component, inject, OnInit, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '@base/BaseComponent';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ImageComponent } from '@shared/components/image/image.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { BlogArticlesService } from '@core/sellmatchdb/services/blog-articles/blog-articles.service';
import { BlogArticlesDTO } from '@core/sellmatchdb/dto/blog-articles/blog-articles.dto';
import { SeoService } from '@core/services/seo/seo.service';
import { BlogAdminComponent } from '@components/blog-admin/blog-admin.component';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [RouterModule, ScrollRevealDirective, ButtonComponent, ImageComponent, BadgeComponent, BlogAdminComponent],
  templateUrl: './blog-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./blog-list.component.scss']
})
export class BlogListComponent extends BaseComponent implements OnInit
{
  //#region Attributes
  private readonly _BlogService: BlogArticlesService = inject(BlogArticlesService);
  private readonly _Seo: SeoService = inject(SeoService);
  private readonly _IsBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  //#endregion

  //#region Properties
  public Articles: BlogArticlesDTO[] = [];

  public ShowAdmin: boolean = false;
  //#endregion

  //#region Lifecycle

  /**
   * Initialise le composant : SEO + chargement des articles.
   */
  public ngOnInit(): void
  {
    this.BusyService.show();
    // - cm - SEO : meta tags pour la page blog
    this._Seo.SetPageMeta({
      Title: 'Blog immobilier SellMatch | Estimation, marché, conseils de vente',
      Description: 'Articles et conseils immobiliers : estimation gratuite, prix au m², données DVF+, vente immobilière. Le blog SellMatch pour vendre votre bien au bon prix.',
      CanonicalUrl: this._Seo.BuildUrl('/blog'),
      OgTitle: 'Blog immobilier SellMatch',
      OgDescription: 'Articles et conseils immobiliers : estimation, prix au m², DVF+, vente immobilière.'
    });

    // - cm - Données structurées JSON-LD : Blog
    this._Seo.SetJsonLd('blog', {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Blog SellMatch',
      description: 'Articles et conseils immobiliers : estimation, prix au m², DVF+, vente immobilière.',
      url: 'https://www.sellmatch.fr/blog',
      publisher: { '@type': 'Organization', name: 'SellMatch', url: 'https://www.sellmatch.fr' }
    });

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
   * Charge les articles publiés depuis l'API.
   */
  public async LoadArticles(): Promise<void>
  {
    try
    {
      const lArticles = await this._BlogService.GetPublishedArticles(20);
      // - cm - Trier : articles "à la une" en premier, puis par date de publication décroissante
      this.Articles = lArticles.sort((pA: BlogArticlesDTO, pB: BlogArticlesDTO) =>
      {
        if (pA.isFeatured && !pB.isFeatured) return -1;
        if (!pA.isFeatured && pB.isFeatured) return 1;
        return new Date(pB.publishedAt ?? 0).getTime() - new Date(pA.publishedAt ?? 0).getTime();
      });
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
   * Indique si l'utilisateur connecté est admin.
   */
  public get IsAdmin(): boolean
  {
    return this.UsersService.isAdmin();
  }

  /**
   * Ouvre/ferme le panneau d'administration du blog.
   */
  public ToggleAdmin(): void
  {
    this.ShowAdmin = !this.ShowAdmin;
  }

  /**
   * Recharge les articles après une modification admin (sans fermer l'admin).
   */
  public async OnAdminChanged(): Promise<void>
  {
    await this.LoadArticles();
  }

  //#endregion
}
