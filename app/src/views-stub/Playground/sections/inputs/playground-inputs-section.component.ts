import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormControl, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { InputComponent } from '@shared/components/input/input.component';
import { AdressesDTO } from '@core/sellmatchdb/dto';

/**
 * Section du playground demontrant le composant Input (tous types, validation, options, autocomplete).
 */
@Component({
  selector: 'app-playground-inputs-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, InputComponent, ReactiveFormsModule],
  templateUrl: './playground-inputs-section.component.html',
  styleUrl: './playground-inputs-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundInputsSectionComponent extends BaseComponent
{
  //#region Attributes
  /** Texte de l'input texte demo. */
  public readonly DemoText = signal('');

  /** Email de l'input email demo. */
  public readonly DemoEmail = signal('');

  /** Active l'etat disabled sur les inputs de demo. */
  public readonly IsDisabled = signal(false);
  /** Active l'etat readonly sur les inputs de demo. */
  public readonly IsReadonly = signal(false);
  /** Simule une erreur de validation sur l'input email demo. */
  public readonly SimulateError = signal(false);

  /** Adresse selectionnee via l'autocomplete playground (FormControl). */
  public readonly PlaygroundAddress = new FormControl<AdressesDTO | string | null>(null);
  /** Adresse selectionnee par l'autocomplete playground, exposee pour l'affichage en JSON. */
  public readonly SelectedAddressJson = signal<string>('null');

  // - cm - Signals pour les demos d'erreurs (un par validateur illustrable)
  /** Demo erreur required : champ vide. */
  public readonly ErrorRequired = signal('');
  /** Demo erreur email : format invalide. */
  public readonly ErrorEmail = signal('pas-un-email');
  /** Demo erreur minLength : 1 caractere (requis : 3). */
  public readonly ErrorMinLength = signal('a');
  /** Demo erreur maxLength : 6 caracteres (limite : 5). */
  public readonly ErrorMaxLength = signal('abcdef');
  /** Demo erreur min (number) : 5 (requis : 10). */
  public readonly ErrorMin = signal<number | null>(5);
  /** Demo erreur max (number) : 500 (limite : 100). */
  public readonly ErrorMax = signal<number | null>(500);
  /** Demo erreur pattern (tel) : format invalide (caracteres non autorises). */
  public readonly ErrorPattern = signal('abc');
  /** Demo erreur custom (validateur NoDigitsValidator). */
  public readonly ErrorCustom = signal('Hello123');
  /** Demo erreur maxLength (textarea). */
  public readonly ErrorTextarea = signal('Saisir 10 caracteres max');
  /** Demo hint vs erreur : saisie intermediaire. */
  public readonly ErrorHint = signal('ab');
  /** Demo combinaison email + required + maxLength. */
  public readonly ErrorCombo = signal('a');
  //#endregion

  //#region Constants
  /** Options du select demo (typees pour InputComponent). */
  public readonly RoleOptions: { Label: string; Value: string | number | boolean }[] = [
    { Label: 'Administrateur', Value: 'admin' },
    { Label: 'Utilisateur', Value: 'user' },
    { Label: 'Manager', Value: 'manager' }
  ];

  /** Valeur selectionnee pour la demo select dynamique (size sm/md/lg + output live). */
  public readonly SelectValue = signal<string | number | boolean>('user');

  /** Options de la demo select dynamique. */
  public readonly SelectOptions: { Label: string; Value: string | number | boolean }[] = [
    { Label: 'Admin', Value: 'admin' },
    { Label: 'User', Value: 'user' },
    { Label: 'Manager', Value: 'manager' },
    { Label: 'Invite', Value: 'guest' }
  ];

  /**
   * Validateur custom de demo : interdit les chiffres.
   * Utilise pour illustrer l'input [customValidators].
   * @param pCtrl Le controle Angular a valider.
   * @returns L'erreur { noDigits: true } si la valeur contient un chiffre, sinon null.
   */
  public readonly NoDigitsValidator: ValidatorFn = (pCtrl: AbstractControl): ValidationErrors | null => {
    const lValue: string = String(pCtrl.value ?? '');
    return /\d/.test(lValue) ? { noDigits: true } : null;
  };

  /** Snippet copiable de l'input. */
  public readonly InputCode: string = `<app-input type="email" label="Email" [required]="true"
  [value]="email()" (valueChange)="email.set($event)" />

<app-input type="select" label="Role"
  [options]="[{Label:'Admin',Value:'admin'}]" placeholder="Selectionner" />

<app-input type="checkbox" label="Actif" [indeterminate]="false" />

<app-input type="textarea" label="Description" [maxLength]="500" [showCharCount]="true" />

<app-input type="text" [isAddressAutocomplete]="true" label="Adresse" />

<!-- Validation standalone (sans FormControl) : immediateValidation pour afficher les erreurs des la saisie -->
<app-input type="email" label="Email" [required]="true" [immediateValidation]="true"
  [value]="email()" (valueChange)="email.set($event)" />`;
  //#endregion

  //#region Methods
  /**
   * Active ou desactive l'etat disabled sur les inputs de demo.
   * @param pValue Nouvelle valeur de la checkbox.
   */
  public ToggleDisabled(pValue?: boolean): void
  {
    if (typeof pValue === 'boolean')
    {
      this.IsDisabled.set(pValue);
      return;
    }
    this.IsDisabled.update((pCurrent: boolean): boolean => !pCurrent);
  }

  /**
   * Active ou desactive l'etat readonly sur les inputs de demo.
   * @param pValue Nouvelle valeur de la checkbox.
   */
  public ToggleReadonly(pValue?: boolean): void
  {
    if (typeof pValue === 'boolean')
    {
      this.IsReadonly.set(pValue);
      return;
    }
    this.IsReadonly.update((pCurrent: boolean): boolean => !pCurrent);
  }

  /**
   * Active ou desactive la simulation d'erreur sur l'input email.
   * @param pValue Nouvelle valeur de la checkbox.
   */
  public ToggleSimulateError(pValue?: boolean): void
  {
    if (typeof pValue === 'boolean')
    {
      this.SimulateError.set(pValue);
    }
    else
    {
      this.SimulateError.update((pCurrent: boolean): boolean => !pCurrent);
    }
    if (this.SimulateError())
    {
      this.DemoEmail.set('');
    }
  }

  /**
   * Synchronise l'adresse selectionnee par l'autocomplete playground pour l'apercu JSON.
   * - cm - Demontre l'integration complete : le composant emet un objet AdressesDTO complet
   * (coords + postcode + city + type + relevance) utilisable directement par un parent.
   * @param pValue La valeur emise par le composant app-input (AdressesDTO ou string en cours de saisie).
   */
  public OnPlaygroundAddressChange(pValue: AdressesDTO | string | null): void
  {
    this.SelectedAddressJson.set(pValue ? JSON.stringify(pValue, null, 2) : 'null');
  }

  /**
   * Gere le changement de valeur du select dynamique (demo taille sm/md/lg).
   * @param pValue La nouvelle valeur selectionnee.
   */
  public OnSelectChange(pValue: string | number | boolean): void
  {
    this.SelectValue.set(pValue);
  }
  //#endregion
}