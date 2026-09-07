import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { AvatarComponent } from '@shared/components/Avatar/avatar.component';

/**
 * Section dediee du playground : composant Avatar.
 * Tailles, statut en ligne, bordure, image utilisateur.
 */
@Component({
  selector: 'app-playground-avatar-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, AvatarComponent],
  templateUrl: './playground-avatar-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundAvatarSectionComponent extends BaseComponent
{
  /** Snippet copiable du composant Avatar. */
  public readonly AvatarCode: string = `<app-avatar [size]="'md'" [status]="'online'" />
<app-avatar [avatarUrl]="user.photoUrl" [size]="'xl'" [border]="true" />`;
}