// aide-immo-api-popup.component.ts
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

import { BaseComponent } from '@core/base/BaseComponent';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ImageComponent } from "@shared/components/image/image.component";

@Component({
  selector: 'app-aide-immo-api-popup',
  standalone: true,
  imports: [PopupComponent, ImageComponent],
  templateUrl: './aide-immo-api-popup.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./aide-immo-api-popup.component.scss']
})
export class AideImmoApiPopupComponent extends BaseComponent {

  @Input() isOpen = false;

  @Output() isOpenChange = new EventEmitter<boolean>();

  constructor() {
    super();
  }
}