import { Component, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '@base/BaseComponent';
import { UsersService } from '@core/sellmatchdb/services';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';



@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, InputComponent, ButtonComponent],
  templateUrl: './forgot-password.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent extends BaseComponent
{
  public resetForm: FormGroup;
  public isLoading = false;
  public errorMessage = '';
  public successMessage = '';
  public emailSent = false;
  public userEmail = '';

  constructor (
    private readonly _fb: FormBuilder,
    private readonly _userService: UsersService
  )
  {
    super();
    this.resetForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
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
    this.emailSent = false;

    try
    {
      const email = this.resetForm.value.email.trim().toLowerCase();
      this.userEmail = email;

      // Appel au service pour demander la réinitialisation
      await this._userService.requestPasswordReset(email);

      // Afficher le message de succès
      this.emailSent = true;
      this.successMessage = `Un email de réinitialisation a été envoyé à ${email}`;

    } catch (error: any)
    {
      this.errorMessage = error.message || 'Une erreur est survenue lors de la demande de réinitialisation';
    } finally
    {
      this.isLoading = false;
    }
  }

  public backToLogin(): void
  {
    this.RouteUtils.NavigateTo(this.Routes.CONNEXION);
  }
}
