import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, ActivatedRoute } from '@angular/router';
import { Title, Meta, DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AvatarComponent } from '@shared/components/Avatar/avatar.component';
import { BaseComponent } from '@base/BaseComponent';
import { UsersDTO } from '@core/sellmatchdb/dto';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-profil-pro',
  standalone: true,
  templateUrl: './profil-pro.component.html',
  styleUrls: ['./profil-pro.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterModule, AvatarComponent, ScrollRevealDirective, ButtonComponent]
})
export class ProfilProComponent extends BaseComponent implements OnInit {
  public User: UsersDTO | null = null;
  public isLoading = true;
  public error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private titleService: Title,
    private metaService: Meta,
    private sanitizer: DomSanitizer
  ) {
    super();
  }

  ngOnInit(): void {
    // Récupérer l'ID utilisateur depuis l'URL
    this.route.params.subscribe(params => {
      const userId = params['profilUrl'];
      if (userId) {
        this.loadUserProfile(userId);
      }
      else {
        this.error = "Identifiant utilisateur manquant";
        this.isLoading = false;
      }
    });
  }

  private async loadUserProfile(pProfilUrl: string): Promise<void> {
    try {
      this.isLoading = true;
      this.User = await this.UsersService.GetProfilPro({ profilUrl: pProfilUrl });

      // Si aucun utilisateur n'est trouvé
      if (!this.User) {
        this.error = "Utilisateur non trouvé";
      }
      else {
        // - cm - Mise à jour du SEO dynamique
        this.updateSeoTags();
      }
    }
    catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      this.error = "Une erreur s'est produite lors du chargement du profil";
    }
    finally {
      this.isLoading = false;
    }
  }

  /**
   * Met à jour les balises SEO pour le profil professionnel.
   * Inclut title, description, Open Graph et Schema.org.
   */
  private updateSeoTags(): void {
    if (!this.User) return;

    const lFullName = this.getFullName(this.User);
    const lCompany = this.User.companyName ? ` - ${this.User.companyName}` : '';
    const lTitle = `${lFullName}${lCompany} | SellMatch`;
    const lDescription = this.buildSeoDescription();
    const lProfilUrl = `https://www.sellmatch.fr/profil/${this.User.profilUrl}`;

    // - cm - Title
    this.titleService.setTitle(lTitle);

    // - cm - Meta description
    this.metaService.updateTag({ name: 'description', content: lDescription });

    // - cm - Robots
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

    // - cm - Canonical URL
    this.metaService.updateTag({ name: 'canonical', content: lProfilUrl });

    // - cm - Open Graph
    this.metaService.updateTag({ property: 'og:title', content: lTitle });
    this.metaService.updateTag({ property: 'og:description', content: lDescription });
    this.metaService.updateTag({ property: 'og:url', content: lProfilUrl });
    this.metaService.updateTag({ property: 'og:type', content: 'profile' });

    if (this.User.avatarUrl) {
      this.metaService.updateTag({ property: 'og:image', content: `${this.ApiBaseUrl}${this.User.avatarUrl}` });
    }

    // - cm - Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: lTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: lDescription });

    if (this.User.avatarUrl) {
      this.metaService.updateTag({ name: 'twitter:image', content: `${this.ApiBaseUrl}${this.User.avatarUrl}` });
    }
  }

  /**
   * Construit la description SEO à partir des données du profil.
   * @returns Description optimisée pour le SEO
   */
  private buildSeoDescription(): string {
    if (!this.User) return '';

    const lFullName = this.getFullName(this.User);
    const lCompany = this.User.companyName ? `${this.User.companyName}` : 'professionnel immobilier';
    const lLocation = this.User.address?.city ? ` à ${this.User.address.city}` : '';

    let lDescription = `${lFullName}, ${lCompany}${lLocation}. `;

    if (this.User.bio) {
      // - cm - Limiter la bio à 100 caractères pour la description
      const lBioShort = this.User.bio.length > 100
        ? this.User.bio.substring(0, 97) + '...'
        : this.User.bio;
      lDescription += lBioShort;
    }
    else {
      lDescription += 'Consultez son profil sur SellMatch pour découvrir ses services et prendre contact.';
    }

    return lDescription;
  }

  /**
   * Génère les données structurées Schema.org pour le profil professionnel.
   * Utilise le type RealEstateAgent pour les professionnels immobiliers.
   * @returns SafeHTML contenant le JSON-LD
   */
  public getSchemaOrgData(): SafeHtml {
    if (!this.User) return '';

    const lFullName = this.getFullName(this.User);
    const lProfilUrl = `https://www.sellmatch.fr/profil/${this.User.profilUrl}`;

    // - cm - Utiliser Record<string, any> pour éviter les erreurs TypeScript
    const lSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      'name': lFullName,
      'url': lProfilUrl,
      'jobTitle': 'Agent immobilier',
      'worksFor': {
        '@type': 'Organization',
        'name': this.User.companyName || 'SellMatch'
      }
    };

    // - cm - Ajouter l'image si disponible
    if (this.User.avatarUrl) {
      lSchema['image'] = `${this.ApiBaseUrl}${this.User.avatarUrl}`;
    }

    // - cm - Ajouter l'email
    if (this.User.email) {
      lSchema['email'] = this.User.email;
    }

    // - cm - Ajouter le téléphone
    if (this.User.phone) {
      lSchema['telephone'] = this.User.phone;
    }

    // - cm - Ajouter l'adresse
    if (this.User.address) {
      lSchema['address'] = {
        '@type': 'PostalAddress',
        'streetAddress': this.User.address.street || '',
        'addressLocality': this.User.address.city || '',
        'postalCode': this.User.address.postcode || '',
        'addressCountry': this.User.address.country || 'FR'
      };
    }

    // - cm - Ajouter la description (bio)
    if (this.User.bio) {
      lSchema['description'] = this.User.bio;
    }

    // - cm - Ajouter le SIRET
    if (this.User.siret) {
      lSchema['identifier'] = this.User.siret;
    }

    const lJsonLd = `<script type="application/ld+json">${JSON.stringify(lSchema)}</script>`;
    return this.sanitizer.bypassSecurityTrustHtml(lJsonLd);
  }
}
