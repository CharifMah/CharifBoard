import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';

/**
 * Variable SCSS extraite du fichier variables.scss via parsing regex.
 */
interface IScssVariable
{
  /** Nom sans le $ (ex: 'primary-color'). */
  Name: string;
  /** Valeur brute (ex: '#9c27b0' ou '0 4px 15px rgba(0,0,0,0.3)'). */
  Value: string;
  /** Categorie devinee depuis le prefixe du nom (couleur, shadow, gradient, ...). */
  Category: string;
  /** Couleur hex / rgb / hsl resolue pour le fond du swatch (string vide si non applicable). */
  PreviewColor: string;
}

/**
 * Section dediee du playground : toutes les variables de variables.scss sous forme de cards.
 * Liste inlinedeclaree ci-dessous (auto-extracted du fichier source le 12/08/2026).
 */
@Component({
  selector: 'app-playground-palette-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, InputComponent, ButtonComponent],
  templateUrl: './playground-palette-section.component.html',
  styleUrls: ['./playground-palette-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundPaletteSectionComponent extends BaseComponent
{
  /** Snippet copiable du composant palette (illustre la liste inline des variables SCSS). */
  public readonly PaletteCode: string = `// Liste des variables SCSS declaree en dur dans le composant.
// Maintien auto : regenerer cette liste en relisant le fichier source.

// Une entree = { Name: 'primary-color', Value: '#9c27b0', Category: 'couleur', PreviewColor: '#9c27b0' }`;

  /** Liste parsee de toutes les variables SCSS de variables.scss. */
  public readonly Variables = signal<IScssVariable[]>([

    //#region couleur (67)
    { Name: 'primary-color',            Value: '#9c27b0',                       Category: 'couleur',    PreviewColor: '#9c27b0' },
    { Name: 'primary-light',            Value: '#e1bee7',                       Category: 'couleur',    PreviewColor: '#e1bee7' },
    { Name: 'primary-dark',             Value: '#7b1fa2',                       Category: 'couleur',    PreviewColor: '#7b1fa2' },
    { Name: 'accent-color',             Value: '#f06292',                       Category: 'couleur',    PreviewColor: '#f06292' },
    { Name: 'accent-light',             Value: '#f8bbd9',                       Category: 'couleur',    PreviewColor: '#f8bbd9' },
    { Name: 'success-color',            Value: '#4caf50',                       Category: 'couleur',    PreviewColor: '#4caf50' },
    { Name: 'success-light',            Value: '#a5d6a7',                       Category: 'couleur',    PreviewColor: '#a5d6a7' },
    { Name: 'warning-color',            Value: '#ff9800',                       Category: 'couleur',    PreviewColor: '#ff9800' },
    { Name: 'warning-light',            Value: '#ffe0b2',                       Category: 'couleur',    PreviewColor: '#ffe0b2' },
    { Name: 'danger-color',             Value: '#f44336',                       Category: 'couleur',    PreviewColor: '#f44336' },
    { Name: 'danger-light',             Value: '#ffcdd2',                       Category: 'couleur',    PreviewColor: '#ffcdd2' },
    { Name: 'info-color',               Value: '#2196f3',                       Category: 'couleur',    PreviewColor: '#2196f3' },
    { Name: 'info-light',               Value: '#bbdefb',                       Category: 'couleur',    PreviewColor: '#bbdefb' },
    { Name: 'purple-color',             Value: '#7c4dff',                       Category: 'couleur',    PreviewColor: '#7c4dff' },
    { Name: 'purple-light',             Value: '#d1c4e9',                       Category: 'couleur',    PreviewColor: '#d1c4e9' },
    { Name: 'blue-300',                 Value: '#38bdf8',                       Category: 'couleur',    PreviewColor: '#38bdf8' },
    { Name: 'background-color',         Value: 'var(--sm-bg-color)',            Category: 'couleur',    PreviewColor: '' },
    { Name: 'background-gradient',      Value: 'var(--sm-bg-gradient)',         Category: 'couleur',    PreviewColor: '' },
    { Name: 'card-background',          Value: 'var(--sm-card-background)',     Category: 'couleur',    PreviewColor: '' },
    { Name: 'surface-muted',            Value: 'var(--sm-surface-muted)',       Category: 'couleur',    PreviewColor: '' },
    { Name: 'surface-hover',            Value: 'var(--sm-surface-hover)',       Category: 'couleur',    PreviewColor: '' },
    { Name: 'surface-subtle',           Value: 'var(--sm-surface-subtle)',      Category: 'couleur',    PreviewColor: '' },
    { Name: 'border-color',             Value: 'var(--sm-border-color)',        Category: 'couleur',    PreviewColor: '' },
    { Name: 'border-color-strong',      Value: 'var(--sm-border-color-strong)', Category: 'couleur',    PreviewColor: '' },
    { Name: 'text-primary',             Value: 'var(--sm-text-primary)',        Category: 'couleur',    PreviewColor: '' },
    { Name: 'text-secondary',           Value: 'var(--sm-text-secondary)',      Category: 'couleur',    PreviewColor: '' },
    { Name: 'text-tertiary',            Value: 'var(--sm-text-tertiary, #9e9e9e)', Category: 'couleur', PreviewColor: '' },
    { Name: 'text-on-primary',          Value: 'var(--sm-text-on-primary)',     Category: 'couleur',    PreviewColor: '' },
    { Name: 'red-500',                  Value: 'red',                           Category: 'couleur',    PreviewColor: '' },
    { Name: 'pink-50',                  Value: '#fdf2f8',                       Category: 'couleur',    PreviewColor: '#fdf2f8' },
    { Name: 'pink-100',                 Value: '#fce7f3',                       Category: 'couleur',    PreviewColor: '#fce7f3' },
    { Name: 'pink-200',                 Value: '#fbcfe8',                       Category: 'couleur',    PreviewColor: '#fbcfe8' },
    { Name: 'pink-400',                 Value: 'pink',                          Category: 'couleur',    PreviewColor: '' },
    { Name: 'pink-500',                 Value: '#ec4899',                       Category: 'couleur',    PreviewColor: '#ec4899' },
    { Name: 'pink-600',                 Value: '#db2777',                       Category: 'couleur',    PreviewColor: '#db2777' },
    { Name: 'pink-700',                 Value: '#f472b6',                       Category: 'couleur',    PreviewColor: '#f472b6' },
    { Name: 'purple-100',               Value: '#d8afff',                       Category: 'couleur',    PreviewColor: '#d8afff' },
    { Name: 'purple-300',               Value: '#a78bfa',                       Category: 'couleur',    PreviewColor: '#a78bfa' },
    { Name: 'purple-400',               Value: '#a855f7',                       Category: 'couleur',    PreviewColor: '#a855f7' },
    { Name: 'purple-600',               Value: '#9333ea',                       Category: 'couleur',    PreviewColor: '#9333ea' },
    { Name: 'purple-700',               Value: '#7e22ce',                       Category: 'couleur',    PreviewColor: '#7e22ce' },
    { Name: 'purple-800',               Value: '#6b21a8',                       Category: 'couleur',    PreviewColor: '#6b21a8' },
    { Name: 'purple-900',               Value: '#581c87',                       Category: 'couleur',    PreviewColor: '#581c87' },
    { Name: 'gray-50',                  Value: '#f9fafb',                       Category: 'couleur',    PreviewColor: '#f9fafb' },
    { Name: 'gray-100',                 Value: '#f3f4f6',                       Category: 'couleur',    PreviewColor: '#f3f4f6' },
    { Name: 'gray-200',                 Value: '#e5e7eb',                       Category: 'couleur',    PreviewColor: '#e5e7eb' },
    { Name: 'gray-300',                 Value: '#9ca3af',                       Category: 'couleur',    PreviewColor: '#9ca3af' },
    { Name: 'gray-400',                 Value: '#6b7280',                       Category: 'couleur',    PreviewColor: '#6b7280' },
    { Name: 'gray-500',                 Value: '#6b7280',                       Category: 'couleur',    PreviewColor: '#6b7280' },
    { Name: 'gray-600',                 Value: '#4b5563',                       Category: 'couleur',    PreviewColor: '#4b5563' },
    { Name: 'gray-700',                 Value: '#374151',                       Category: 'couleur',    PreviewColor: '#374151' },
    { Name: 'gray-800',                 Value: '#1f2937',                       Category: 'couleur',    PreviewColor: '#1f2937' },
    { Name: 'gray-900',                 Value: '#111827',                       Category: 'couleur',    PreviewColor: '#111827' },
    { Name: 'green-500',                Value: '#22c55e',                       Category: 'couleur',    PreviewColor: '#22c55e' },
    { Name: 'bg-primary',               Value: '$background-color',             Category: 'couleur',    PreviewColor: '' },
    { Name: 'bg-secondary',             Value: '$surface-muted',                Category: 'couleur',    PreviewColor: '' },
    { Name: 'bg-tertiary',              Value: '$surface-subtle',               Category: 'couleur',    PreviewColor: '' },
    { Name: 'cookie-consent-background',Value: 'var(--sm-cookie-background)',   Category: 'couleur',    PreviewColor: '' },
    { Name: 'filter-violet-300',        Value: '#9156ff',                       Category: 'couleur',    PreviewColor: '#9156ff' },
    { Name: 'filter-violet-500',        Value: '#7e2dff',                       Category: 'couleur',    PreviewColor: '#7e2dff' },
    { Name: 'filter-violet-700',        Value: '#5f329f',                       Category: 'couleur',    PreviewColor: '#5f329f' },
    { Name: 'filter-violet-800',        Value: '#6b5a8f',                       Category: 'couleur',    PreviewColor: '#6b5a8f' },
    { Name: 'filter-violet-focus',      Value: '#8a43ff',                       Category: 'couleur',    PreviewColor: '#8a43ff' },
    { Name: 'filter-pink-400',          Value: '#ff5aaa',                       Category: 'couleur',    PreviewColor: '#ff5aaa' },
    { Name: 'filter-pink-500',          Value: '#ff4da0',                       Category: 'couleur',    PreviewColor: '#ff4da0' },
    { Name: 'filter-white',             Value: '#ffffff',                       Category: 'couleur',    PreviewColor: '#ffffff' },
    { Name: 'filter-soft-text',         Value: '#6d49b4',                       Category: 'couleur',    PreviewColor: '#6d49b4' },
    //#endregion

    //#region shadow (10)
    { Name: 'shadow',                   Value: 'var(--sm-shadow)',                                  Category: 'shadow', PreviewColor: '' },
    { Name: 'btn-shadow',               Value: '0 4px 15px rgba(156, 39, 176, 0.25)',               Category: 'shadow', PreviewColor: '' },
    { Name: 'btn-hover-shadow',         Value: '0 6px 20px rgba(156, 39, 176, 0.35)',               Category: 'shadow', PreviewColor: '' },
    { Name: 'shadow-light',             Value: '0 2px 10px rgba(0, 0, 0, 0.1)',                     Category: 'shadow', PreviewColor: '' },
    { Name: 'shadow-medium',            Value: '0 8px 30px rgba(0, 0, 0, 0.15)',                    Category: 'shadow', PreviewColor: '' },
    { Name: 'shadow-heavy',             Value: '0 20px 60px rgba(0, 0, 0, 0.2)',                    Category: 'shadow', PreviewColor: '' },
    { Name: 'cookie-consent-shadow',    Value: 'var(--sm-cookie-shadow)',                           Category: 'shadow', PreviewColor: '' },
    { Name: 'filter-shadow-panel',      Value: '0 10px 24px rgba(54, 24, 102, 0.1)',                Category: 'shadow', PreviewColor: '' },
    { Name: 'filter-shadow-spark',      Value: '0 6px 16px rgba(126, 45, 255, 0.3)',                Category: 'shadow', PreviewColor: '' },
    { Name: 'filter-shadow-main-btn',   Value: '0 8px 18px rgba(126, 45, 255, 0.28)',               Category: 'shadow', PreviewColor: '' },
    //#endregion

    //#region radius (10)
    { Name: 'border-radius',            Value: '16px',                                              Category: 'radius', PreviewColor: '' },
    { Name: 'btn-border-radius',        Value: '12px',                                              Category: 'radius', PreviewColor: '' },
    { Name: 'border-radius-sm',         Value: '8px',                                               Category: 'radius', PreviewColor: '' },
    { Name: 'border-radius-md',         Value: '12px',                                              Category: 'radius', PreviewColor: '' },
    { Name: 'border-radius-lg',         Value: '16px',                                              Category: 'radius', PreviewColor: '' },
    { Name: 'border-radius-xl',         Value: '24px',                                              Category: 'radius', PreviewColor: '' },
    { Name: 'radius-sm',                Value: '$border-radius-sm',                                 Category: 'radius', PreviewColor: '' },
    { Name: 'radius-md',                Value: '$border-radius-md',                                 Category: 'radius', PreviewColor: '' },
    { Name: 'radius-lg',                Value: '$border-radius-lg',                                 Category: 'radius', PreviewColor: '' },
    { Name: 'radius-xl',                Value: '$border-radius-xl',                                 Category: 'radius', PreviewColor: '' },
    //#endregion

    //#region transition (3)
    { Name: 'transition-fast',          Value: '0.2s ease',                                         Category: 'transition', PreviewColor: '' },
    { Name: 'transition-normal',        Value: '0.3s ease',                                         Category: 'transition', PreviewColor: '' },
    { Name: 'transition-slow',          Value: '0.4s ease',                                         Category: 'transition', PreviewColor: '' },
    //#endregion

    //#region spacing (6) + letter-spacing (5)
    { Name: 'spacing-xs',               Value: '4px',                                               Category: 'spacing', PreviewColor: '' },
    { Name: 'spacing-sm',               Value: '8px',                                               Category: 'spacing', PreviewColor: '' },
    { Name: 'spacing-md',               Value: '16px',                                              Category: 'spacing', PreviewColor: '' },
    { Name: 'spacing-lg',               Value: '24px',                                              Category: 'spacing', PreviewColor: '' },
    { Name: 'spacing-xl',               Value: '32px',                                              Category: 'spacing', PreviewColor: '' },
    { Name: 'spacing-2xl',              Value: '48px',                                              Category: 'spacing', PreviewColor: '' },
    { Name: 'letter-spacing-tighter',   Value: '-0.02em',                                           Category: 'spacing', PreviewColor: '' },
    { Name: 'letter-spacing-tight',     Value: '-0.01em',                                           Category: 'spacing', PreviewColor: '' },
    { Name: 'letter-spacing-normal',    Value: '0',                                                 Category: 'spacing', PreviewColor: '' },
    { Name: 'letter-spacing-wide',      Value: '0.025em',                                           Category: 'spacing', PreviewColor: '' },
    { Name: 'letter-spacing-wider',     Value: '0.05em',                                            Category: 'spacing', PreviewColor: '' },
    //#endregion

    //#region typography (17)
    { Name: 'font-family-base',         Value: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", Category: 'typography', PreviewColor: '' },
    { Name: 'font-size-xs',             Value: '0.75rem',                                           Category: 'typography', PreviewColor: '' },
    { Name: 'font-size-sm',             Value: '0.8125rem',                                         Category: 'typography', PreviewColor: '' },
    { Name: 'font-size-md',             Value: '0.875rem',                                          Category: 'typography', PreviewColor: '' },
    { Name: 'font-size-lg',             Value: '1rem',                                              Category: 'typography', PreviewColor: '' },
    { Name: 'font-size-xl',             Value: '1.25rem',                                           Category: 'typography', PreviewColor: '' },
    { Name: 'font-size-2xl',            Value: '1.5rem',                                            Category: 'typography', PreviewColor: '' },
    { Name: 'font-weight-normal',       Value: '400',                                               Category: 'typography', PreviewColor: '' },
    { Name: 'font-weight-medium',       Value: '500',                                               Category: 'typography', PreviewColor: '' },
    { Name: 'font-weight-semibold',     Value: '600',                                               Category: 'typography', PreviewColor: '' },
    { Name: 'font-weight-bold',         Value: '700',                                               Category: 'typography', PreviewColor: '' },
    { Name: 'line-height-tight',        Value: '1.2',                                               Category: 'typography', PreviewColor: '' },
    { Name: 'line-height-snug',         Value: '1.35',                                              Category: 'typography', PreviewColor: '' },
    { Name: 'line-height-normal',       Value: '1.5',                                               Category: 'typography', PreviewColor: '' },
    { Name: 'line-height-relaxed',      Value: '1.625',                                             Category: 'typography', PreviewColor: '' },
    { Name: 'font-size-title',          Value: '0.92rem',                                           Category: 'typography', PreviewColor: '' },
    { Name: 'font-size-subtitle',       Value: '$font-size-xs',                                     Category: 'typography', PreviewColor: '' },
    //#endregion

    //#region z-index (3)
    { Name: 'z-index-popup',            Value: '10000',                                             Category: 'z-index', PreviewColor: '' },
    { Name: 'z-index-busy',             Value: '10001',                                             Category: 'z-index', PreviewColor: '' },
    { Name: 'z-index-cookie-consent',   Value: '1100',                                              Category: 'z-index', PreviewColor: '' },
    //#endregion

    //#region bouton (12)
    { Name: 'btn-light-bg',             Value: 'var(--sm-btn-light-bg)',                            Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-light-border',         Value: 'var(--sm-btn-light-border)',                        Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-light-color',          Value: 'var(--sm-btn-light-color)',                         Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-light-hover-bg',       Value: 'var(--sm-btn-light-hover-bg)',                      Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-dark-bg',              Value: 'var(--sm-btn-dark-bg)',                             Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-dark-color',           Value: 'var(--sm-btn-dark-color)',                          Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-ghost-bg',             Value: 'var(--sm-btn-ghost-bg)',                            Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-ghost-border',         Value: 'var(--sm-btn-ghost-border)',                        Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-ghost-hover-border',   Value: 'var(--sm-btn-ghost-hover-border)',                  Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-ghost-icon-color',     Value: 'var(--sm-btn-ghost-icon-color)',                    Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-ghost-hover-bg',       Value: 'var(--sm-btn-ghost-hover-bg)',                      Category: 'bouton', PreviewColor: '' },
    { Name: 'btn-disabled-opacity',     Value: 'var(--sm-btn-disabled-opacity)',                    Category: 'bouton', PreviewColor: '' },
    //#endregion

    //#region layout (3)
    { Name: 'sidebar-width',            Value: '280px',                                             Category: 'layout', PreviewColor: '' },
    { Name: 'sidebar-width-tablet',     Value: '240px',                                             Category: 'layout', PreviewColor: '' },
    { Name: 'navbar-height',            Value: '72px',                                              Category: 'layout', PreviewColor: '' },
    //#endregion

    //#region breakpoint (6)
    { Name: 'xs-breakpoint',            Value: '375px',                                             Category: 'breakpoint', PreviewColor: '' },
    { Name: 'small-breakpoint',         Value: '480px',                                             Category: 'breakpoint', PreviewColor: '' },
    { Name: 'mobile-breakpoint',        Value: '768px',                                             Category: 'breakpoint', PreviewColor: '' },
    { Name: 'desktop-breakpoint',       Value: '1024px',                                            Category: 'breakpoint', PreviewColor: '' },
    { Name: 'tablet-breakpoint',        Value: '1200px',                                            Category: 'breakpoint', PreviewColor: '' },
    { Name: 'wide-breakpoint',          Value: '1360px',                                            Category: 'breakpoint', PreviewColor: '' },
    //#endregion

    //#region gradient (22)
    { Name: 'gradient-default-stop-1',  Value: '#a78bfa',                                           Category: 'gradient', PreviewColor: '#a78bfa' },
    { Name: 'gradient-default-stop-2',  Value: '#f472b6',                                           Category: 'gradient', PreviewColor: '#f472b6' },
    { Name: 'gradient-default-stop-3',  Value: '#38bdf8',                                           Category: 'gradient', PreviewColor: '#38bdf8' },
    { Name: 'gradient-default',         Value: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #38bdf8 100%)', Category: 'gradient', PreviewColor: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #38bdf8 100%)' },
    { Name: 'gradient-sunset-stop-1',   Value: '#fb923c',                                           Category: 'gradient', PreviewColor: '#fb923c' },
    { Name: 'gradient-sunset-stop-2',   Value: '#f43f5e',                                           Category: 'gradient', PreviewColor: '#f43f5e' },
    { Name: 'gradient-sunset-stop-3',   Value: '#d946ef',                                           Category: 'gradient', PreviewColor: '#d946ef' },
    { Name: 'gradient-sunset',          Value: 'linear-gradient(135deg, #fb923c 0%, #f43f5e 50%, #d946ef 100%)', Category: 'gradient', PreviewColor: 'linear-gradient(135deg, #fb923c 0%, #f43f5e 50%, #d946ef 100%)' },
    { Name: 'gradient-ocean-stop-1',    Value: '#22d3ee',                                           Category: 'gradient', PreviewColor: '#22d3ee' },
    { Name: 'gradient-ocean-stop-2',    Value: '#3b82f6',                                           Category: 'gradient', PreviewColor: '#3b82f6' },
    { Name: 'gradient-ocean-stop-3',    Value: '#6366f1',                                           Category: 'gradient', PreviewColor: '#6366f1' },
    { Name: 'gradient-ocean',           Value: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #6366f1 100%)', Category: 'gradient', PreviewColor: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #6366f1 100%)' },
    { Name: 'gradient-neon-stop-1',     Value: '#84cc16',                                           Category: 'gradient', PreviewColor: '#84cc16' },
    { Name: 'gradient-neon-stop-2',     Value: '#06b6d4',                                           Category: 'gradient', PreviewColor: '#06b6d4' },
    { Name: 'gradient-neon-stop-3',     Value: '#8b5cf6',                                           Category: 'gradient', PreviewColor: '#8b5cf6' },
    { Name: 'gradient-neon',            Value: 'linear-gradient(135deg, #84cc16 0%, #06b6d4 50%, #8b5cf6 100%)', Category: 'gradient', PreviewColor: 'linear-gradient(135deg, #84cc16 0%, #06b6d4 50%, #8b5cf6 100%)' },
    { Name: 'gradient-aurora-stop-1',   Value: '#34d399',                                           Category: 'gradient', PreviewColor: '#34d399' },
    { Name: 'gradient-aurora-stop-2',   Value: '#60a5fa',                                           Category: 'gradient', PreviewColor: '#60a5fa' },
    { Name: 'gradient-aurora-stop-3',   Value: '#c084fc',                                           Category: 'gradient', PreviewColor: '#c084fc' },
    { Name: 'gradient-aurora-stop-4',   Value: '#f0abfc',                                           Category: 'gradient', PreviewColor: '#f0abfc' },
    { Name: 'gradient-aurora',          Value: 'linear-gradient(135deg, #34d399 33%, #60a5fa 66%, #c084fc 100%, #f0abfc 100%)', Category: 'gradient', PreviewColor: 'linear-gradient(135deg, #34d399 33%, #60a5fa 66%, #c084fc 100%, #f0abfc 100%)' },
    { Name: 'gradient-shift-duration',  Value: '6s',                                                Category: 'gradient', PreviewColor: '' },
    //#endregion

    //#region autre (couleurs orphelines + tokens cookie/busy)
    { Name: 'error-color',              Value: '#f44336',                       Category: 'couleur',    PreviewColor: '#f44336' },
    { Name: 'error-light',              Value: '#ffcdd2',                       Category: 'couleur',    PreviewColor: '#ffcdd2' },
    { Name: 'white',                    Value: '#ffffff',                       Category: 'couleur',    PreviewColor: '#ffffff' },
    { Name: 'cookie-consent-border',    Value: 'var(--sm-cookie-border)',       Category: 'autre',     PreviewColor: '' },
    { Name: 'cookie-consent-title',     Value: 'var(--sm-cookie-title)',        Category: 'autre',     PreviewColor: '' },
    { Name: 'cookie-consent-text',      Value: 'var(--sm-cookie-text)',         Category: 'autre',     PreviewColor: '' },
    { Name: 'cookie-consent-width',     Value: '920px',                         Category: 'autre',     PreviewColor: '' },
    { Name: 'busy-backdrop',            Value: 'var(--sm-busy-backdrop)',       Category: 'autre',     PreviewColor: '' },
    { Name: 'spinner-track',            Value: 'var(--sm-spinner-track)',       Category: 'autre',     PreviewColor: '' }
    //#endregion
  ]);

  /** Liste filtree selon la categorie (couleur, shadow, gradient, spacing, ...). */
  public readonly VariablesFilter = signal<string>('all');
  /** Recherche texte libre sur le nom. */
  public readonly VariablesSearch = signal<string>('');
  /** Liste filtree finale pour le rendu. */
  public readonly VariablesFiltered = computed<IScssVariable[]>(() =>
  {
    const lFilter = this.VariablesFilter();
    const lSearch = this.VariablesSearch().trim().toLowerCase();
    return this.Variables().filter((pV) =>
      (lFilter === 'all' || pV.Category === lFilter)
      && (!lSearch || pV.Name.toLowerCase().includes(lSearch))
    );
  });
  /** Liste unique des categories detectees pour les chips de filtre. */
  public readonly Categories = computed<string[]>(() =>
  {
    const lSet = new Set<string>();
    for (const lV of this.Variables()) lSet.add(lV.Category);
    return Array.from(lSet).sort();
  });
  /** Statut du chargement (liste inline -> toujours ok). */
  public readonly LoadStatus = signal<'idle' | 'loading' | 'ok' | 'error'>('ok');
  public readonly LoadError = signal<string>('');

  /**
   * Couleur de texte a appliquer sur le swatch selon la luminance de la couleur de fond.
   * Permet d'avoir un contraste lisible sur les couleurs claires comme pink-50, gray-50, etc.
   */
  public TextColor(pBg: string): string
  {
    if (!pBg) return 'var(--sm-text-primary)';
    const lRgb = this._ParseRgb(pBg);
    if (!lRgb) return '#fff';
    // - cm - Luminance relative W3C, seuil 0.6 = couleurs sombres -> texte blanc, claires -> noir.
    const lLuma = (0.299 * lRgb.r + 0.587 * lRgb.g + 0.114 * lRgb.b) / 255;
    return lLuma > 0.6 ? '#111' : '#fff';
  }

  /**
   * Convertit hex / rgb() / rgba() en triplet {r,g,b}. Renvoie null si non parsable.
   */
  private _ParseRgb(pValue: string): { r: number; g: number; b: number } | null
  {
    const lHex = /^#([0-9a-f]{6})$/i.exec(pValue);
    if (lHex)
    {
      const lN = parseInt(lHex[1], 16);
      return { r: (lN >> 16) & 0xff, g: (lN >> 8) & 0xff, b: lN & 0xff };
    }
    const lRgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(pValue);
    if (lRgba)
    {
      return { r: +lRgba[1], g: +lRgba[2], b: +lRgba[3] };
    }
    return null;
  }

  /**
   * Copie la ligne SCSS complete ($nom: valeur;) dans le presse-papier.
   */
  public async CopyToClipboard(pVar: IScssVariable): Promise<void>
  {
    try
    {
      await navigator.clipboard.writeText(`$${pVar.Name}: ${pVar.Value};`);
    }
    catch
    {
      // Ignorer silencieusement
    }
  }

  /**
   * Retourne l'entree IScssVariable correspondant au gradient demande.
   * Utilise par les bandes d'apercu plein ecran (clic = copie la ligne SCSS).
   */
  public GradientVar(pName: string): IScssVariable
  {
    const lKey = `gradient-${pName}`;
    const lFound = this.Variables().find((pV) => pV.Name === lKey);
    return lFound ?? { Name: lKey, Value: '', Category: 'gradient', PreviewColor: '' };
  }

  public SetFilter(pValue: string): void
  {
    this.VariablesFilter.set(pValue);
  }
  public SetSearch(pValue: string): void
  {
    this.VariablesSearch.set(pValue);
  }
  /**
   * Compte le nombre de variables dans une categorie donnee.
   */
  public CountByCategory(pCategory: string): number
  {
    return this.Variables().filter((pV) => pV.Category === pCategory).length;
  }
}