// popup-support.component.ts
import { Component, EventEmitter, Input, Output, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@core/base/BaseComponent';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { SmtpService } from '@core/services/Smtp/SmtpService';

@Component({
  selector: 'app-popup-support',
  standalone: true,
  templateUrl: './popup-support.component.html',
  styleUrls: ['./popup-support.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, PopupComponent]
})
export class PopupSupportComponent extends BaseComponent
{
  @Input() isOpen: boolean = false;
  @Output() isOpenChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  private smtpService = inject(SmtpService);

  public IsSending: boolean = false;
  public SupportMessage = {
    subject: '',
    message: ''
  };

  private subjectLabels: Record<string, string> = {
    'question': 'Question générale',
    'technique': 'Problème technique',
    'dossier': 'Question sur un dossier',
    'facturation': 'Facturation',
    'autre': 'Autre'
  };

  constructor ()
  {
    super();
  }

  public get IsFormValid(): boolean
  {
    return !!this.SupportMessage.subject && !!this.SupportMessage.message.trim();
  }

  public async OnSend(): Promise<void>
  {
    if (!this.IsFormValid || this.IsSending) return;

    this.IsSending = true;

    try
    {
      const subjectLabel = this.subjectLabels[this.SupportMessage.subject] || this.SupportMessage.subject;

      const result = await this.smtpService.sendEmailSupport({
        fromEmail: this.UsersService.currentUser?.email,
        fromName: this.UsersService.currentUser?.username,
        subject: `[Support] ${subjectLabel}`,
        message: this.SupportMessage.message,
        sendConfirmation: true
      });

      if (result)
      {
        // TODO: Ajouter toast success si tu as un ToastService
        console.log('Message envoyé avec succès');
        this.Close();
      }
    }
    catch (error: any)
    {
      console.error('Erreur envoi support:', error);
      // TODO: Ajouter toast error si tu as un ToastService
    }
    finally
    {
      this.IsSending = false;
    }
  }

  public OnCancel(): void
  {
    this.Close();
  }

  public OnClose(): void
  {
    this.Close();
  }

  private Close(): void
  {
    this.ResetForm();
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }

  private ResetForm(): void
  {
    this.SupportMessage = { subject: '', message: '' };
  }
}
