import { Component, inject, OnInit, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { JoditEditorComponent } from '@shared/components/jodit-editor/jodit-editor.component';
import { BaseComponent } from '@base/BaseComponent';
import { ButtonComponent } from '@shared/components/button/button.component';
import { PopupComponent, PopupType } from '@shared/components/popup/popup.component';
import { InputComponent } from '@shared/components/input/input.component';
import { UsersService } from '@core/sellmatchdb/services';
import { UsersDTO } from '@core/sellmatchdb/dto/users/users.dto';
import { SmtpService, BroadcastEmailRequest } from '@core/services/Smtp/SmtpService';

@Component({
  selector: 'app-email-broadcast',
  standalone: true,
  imports: [FormsModule, JoditEditorComponent, ButtonComponent, PopupComponent, InputComponent],
  templateUrl: './email-broadcast.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./email-broadcast.component.scss']
})
export class EmailBroadcastComponent extends BaseComponent implements OnInit
{
  //#region Attributes
  private readonly _UsersService: UsersService = inject(UsersService);
  private readonly _SmtpService: SmtpService = inject(SmtpService);
  private readonly _Sanitizer: DomSanitizer = inject(DomSanitizer);
  private readonly _IsBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  //#endregion

  //#region Properties
  // - cm - Liste complète des utilisateurs chargés depuis l'API
  public Users: UsersDTO[] = [];
  // - cm - Liste filtrée selon la recherche
  public FilteredUsers: UsersDTO[] = [];
  // - cm - Emails sélectionnés (Set pour toggle rapide)
  public SelectedEmails: Set<string> = new Set<string>();
  // - cm - Terme de recherche courant
  public SearchTerm: string = '';

  // - cm - Champs du formulaire
  public FormSubject: string = '';
  public FormBody: string = '';
  public IsSending: boolean = false;

  // - cm - HTML brut de la signature SellMatch (source unique backend), affiché en lecture seule sous l'éditeur
  public SignatureHtml: string = '';

  // - cm - HTML complet de l'aperçu (template + corps + signature), généré côté backend pour un rendu fidèle
  public PreviewHtml: string = '';

  // - cm - Popup d'alerte générique
  public ShowAlert: boolean = false;
  public AlertTitle: string = '';
  public AlertMessage: string = '';
  public AlertType: PopupType = 'error';

  // - cm - Popup d'aperçu
  public ShowPreview: boolean = false;

  // - cm - Popup de confirmation d'envoi avec récapitulatif des destinataires
  public ShowSendConfirm: boolean = false;
  //#endregion

  //#region Lifecycle

  /**
   * Initialise le composant : charge la liste des utilisateurs (admin uniquement).
   */
  public ngOnInit(): void
  {
    this.BusyService.show();
    if (this._IsBrowser)
    {
      this.LoadUsers();
      this.LoadSignature();
    }
    else
    {
      this.BusyService.hide();
    }
  }

  //#endregion

  //#region Methods

  /**
   * Affiche une popup d'alerte générique.
   * @param pTitle Le titre de l'alerte
   * @param pMessage Le message de l'alerte
   * @param pType Le type de l'alerte (error, warning, info, success)
   */
  private DisplayAlert(pTitle: string, pMessage: string, pType: PopupType = 'error'): void
  {
    this.AlertTitle = pTitle;
    this.AlertMessage = pMessage;
    this.AlertType = pType;
    this.ShowAlert = true;
  }

  /**
   * Ferme la popup d'alerte.
   */
  public CloseAlert(): void
  {
    this.ShowAlert = false;
  }

  /**
   * Charge tous les utilisateurs depuis l'API (réservé admin côté backend).
   */
  public async LoadUsers(): Promise<void>
  {
    try
    {
      this.Users = await this._UsersService.getAll();
      this.ApplyFilter();
    }
    catch (pError)
    {
      console.error('Erreur lors du chargement des utilisateurs', pError);
      this.DisplayAlert('Erreur', 'Erreur lors du chargement des utilisateurs.', 'error');
    }
    finally
    {
      this.BusyService.hide();
    }
  }

  /**
   * Charge la signature SellMatch (source unique côté backend) et la stocke dans une propriété séparée.
   * La signature s'affiche en lecture seule sous l'éditeur (rendu fidèle), et le backend l'ajoute à l'envoi.
   * Aucune duplication du HTML côté frontend.
   */
  public async LoadSignature(): Promise<void>
  {
    try
    {
      this.SignatureHtml = await this._SmtpService.getSignature();
    }
    catch (pError)
    {
      console.error('Erreur lors du chargement de la signature', pError);
    }
  }

  /**
   * Rendu HTML sécurisé de la signature (contournement de la sanitization Angular pour préserver les styles inline).
   */
  public get SafeSignature(): SafeHtml
  {
    return this._Sanitizer.bypassSecurityTrustHtml(this.SignatureHtml ?? '');
  }

  /**
   * Rendu HTML sécurisé de l'aperçu complet (généré côté backend, rendu fidèle sans sanitization).
   */
  public get SafePreview(): SafeHtml
  {
    return this._Sanitizer.bypassSecurityTrustHtml(this.PreviewHtml ?? '');
  }

  /**
   * Retourne la liste des destinataires sélectionnés (nom + email) pour le récapitulatif.
   */
  public get SelectedRecipients(): { name: string; email: string }[]
  {
    const lResult: { name: string; email: string }[] = [];
    for (const lUser of this.Users)
    {
      if (lUser.email && this.SelectedEmails.has(lUser.email))
      {
        lResult.push({ name: this.GetFullName(lUser), email: lUser.email });
      }
    }
    return lResult;
  }

  /**
   * Applique le filtre de recherche sur la liste des utilisateurs.
   */
  public ApplyFilter(): void
  {
    const lTerm: string = this.SearchTerm.trim().toLowerCase();
    if (!lTerm)
    {
      this.FilteredUsers = this.Users;
      return;
    }
    this.FilteredUsers = this.Users.filter((pUser: UsersDTO) =>
      (pUser.email ?? '').toLowerCase().includes(lTerm) ||
      (`${pUser.firstName ?? ''} ${pUser.lastName ?? ''}`).toLowerCase().includes(lTerm)
    );
  }

  /**
   * Bascule la sélection d'un utilisateur.
   * @param pEmail L'email de l'utilisateur à basculer
   */
  public ToggleSelection(pEmail: string): void
  {
    if (this.SelectedEmails.has(pEmail))
    {
      this.SelectedEmails.delete(pEmail);
    }
    else
    {
      this.SelectedEmails.add(pEmail);
    }
  }

  /**
   * Sélectionne tous les utilisateurs de la liste filtrée.
   */
  public SelectAllFiltered(): void
  {
    for (const lUser of this.FilteredUsers)
    {
      if (lUser.email)
      {
        this.SelectedEmails.add(lUser.email);
      }
    }
  }

  /**
   * Désélectionne tous les utilisateurs de la liste filtrée.
   */
  public DeselectAllFiltered(): void
  {
    for (const lUser of this.FilteredUsers)
    {
      if (lUser.email)
      {
        this.SelectedEmails.delete(lUser.email);
      }
    }
  }

  /**
   * Retourne le nom complet d'un utilisateur.
   * @param pUser L'utilisateur
   * @returns Le nom complet (prénom + nom)
   */
  public GetFullName(pUser: UsersDTO): string
  {
    return `${pUser.firstName ?? ''} ${pUser.lastName ?? ''}`.trim() || (pUser.email ?? '');
  }

  /**
   * Getter du nombre de destinataires sélectionnés.
   */
  public get SelectedCount(): number
  {
    return this.SelectedEmails.size;
  }

  /**
   * Ouvre la popup d'aperçu du rendu de l'email (génère le HTML complet côté backend : template + corps + signature).
   * L'aperçu est autorisé même avec un corps vide : le template SellMatch + la signature s'affichent toujours.
   */
  public async OpenPreview(): Promise<void>
  {
    this.BusyService.show('Génération de l\'aperçu...');
    try
    {
      this.PreviewHtml = await this._SmtpService.getPreview(this.FormBody);
      this.ShowPreview = true;
    }
    catch (pError)
    {
      console.error('Erreur lors de la génération de l\'aperçu', pError);
      this.DisplayAlert('Erreur', 'Erreur lors de la génération de l\'aperçu.', 'error');
    }
    finally
    {
      this.BusyService.hide();
    }
  }

  /**
   * Ferme la popup d'aperçu.
   */
  public ClosePreview(): void
  {
    this.ShowPreview = false;
  }

  /**
   * Envoie l'email broadcast après validation et confirmation.
   */
  public async SendBroadcast(): Promise<void>
  {
    // - cm - Validation des champs obligatoires
    if (this.SelectedEmails.size === 0)
    {
      this.DisplayAlert('Validation', 'Sélectionnez au moins un destinataire.', 'warning');
      return;
    }
    if (!this.FormSubject.trim())
    {
      this.DisplayAlert('Validation', 'Le sujet est obligatoire.', 'warning');
      return;
    }
    // - cm - Le corps peut être vide : le template SellMatch + la signature constituent déjà un email valide

    // - cm - Ouverture du popup de confirmation avec récapitulatif des destinataires
    this.ShowSendConfirm = true;
  }

  /**
   * Ferme le popup de confirmation d'envoi.
   */
  public CloseSendConfirm(): void
  {
    this.ShowSendConfirm = false;
  }

  /**
   * Confirme l'envoi du broadcast (appelé par le bouton "Confirmer l'envoi" du popup de récapitulatif).
   */
  public async ConfirmSend(): Promise<void>
  {
    this.ShowSendConfirm = false;
    this.IsSending = true;
    this.BusyService.show('Envoi en cours...');

    try
    {
      const lRequest: BroadcastEmailRequest = {
        recipientEmails: Array.from(this.SelectedEmails),
        subject: this.FormSubject.trim(),
        body: this.FormBody
      };
      const lSuccess: boolean = await this._SmtpService.sendBroadcast(lRequest);

      if (lSuccess)
      {
        this.DisplayAlert(
          'Succès',
          `Email envoyé avec succès à ${this.SelectedEmails.size} destinataire(s).`,
          'success'
        );
        // - cm - Réinitialisation du corps et de la sélection après envoi réussi (la signature reste affichée dans son panneau)
        this.FormBody = '';
        this.FormSubject = '';
        this.SelectedEmails.clear();
      }
      else
      {
        this.DisplayAlert('Erreur', 'L\'envoi a échoué.', 'error');
      }
    }
    catch (pError: unknown)
    {
      console.error('Erreur lors de l\'envoi du broadcast', pError);
      this.DisplayAlert(
        'Erreur',
        'Erreur lors de l\'envoi de l\'email.',
        'error'
      );
    }
    finally
    {
      this.IsSending = false;
      this.BusyService.hide();
    }
  }

  //#endregion
}