import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { BaseComponent } from '@core/base/BaseComponent';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@core/consts/const';
import { EFeeType } from '../step-honoraires/EFeeType';

interface ServiceWithCategory
{
  label: string;
  category: string;
}

interface GroupedServices
{
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  services: string[];
}

@Component({
  selector: 'app-step-message',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './step-message.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./step-message.component.scss']
})
export class StepMessageComponent extends BaseComponent
{
  @Input() message: string = '';
  @Input() presentation: string = '';
  @Input() feeType: EFeeType = EFeeType.POURCENTAGE;
  @Input() feePercentage: number | undefined;
  @Input() feeFixedAmount: number | undefined;
  @Input() estimatedTimeline: string = '';
  @Input() selectedServicesLabels: string[] = [];
  @Input() selectedServicesWithCategory: ServiceWithCategory[] = [];
  @Input() commissionEstimee: number = 0;

  @Output() messageChange = new EventEmitter<string>();

  public EFeeType = EFeeType;

  onMessageChange(value: string): void
  {
    this.messageChange.emit(value);
  }
  get selectedServicesCount(): number
  {
    return this.selectedServicesWithCategory.length;
  }

  get groupedServices(): GroupedServices[]
  {
    const categoryOrder = ['visuels', 'prises_vue', 'diffusion', 'strategie', 'other'];
    const grouped = new Map<string, string[]>();

    // Grouper les services par catégorie
    for (const service of this.selectedServicesWithCategory)
    {
      const category = service.category || 'other';
      if (!grouped.has(category))
      {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(service.label);
    }

    // Convertir en tableau et trier par ordre de catégorie
    return Array.from(grouped.entries())
      .map(([category, services]) => ({
        category,
        categoryLabel: CATEGORY_LABELS[category] || category,
        categoryIcon: CATEGORY_ICONS[category] || 'category',
        services: services.sort((a, b) => a.localeCompare(b, 'fr'))
      }))
      .sort((a, b) =>
      {
        const orderA = categoryOrder.indexOf(a.category);
        const orderB = categoryOrder.indexOf(b.category);
        return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
      });
  }
}
