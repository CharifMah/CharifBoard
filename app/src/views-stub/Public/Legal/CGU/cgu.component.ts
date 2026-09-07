import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';

@Component({
  selector: 'app-cgu',
  standalone: true,
  templateUrl: './cgu.component.html',
  styleUrls: ['./cgu.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: []
})
export class CGUComponent extends BaseComponent
{
  constructor() 
  {
    super();
  }
}
