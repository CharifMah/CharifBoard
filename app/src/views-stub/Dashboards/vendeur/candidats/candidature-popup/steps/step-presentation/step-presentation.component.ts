import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CATEGORY_ICONS } from '@core/consts/const';
import { ServicesByCategory } from '../../models/candidature.models';
import { ButtonComponent } from '@shared/components/button/button.component';


@Component({
  selector: 'app-step-presentation',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './step-presentation.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./step-presentation.component.scss']
})
export class StepPresentationComponent
{
  @Input() presentation: string = '';
  @Input() estimatedTimeline: string = '';
  @Input() servicesByCategory: ServicesByCategory[] = [];
  @Input() selectedServiceIds: Set<number> = new Set();
  @Input() isLoadingServices: boolean = false;

  @Output() presentationChange = new EventEmitter<string>();
  @Output() estimatedTimelineChange = new EventEmitter<string>();
  @Output() selectedServiceIdsChange = new EventEmitter<Set<number>>();

  expandedCategories: Set<string> = new Set(['visuels', 'diffusion']);

  // === Gestion de la présentation ===
  onPresentationChange(value: string): void
  {
    this.presentationChange.emit(value);
  }

  onTimelineChange(value: string): void
  {
    this.estimatedTimelineChange.emit(value);
  }

  // === Gestion des services ===
  toggleService(serviceId: number): void
  {
    const newSet = new Set(this.selectedServiceIds);
    if (newSet.has(serviceId))
    {
      newSet.delete(serviceId);
    } else
    {
      newSet.add(serviceId);
    }
    this.selectedServiceIdsChange.emit(newSet);
  }

  isServiceSelected(serviceId: number): boolean
  {
    return this.selectedServiceIds.has(serviceId);
  }

  getSelectedServicesCount(): number
  {
    return this.selectedServiceIds.size;
  }

  // === Gestion des catégories ===
  toggleCategory(category: string): void
  {
    if (this.expandedCategories.has(category))
    {
      this.expandedCategories.delete(category);
    } else
    {
      this.expandedCategories.add(category);
    }
  }

  isCategoryExpanded(category: string): boolean
  {
    return this.expandedCategories.has(category);
  }

  toggleAllInCategory(category: string): void
  {
    if (this.isCategoryFullySelected(category))
    {
      this.deselectAllInCategory(category);
    } else
    {
      this.selectAllInCategory(category);
    }
  }

  selectAllInCategory(category: string): void
  {
    const newSet = new Set(this.selectedServiceIds);
    const categoryServices = this.servicesByCategory.find(c => c.category === category);
    if (categoryServices)
    {
      for (const service of categoryServices.services)
      {
        if (service.id) newSet.add(service.id);
      }
    }
    this.selectedServiceIdsChange.emit(newSet);
  }

  deselectAllInCategory(category: string): void
  {
    const newSet = new Set(this.selectedServiceIds);
    const categoryServices = this.servicesByCategory.find(c => c.category === category);
    if (categoryServices)
    {
      for (const service of categoryServices.services)
      {
        if (service.id) newSet.delete(service.id);
      }
    }
    this.selectedServiceIdsChange.emit(newSet);
  }

  isCategoryFullySelected(category: string): boolean
  {
    const categoryServices = this.servicesByCategory.find(c => c.category === category);
    if (!categoryServices) return false;
    return categoryServices.services.every(s => s.id && this.selectedServiceIds.has(s.id));
  }

  getSelectedCountInCategory(category: string): number
  {
    const categoryGroup = this.servicesByCategory.find(c => c.category === category);
    if (!categoryGroup) return 0;
    return categoryGroup.services.filter(s => s.id && this.selectedServiceIds.has(s.id)).length;
  }

  getCategoryIcon(category: string): string
  {
    return CATEGORY_ICONS[category] || 'category';
  }
}
