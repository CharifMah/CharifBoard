import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent'

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  templateUrl: './mentions-legales.component.html',
  styleUrls: ['./mentions-legales.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: []
})
export class MentionsLegalesComponent extends BaseComponent
{
  constructor() 
  {
    super();
  }
}
