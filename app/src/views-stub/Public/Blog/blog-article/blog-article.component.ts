import { Component, inject, OnInit, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BaseComponent } from '@base/BaseComponent';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ImageComponent } from '@shared/components/image/image.component';
import { BlogArticlesService } from '@core/sellmatchdb/services/blog-articles/blog-articles.service';
import { BlogArticlesDTO } from '@core/sellmatchdb/dto/blog-articles/blog-articles.dto';
import { SeoService } from '@core/services/seo/seo.service';
import { BadgeComponent } from '@shared/components/badge/badge.component';

@Component({
  selector: 'app-blog-article',
  standalone: true,
  imports: [RouterModule, ScrollRevealDirective, ButtonComponent, ImageComponent, BadgeComponent],
  templateUrl: './blog-article.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./blog-article.component.scss']
})
export class BlogArticleComponent extends BaseComponent implements OnInit
{
  //#region Attributes
  private readonly _Route: ActivatedRoute = inject(ActivatedRoute);
  private readonly _BlogService: BlogArticlesService = inject(BlogArticlesService);
  private readonly _Seo: SeoService = inject(SeoService);
  private readonly _IsBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  //#endregion

  //#region Properties
  public Article: BlogArticlesDTO | null = null;
  public NotFound: boolean = false;
  //#endregion

  //#region Lifecycle

  /**
   * Initialise le composant : récupère le slug depuis l'URL et charge l'article.
   */
  public ngOnInit(): void
  {
    this.BusyService.show();

    const lSlug: string | null = this._Route.snapshot.paramMap.get('slug');

    if (!lSlug)
    {
      this.BusyService.hide();
      this.NotFound = true;
      return;
    }

    // - cm - SSR-safe : charger l'article uniquement côté navigateur
    if (!this._IsBrowser)
    {
      this.BusyService.hide();
      return;
    }

    this.LoadArticle(lSlug);
  }

  //#endregion

  //#region Methods

  /**
   * Charge un article par son slug et configure le SEO.
   * @param pSlug Le slug de l'article
   */
  public async LoadArticle(pSlug: string): Promise<void>
  {
    try
    {

      this.Article = await this._BlogService.GetBySlug(pSlug);

      if (!this.Article)
      {
        this.NotFound = true;
        return;
      }

      // - cm - SEO : meta tags spécifiques à l'article
      this._Seo.SetPageMeta({
        Title: this.Article.title ?? 'Article — SellMatch',
        Description: this.Article.metaDescription ?? this.Article.excerpt ?? 'Article du blog immobilier SellMatch.',
        CanonicalUrl: this._Seo.BuildUrl(`/blog/${this.Article.slug}`),
        OgTitle: this.Article.title,
        OgDescription: this.Article.metaDescription ?? this.Article.excerpt,
        OgImage: this.ApiBaseUrl + (this.Article.ogImage ?? this.Article.coverImage)
      });

      // - cm - Données structurées JSON-LD : Article
      this._Seo.SetJsonLd('article', {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: this.Article.title,
        description: this.Article.metaDescription ?? this.Article.excerpt,
        image: this.ApiBaseUrl + (this.Article.ogImage ?? this.Article.coverImage),
        datePublished: this.Article.publishedAt,
        dateModified: this.Article.updatedAt,
        author: this.Article.author
          ? { '@type': 'Person', name: `${this.Article.author.firstName ?? ''} ${this.Article.author.lastName ?? ''}`.trim() }
          : { '@type': 'Organization', name: 'SellMatch' },
        publisher: { '@type': 'Organization', name: 'SellMatch', url: 'https://www.sellmatch.fr' },
        mainEntityOfPage: this._Seo.BuildUrl(`/blog/${this.Article.slug}`)
      });

      // - cm - Données structurées JSON-LD : BreadcrumbList
      this._Seo.SetJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.sellmatch.fr/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.sellmatch.fr/blog' },
          { '@type': 'ListItem', position: 3, name: this.Article.title, item: this._Seo.BuildUrl(`/blog/${this.Article.slug}`) }
        ]
      });
    }
    catch (pError)
    {
      console.error('Erreur lors du chargement de l\'article', pError);
      this.NotFound = true;
    }
    finally
    {
      this.BusyService.hide();
    }
  }

  //#endregion
}
