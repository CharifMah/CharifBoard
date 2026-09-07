import { Component } from '@angular/core';

interface SocialLink {
  name: string;
  url: string;
  iconUrl: string;
}

/**
 * Barre de liens sociaux : GitHub, LinkedIn, LeetCode, Fiverr.
 */
@Component({
  selector: 'app-social-bar',
  standalone: true,
  templateUrl: './social-bar.component.html',
  styleUrl: './social-bar.component.scss',
})
export class SocialBarComponent {
  /** Liens affichés dans la barre. */
  public readonly Links: SocialLink[] = [
    {
      name: 'GitHub',
      url: 'https://github.com/CharifMah',
      iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original-wordmark.svg',
    },
    {
      name: 'Linkedin',
      url: 'https://www.linkedin.com/in/charif-mahmoud-11b53b18a/',
      iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg',
    },
    {
      name: 'LeetCode',
      url: 'https://leetcode.com/Charif25/',
      iconUrl: 'images/Logo/leetcodeIcon.png',
    },
    {
      name: 'Fiverr',
      url: 'https://fr.fiverr.com/charif_21',
      iconUrl: 'images/Logo/FiverrIcon.png',
    },
  ];
}