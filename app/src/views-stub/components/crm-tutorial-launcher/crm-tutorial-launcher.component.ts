import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { BaseComponent } from '@core/base/BaseComponent';
import { TutorialService } from '@core/services/tutorial/tutorial.service';
import { CRM_TUTORIAL_DONE_KEY, DEFAULT_CRM_TUTORIAL_STEPS } from '@core/services/tutorial/tutorial.flows';
import { ITutorialStep } from '@core/services/tutorial/tutorial.types';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';

/**
 * FAB (Floating Action Button) "?" displayed at the bottom-right of a view.
 * Visible only when the tutorial is NOT running.
 * On click: starts the configured tutorial flow.
 *
 * Reusable across CRM, Pro dashboard, Vendeur dashboard, etc. via inputs:
 * - `Steps` : the tutorial steps (default = CRM steps for backward compat).
 * - `DoneStorageKey` : localStorage key to mark the flow as done.
 * - `Title` : title shown in PostHog events.
 * - `Icon` : Material icon name.
 * - `TrackingEvent` : PostHog event name on click.
 *
 * PostHog tracking on click.
 */
@Component({
  selector: 'app-crm-tutorial-launcher',
  imports: [TooltipComponent],
  templateUrl: './crm-tutorial-launcher.component.html',
  styleUrl: './crm-tutorial-launcher.component.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class CrmTutorialLauncherComponent extends BaseComponent {
  //#region Attributes
  /** Tutorial service (singleton). */
  public readonly Tutorial: TutorialService = inject(TutorialService);
  //#endregion

  //#region Inputs
  /**
   * Steps of the tutorial flow. Defaults to the CRM flow for backward compatibility.
   */
  public readonly Steps = input<ITutorialStep[]>(DEFAULT_CRM_TUTORIAL_STEPS);

  /**
   * localStorage key used to mark the flow as done.
   */
  public readonly DoneStorageKey = input<string>(CRM_TUTORIAL_DONE_KEY);

  /**
   * Title of the tutorial (used in PostHog events).
   */
  public readonly Title = input<string>('Tutoriel CRM');

  /**
   * Material icon name (used in PostHog events).
   */
  public readonly Icon = input<string>('school');

  /**
   * PostHog event name captured on launcher click.
   */
  public readonly TrackingEvent = input<string>('tutorial_launcher_clicked');
  /**
   * Current view name in the host layout. When provided, the tutorial starts at the
   * first step whose `NavigateTo` matches this view (so the user sees the step
   * corresponding to the page they are on).
   */
  public readonly CurrentView = input<string>('');
  //#endregion

  //#region Methods
  /**
   * Starts the configured tutorial flow and tracks the PostHog event.
   */
  public OnLaunch(): void {
    // - cm - Explicit tracking of the FAB click (in addition to the button auto-tracking)
    this.PostHog.Capture(this.TrackingEvent());
    this.Tutorial.Start({
      Steps: this.Steps(),
      DoneStorageKey: this.DoneStorageKey(),
      Title: this.Title(),
      Icon: this.Icon(),
      CurrentView: this.CurrentView() || undefined
    });
  }
  //#endregion
}
