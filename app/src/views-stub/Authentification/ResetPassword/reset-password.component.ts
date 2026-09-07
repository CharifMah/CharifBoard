// reset-password.component.ts
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { UsersService } from '@core/sellmatchdb/services';
import { BaseComponent } from '@base/BaseComponent';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';


@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InputComponent, ButtonComponent],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent extends BaseComponent implements OnInit
{
  public resetForm: FormGroup;
  public isLoading = false;
  public errorMessage = '';
  public successMessage = '';
  public resetComplete = false;
  public token: string | null = null;
  public email: string | null = null;

  constructor (
    private readonly _fb: FormBuilder,
    private readonly _userService: UsersService,
    private readonly _route: ActivatedRoute
  )
  {
    super();
    this.resetForm = this._fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.validatePasswordStrength
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void
  {
    // Récupérer les paramètres token et email de l'URL
    this._route.queryParams.subscribe(params =>
    {
      this.token = params['token'];
      this.email = params['email'];

      if (!this.token || !this.email)
      {
        this.errorMessage = 'Lien de réinitialisation invalide. Veuillez demander un nouveau lien.';
      }
    });
  }

  // Validation pour le mot de passe
  validatePasswordStrength(control: AbstractControl): ValidationErrors | null
  {
    const value = control.value || '';
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const valid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial;

    if (!valid)
    {
      return { weakPassword: true };
    }

    return null;
  }

  // Validation pour confirmer que les mots de passe correspondent
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null
  {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // Calcul de la force du mot de passe
  getPasswordStrength(): { strength: string, percentage: number }
  {
    const password = this.resetForm.get('password')?.value || '';

    if (!password)
    {
      return { strength: '', percentage: 0 };
    }

    let score = 0;

    // Longueur
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexité
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    // Evaluation
    if (score <= 2) return { strength: 'weak', percentage: 33 };
    if (score <= 4) return { strength: 'medium', percentage: 66 };
    return { strength: 'strong', percentage: 100 };
  }

  public async onSubmit(): Promise<void>
  {
    if (this.resetForm.invalid)
    {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try
    {
      if (!this.token || !this.email)
      {
        throw new Error('Informations de réinitialisation manquantes');
      }
      // Appel au service pour réinitialiser le mot de passe
      await this._userService.resetPassword(this.token,this.email,this.resetForm.value.password);

      // Afficher le message de succès
      this.resetComplete = true;
      this.successMessage = 'Votre mot de passe a été réinitialisé avec succès';

    } catch (error: any)
    {
      this.errorMessage = error.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe';
    } finally
    {
      this.isLoading = false;
    }
  }

  public goToLogin(): void
  {
    this.RouteUtils.NavigateTo(this.Routes.CONNEXION);
  }
}
