
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';

@Component({
  selector: 'app-cgv',
  standalone: true,
  templateUrl: './cgv.component.html',
  styleUrls: ['./cgv.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: []
})
export class CGVComponent extends BaseComponent
{
  // Par défaut, on affiche les CGV Professionnels
  activeTab: 'pro' | 'vendeur' = 'vendeur';

  constructor ()
  {
    super();
  }

  setActiveTab(tab: 'pro' | 'vendeur'): void
  {
    this.activeTab = tab;
  }
}
