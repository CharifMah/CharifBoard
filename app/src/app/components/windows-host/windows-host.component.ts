import { Component, inject } from '@angular/core';
import { WindowsService, WindowId } from '../../services/WindowsService';

interface TechIcon {
  /** Classe devicon (si icône font). */
  DeviconClass?: string;
  /** Chemin d'image locale (si icône image). */
  ImageUrl?: string;
  Alt: string;
}

/**
 * Hôte des fenêtres modales : CV (iframe PDF) et compétences (grille d'icônes).
 */
@Component({
  selector: 'app-windows-host',
  standalone: true,
  templateUrl: './windows-host.component.html',
  styleUrl: './windows-host.component.scss',
})
export class WindowsHostComponent {
  /** Service d'état des fenêtres. */
  public readonly Windows = inject(WindowsService);

  /** Icônes de la fenêtre compétences. */
  public readonly TechIcons: TechIcon[] = [
    { DeviconClass: 'devicon-git-plain-wordmark colored', Alt: 'Git' },
    { DeviconClass: 'devicon-github-original colored', Alt: 'GitHub' },
    { DeviconClass: 'devicon-gitlab-plain-wordmark colored', Alt: 'GitLab' },
    { DeviconClass: 'devicon-csharp-plain colored', Alt: 'C#' },
    { DeviconClass: 'devicon-visualstudio-plain colored', Alt: 'Visual Studio' },
    { DeviconClass: 'devicon-vscode-plain colored', Alt: 'VS Code' },
    { DeviconClass: 'devicon-selenium-original', Alt: 'Selenium' },
    { DeviconClass: 'devicon-dot-net-plain-wordmark colored', Alt: '.NET' },
    { DeviconClass: 'devicon-css3-plain-wordmark', Alt: 'CSS3' },
    { DeviconClass: 'devicon-html5-plain colored', Alt: 'HTML5' },
    { DeviconClass: 'devicon-javascript-plain colored', Alt: 'JavaScript' },
    { DeviconClass: 'devicon-typescript-plain colored', Alt: 'TypeScript' },
    { DeviconClass: 'devicon-mysql-plain colored', Alt: 'MySQL' },
    { DeviconClass: 'devicon-php-plain colored', Alt: 'PHP' },
    { DeviconClass: 'devicon-wordpress-plain colored', Alt: 'WordPress' },
    { DeviconClass: 'devicon-bash-plain colored', Alt: 'Bash' },
    { DeviconClass: 'devicon-photoshop-line', Alt: 'Photoshop' },
    { DeviconClass: 'devicon-phpstorm-plain-wordmark colored', Alt: 'PhpStorm' },
    { DeviconClass: 'devicon-filezilla-plain colored', Alt: 'FileZilla' },
    { DeviconClass: 'devicon-linux-plain colored', Alt: 'Linux' },
    { DeviconClass: 'devicon-redis-plain-wordmark colored', Alt: 'Redis' },
    { DeviconClass: 'devicon-androidstudio-plain-wordmark', Alt: 'Android Studio' },
    { DeviconClass: 'devicon-angularjs-plain colored', Alt: 'Angular' },
    { DeviconClass: 'devicon-docker-plain colored', Alt: 'Docker' },
    { DeviconClass: 'devicon-python-plain colored', Alt: 'Python' },
    { DeviconClass: 'devicon-vuejs-plain colored', Alt: 'VueJS' },
    { ImageUrl: 'images/Logo/wpf-logo.png', Alt: 'WPF' },
    { ImageUrl: 'images/Logo/cinema4d.png', Alt: 'Cinema4D' },
    { ImageUrl: 'images/Logo/ubuntu.png', Alt: 'Ubuntu' },
    { ImageUrl: 'images/Logo/pop-os-icon.png', Alt: 'PopOs' },
    { ImageUrl: 'images/Logo/No_Script_Logo.png', Alt: 'NoScript' },
    { ImageUrl: 'images/Logo/Virtualbox_logo.png', Alt: 'VirtualBox' },
  ];

  /**
   * Indique si la fenêtre donnée est ouverte.
   * @param pId Identifiant de fenêtre.
   */
  public IsOpen(pId: WindowId): boolean {
    return this.Windows.OpenWindow() === pId;
  }
}