import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';

@Component({
  selector: 'app-politique-confidentialite',
  standalone: true,
  templateUrl: './politique-confidentialite.component.html',
  styleUrls: ['./politique-confidentialite.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: []
})
export class PolitiqueConfidentialiteComponent extends BaseComponent
{
  constructor() 
  {
    super();
  }
}
