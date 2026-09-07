import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent'

@Component({
  selector: 'app-cookies-policy',
  standalone: true,
  templateUrl: './cookies-policy.component.html',
  styleUrls: ['./cookies-policy.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: []
})
export class CookiesPolicyComponent extends BaseComponent
{
  constructor() 
  {
    super();
  }
}
