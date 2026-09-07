import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';

import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseComponent } from '@base/BaseComponent';
import { SmtpService, SupportEmailRequest } from '@core/services/Smtp/SmtpService';
import { ScrollRevealDirective } from '@shared/directives/TextRevealDirective';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';


@Component({
  selector: 'app-contact',
  standalone: true,
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, TranslatePipe, ScrollRevealDirective, InputComponent, ButtonComponent]
})
export class ContactComponent extends BaseComponent implements OnInit
{
  private _SmtpService: SmtpService = inject(SmtpService);
  private _FormBuilder: FormBuilder = inject(FormBuilder);

  public ContactForm: FormGroup;
  public IsSubmitting: boolean = false;
  public formSubmitted = false;
  public formSuccess = false;
  public formError = false;
  public errorMessage = '';

  /**
   * - cm - Liste des sujets de formulaire : les labels sont des CLES i18n resolues
   * a chaque lecture du getter `subjectSelectOptions` via `Translate.translate()`.
   * Le `markForCheck` automatique du `BaseComponent` (sur TranslationLoaded /
   * LanguageChanged) force Angular a re-evaluer le getter et rafraichit
   * la liste deroulee de l'app-input apres chaque changement de langue.
   */
  private readonly _SubjectKeys: { id: string; translationKey: string }[] = [
    { id: 'question', translationKey: 'contact.form.subjects.question' },
    { id: 'technique', translationKey: 'contact.form.subjects.technique' },
    { id: 'vente', translationKey: 'contact.form.subjects.vente' },
    { id: 'agent', translationKey: 'contact.form.subjects.agent' },
    { id: 'facturation', translationKey: 'contact.form.subjects.facturation' },
    { id: 'autre', translationKey: 'contact.form.subjects.autre' }
  ];

  /** Options mappees au format attendu par app-input (Label/Value). */
  public get subjectSelectOptions(): { Label: string; Value: string }[]
  {
    return this._SubjectKeys.map(pOption => ({
      Label: this.Translate.translate(pOption.translationKey),
      Value: pOption.id
    }));
  }

  constructor ()
  {
    super();
    // Le formulaire est initialement créé mais sera réinitialisé dans ngOnInit
    this.ContactForm = this._FormBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void
  {
    this.initializeForm();
  }

  private initializeForm(): void
  {
    // Récupère l'email de l'utilisateur s'il est connecté
    const userEmail = this.isLoggedIn && this.UsersService.currentUser?.email
      ? this.UsersService.currentUser.email
      : '';

    // Récupère le nom de l'utilisateur s'il est disponible
    const userName = this.isLoggedIn && this.UsersService.currentUser?.username
      ? this.UsersService.currentUser.username
      : '';

    this.ContactForm = this._FormBuilder.group({
      name: [userName, [Validators.required, Validators.minLength(2)]],
      email: [userEmail, [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  public async onSubmit(): Promise<void>
  {
    this.formSubmitted = true;

    if (this.ContactForm.invalid || this.IsSubmitting)
    {
      return;
    }

    this.IsSubmitting = true;
    this.formSuccess = false;
    this.formError = false;

    try
    {
      const formValues = this.ContactForm.value;
      const subjectLabel = this.getSubjectLabel(formValues.subject);

      const emailRequest: SupportEmailRequest = {
        fromName: formValues.name,
        fromEmail: formValues.email,
        subject: `[Contact] ${subjectLabel}`,
        message: formValues.message,
        sendConfirmation: true
      };

      const result = await this._SmtpService.sendEmailSupport(emailRequest);

      if (result)
      {
        this.formSuccess = true;
        this.resetForm();
      } else
      {
        throw new Error('Échec de l\'envoi du message');
      }
    } catch (error: any)
    {
      this.formError = true;
      this.errorMessage = error.message || 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer plus tard.';
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally
    {
      this.IsSubmitting = false;
      // Scroll to top after submission
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private getSubjectLabel(subjectId: string): string
  {
    const option = this._SubjectKeys.find(opt => opt.id === subjectId);
    if (!option) { return subjectId; }
    return this.Translate.translate(option.translationKey);
  }

  private resetForm(): void
  {
    this.initializeForm(); // Utilise la méthode d'initialisation pour garder l'email si l'utilisateur est connecté
    this.formSubmitted = false;
  }

  // Helpers pour les validations de formulaire
  public get formControls()
  {
    return this.ContactForm.controls;
  }
}
