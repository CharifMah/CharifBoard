import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { StepperComponent, IStepItem } from '@shared/components/Stepper/stepper.component';
import { SplitterComponent, SplitterPanelDirective } from '@shared/components/Splitter/splitter.component';
import { ButtonComponent } from '@shared/components/button/button.component';

/**
 * Section dediee du playground : Stepper (wizard) et Splitter (layout redimensionnable).
 */
@Component({
  selector: 'app-playground-stepper-splitter-section',
  standalone: true,
  imports: [
    PlaygroundSectionComponent,
    StepperComponent,
    SplitterComponent,
    SplitterPanelDirective,
    ButtonComponent
  ],
  templateUrl: './playground-stepper-splitter-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundStepperSplitterSectionComponent extends BaseComponent
{
  /** Snippet copiable Stepper. */
  public readonly StepperCode: string = `<app-stepper [Steps]="steps" [CurrentStep]="currentStep"
  (StepClick)="onStepClick($event)" />`;

  /** Snippet copiable Splitter. */
  public readonly SplitterCode: string = `<app-splitter Direction="horizontal" [GutterSize]="8">
  <app-splitter-panel panel1>
    <p>Panneau gauche</p>
  </app-splitter-panel>
  <app-splitter-panel panel2>
    <p>Panneau droit</p>
  </app-splitter-panel>
</app-splitter>`;

  /** Etape active du Stepper demo (1-based, conforme a IStepItem.Id). */
  public StepperActiveStep: number = 1;

  /** Etapes du Stepper demo. */
  public readonly StepperSteps: IStepItem[] = [
    { Id: 1, Label: 'Informations', Condition: true },
    { Id: 2, Label: 'Adresse', Condition: true },
    { Id: 3, Label: 'Criteres', Condition: false },
    { Id: 4, Label: 'Validation', Condition: false }
  ];

  /**
   * Passe a l'etape suivante du Stepper demo si elle existe.
   */
  public OnStepperNext(): void
  {
    if (this.StepperActiveStep < this.StepperSteps.length)
    {
      this.StepperActiveStep++;
    }
  }

  /**
   * Revient a l'etape precedente du Stepper demo si elle existe.
   */
  public OnStepperPrev(): void
  {
    if (this.StepperActiveStep > 1)
    {
      this.StepperActiveStep--;
    }
  }

  /**
   * Gere le clic sur une etape du Stepper demo.
   * @param pStepId Identifiant de l'etape cliquee (1-based).
   */
  public OnStepperChange(pStepId: number): void
  {
    const lStep: IStepItem | undefined = this.StepperSteps.find((pS: IStepItem): boolean => pS.Id === pStepId);
    if (lStep?.Condition)
    {
      this.StepperActiveStep = pStepId;
      this.PostHog.Capture(this.BuildTrackingName('playground_stepper_change', 'tracking'), { step: pStepId });
    }
  }
}