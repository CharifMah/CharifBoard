import { Component, signal, ChangeDetectionStrategy, inject, computed, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@base/BaseComponent';
import { ParametresService } from '@core/crm/services/parametres/parametres.service';
import { ParametresDTO } from '@core/crm/dto/parametres/parametres.dto';
import { RefTypeTvaService } from '@core/crm/services/ref-type-tva/ref-type-tva.service';
import { RefTypeTvaDTO } from '@core/crm/dto/ref-type-tva/ref-type-tva.dto';
import { DashboardHeaderComponent } from '@shared/components/layout/dashboard-header/dashboard-header.component';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { MessageDisplayComponent } from '@shared/components/message-display/message-display.component';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';
import { TranslateDirective } from '@core/services/i18n/TranslateDirective';
import { TranslationService } from '@core/services/i18n/TranslationService';

/**
 * Page Parametres du CRM.
 * Cartes de configuration (profil, notifications, parametres) avec popups de configuration reelles.
 * Section Parametres : edit inline du ParametresDTO (objectif annuel CA, part reseau, type TVA)
 * via ParametresService. Le userId est force cote backend depuis la session JWT
 * (anti-usurpation) : inutile (et interdit pour un non-admin) de l'envoyer depuis le front.
 * Notifications basees sur la table reelle crm.alertes (AlertesService).
 */
@Component({
  selector: 'app-crm-parametres',
  standalone: true,
  imports: [DashboardHeaderComponent, FormsModule, PopupComponent, ButtonComponent, MessageDisplayComponent, TooltipComponent, TranslateKeyPipe, TranslateDirective],
  templateUrl: './crm-parametres.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-parametres.component.scss'
})
export class CrmParametresComponent extends BaseComponent
{
  //#region Services
  /**
   * Service backend pour la table crm.parametres (ParametresDTO).
   */
  private readonly ParametresService: ParametresService = inject(ParametresService);

  /** Service de traduction (lazy-load par page). */
  private readonly _Translation: TranslationService = inject(TranslationService);

  /**
   * Service backend pour la table de reference crm.ref_type_tva (RefTypeTvaDTO).
   * Utilise pour peupler la liste deroulante du champ TypeTvaId dans la popup d'edition.
   */
  private readonly RefTypeTvaService: RefTypeTvaService = inject(RefTypeTvaService);
  //#endregion

  //#region State
  /**
   * Etat de chargement de la fiche parametres.
   */
  public readonly Loading = signal<boolean>(false);

  /**
   * Message d'erreur courant (chargement / sauvegarde).
   */
  public readonly ErrorMessage = signal<string | null>(null);

  /**
   * Message de succes apres sauvegarde reussie.
   * - cm - Visible a la fois dans la popup (avant fermeture) et sur la grille apres fermeture.
   */
  public readonly SuccessMessage = signal<string | null>(null);

  /**
   * Indicateur de sauvegarde en cours.
   */
  public readonly Saving = signal<boolean>(false);

  /**
   * Modele du formulaire lie a la fiche ParametresDTO de l'utilisateur courant.
   * Initialise depuis getAll({ userId }) puis mis a jour par les inputs.
   */
  public readonly Form = signal<ParametresDTO>({
    userId: undefined,
    objectifAnnuelCa: undefined,
    partReseauPct: undefined,
    typeTvaId: undefined,
    createdAt: undefined,
    updatedAt: undefined
  });

  /**
   * Indique si la fiche existe deja en BDD (id non null) -> PUT, sinon POST.
   */
  public readonly HasExistingRow = signal<boolean>(false);

  /**
   * Etat d'ouverture de la popup d'edition des ParametresDTO.
   */
  public readonly ShowParametresPopup = signal<boolean>(false);

  /**
   * Liste des types de TVA actifs (table de reference crm.ref_type_tva)
   * pour alimenter la liste deroulante du champ TypeTvaId.
   */
  public readonly TypeTvaOptions = signal<RefTypeTvaDTO[]>([]);
  //#endregion

  //#region Sections
  /**
   * Grille des sections affichees sur la page Parametres.
   * - cm - Les libelles (titre / description / action) sont des cles i18n resolues
   * a chaque lecture du getter `Sections()` via `this.Translate.translate()`.
   * Le `markForCheck` automatique de `BaseComponent` (sur `TranslationLoaded` /
   * `LanguageChanged`) force Angular a re-evaluer le getter et rafraichit la grille
   * apres chaque changement de langue.
   */
  public get Sections(): { Icon: string; Title: string; Description: string; Action: string; Event: string }[]
  {
    return [
      {
        Icon: 'notifications',
        Title: this.Translate.translate('parametres.card_notifications_title'),
        Description: this.Translate.translate('parametres.card_notifications_description'),
        Action: this.Translate.translate('parametres.card_notifications_action'),
        Event: 'crm_parametres_notifications'
      },
      {
        Icon: 'tune',
        Title: this.Translate.translate('parametres.card_parametres_title'),
        Description: this.Translate.translate('parametres.card_parametres_description'),
        Action: this.Translate.translate('parametres.card_parametres_action'),
        Event: 'crm_parametres_parametres'
      }
    ];
  }
  //#endregion

  // #region Translations [cm] Getters i18n pour les libelles de la popup ParametresDTO. Toutes les cles sont prefixees par `parametres.` pour matcher le namespace du fichier parametres.{lang}.json charge par le TranslationService. [cm] Le `markForCheck` de BaseComponent (TranslationLoaded / LanguageChanged) force Angular a re-evaluer ces getters et rafraichit le template apres chaque changement de langue.

  /** Titre de la page Parametres (migre dans le template via `| tkey`). */
  /** Sous-titre de la page Parametres (migre dans le template via `| tkey`). */

  /** Titre de la popup d'edition ParametresDTO. */
  public get PopupTitle(): string
  {
    return this.Translate.translate('parametres.popup_title');
  }

  /** Sous-titre de la popup d'edition ParametresDTO. */
  public get PopupSubtitle(): string
  {
    return this.Translate.translate('parametres.popup_subtitle');
  }

  /** Section "Objectifs commerciaux". */
  public get SectionCommercialObjectives(): string
  {
    return this.Translate.translate('parametres.section_commercial_objectives');
  }

  /** Section "Fiscalite". */
  public get SectionFiscalite(): string
  {
    return this.Translate.translate('parametres.section_fiscalite');
  }

  /** Libelle du champ "Objectif annuel CA (€)". */
  public get LabelObjectifAnnuelCa(): string
  {
    return this.Translate.translate('parametres.label_objectif_annuel_ca');
  }

  /** Libelle du champ "Part reseau (%)". */
  public get LabelPartReseauPct(): string
  {
    return this.Translate.translate('parametres.label_part_reseau_pct');
  }

  /** Libelle du champ "Type de TVA". */
  public get LabelTypeTvaId(): string
  {
    return this.Translate.translate('parametres.label_type_tva_id');
  }

  /** Placeholder du champ Objectif annuel CA. */
  public get PlaceholderObjectifAnnuelCa(): string
  {
    return this.Translate.translate('parametres.placeholder_objectif_annuel_ca');
  }

  /** Placeholder du champ Part reseau. */
  public get PlaceholderPartReseauPct(): string
  {
    return this.Translate.translate('parametres.placeholder_part_reseau_pct');
  }

  /**
   * Bulle d'aide du champ Objectif annuel CA.
   * Explication metier : sert de cible aux graphiques "Avancement objectif" et au compteur
   * de la grille ; non bloquant si laisse vide.
   */
  public get TooltipObjectifAnnuelCa(): string
  {
    return this.Translate.translate('parametres.tooltip_objectif_annuel_ca');
  }

  /**
   * Bulle d'aide du champ Part reseau (%).
   * Explication metier : pourcentage du CA reverse au reseau sur chaque transaction
   * signee par un apporteur reseau.
   */
  public get TooltipPartReseauPct(): string
  {
    return this.Translate.translate('parametres.tooltip_part_reseau_pct');
  }

  /**
   * Bulle d'aide du champ Type de TVA.
   * Explication metier : regime de TVA par defaut pre-selectionne lors de la creation
   * des factures / compromis pour cet utilisateur.
   */
  public get TooltipTypeTvaId(): string
  {
    return this.Translate.translate('parametres.tooltip_type_tva_id');
  }

  /** Option "Aucun" du select Type de TVA. */
  public get OptionAucunTypeTva(): string
  {
    return this.Translate.translate('parametres.option_au_type_tva');
  }

  /** Texte du bouton "Enregistrer" de la popup ParametresDTO. */
  public get PopupConfirm(): string
  {
    return this.Translate.translate('crm-parametres.popup.confirm');
  }

  /** Texte du bouton "Annuler" de la popup ParametresDTO. */
  public get PopupCancel(): string
  {
    return this.Translate.translate('crm-parametres.popup.cancel');
  }

  /** Texte affiche pendant le chargement de la fiche. */
  public get PopupLoading(): string
  {
    return this.Translate.translate('crm-parametres.popup.loading');
  }

  /** Message d'erreur lors du chargement. */
  public get ErrorMessageLoad(): string
  {
    return this.Translate.translate('crm-parametres.popup.errorLoad');
  }

  /** Message de succes apres sauvegarde (creation). */
  public get SuccessMessageSave(): string
  {
    return this.Translate.translate('crm-parametres.popup.successSave');
  }

  /** Prefix du libelle de fallback d'un type de TVA sans libelle/code. */
  public get TypeTvaFallbackPrefix(): string
  {
    return this.Translate.translate('crm-parametres.popup.typeFallback');
  }
  //#endregion

  //#region CTOR
  /**
   * Charge la fiche parametres de l'utilisateur courant au demarrage,
   * ainsi que la liste des types de TVA pour la liste deroulante.
   */
  constructor()
  {
    super();
    void this.Translate.loadPageTranslations('crm.parametres');
    this.LoadParametres();
    this.LoadTypeTvaOptions();
  }
  //#endregion

  //#region Methods

  /**
   * Gere le clic sur une carte de la grille de parametres.
   * - cm - Seul l'event 'crm_parametres_parametres' ouvre la popup reelle d'edition
   * du ParametresDTO ; les autres (profil, notifications) ouvrent leur propre popup
   * geree par leur composant respectif (a venir).
   * @param pEvent Nom logique de l'evenement PostHog / de la section cliquee
   */
  public OnSectionClick(pEvent: string): void
  {
    switch (pEvent)
    {
      case 'crm_parametres_parametres':
        this.OpenParametresPopup();
        break;

      default:
        // - cm - Sections Profil / Notifications : pas encore branchees, on log uniquement
        this.PostHog.Capture(pEvent);
        break;
    }
  }

  /**
   * Ouvre la popup d'edition des ParametresDTO et recharge la fiche
   * depuis l'API si necessaire pour avoir les dernieres valeurs.
   */
  public OpenParametresPopup(): void
  {
    // - cm - Nettoie les messages d'avant ouverture pour repartir sur un etat vierge
    this.ErrorMessage.set(null);
    this.SuccessMessage.set(null);

    this.ShowParametresPopup.set(true);
    this.PostHog.Capture('crm_parametres_parametres_open');
    // - cm - Rafraichit la liste des types de TVA a l'ouverture (peuvent evoluer)
    void this.LoadTypeTvaOptions();
  }

  /**
   * Ferme la popup d'edition des ParametresDTO.
   */
  public CloseParametresPopup(): void
  {
    if (!this.ShowParametresPopup())
    {
      return;
    }
    this.ShowParametresPopup.set(false);
    this.ErrorMessage.set(null);
  }

  /**
   * Charge la fiche ParametresDTO de l'utilisateur courant depuis l'API.
   * - cm - Filtre par userId (string -> number) puis prend la 1re ligne.
   * Si rien en BDD, initialise un formulaire vide pour creation au prochain save.
   */
  public async LoadParametres(): Promise<void>
  {
    this.Loading.set(true);
    this.ErrorMessage.set(null);

    const lUserIdString: string | null = this.CurrentUserId;
    const lUserId: number | undefined = lUserIdString ? Number(lUserIdString) : undefined;

    try
    {
      const lRows: ParametresDTO[] = await this.ParametresService.getAll({
        userId: lUserId
      } as any);

      if (lRows.length > 0)
      {
        this.Form.set({ ...lRows[0] });
        this.HasExistingRow.set(true);
      }
      else
      {
        // - cm - Pas de fiche existante : on prepare une creation avec le userId courant
        this.Form.set({
          userId: lUserId,
          objectifAnnuelCa: undefined,
          partReseauPct: undefined,
          typeTvaId: undefined,
          createdAt: undefined,
          updatedAt: undefined
        });
        this.HasExistingRow.set(false);
      }
    }
    catch (lError)
    {
      this.ErrorMessage.set(this.ErrorMessageLoad);
    }
    finally
    {
      this.Loading.set(false);
    }
  }

  /**
   * Met a jour un champ du formulaire (signal immutable).
   * @param pField Nom du champ DTO a modifier
   * @param pValue Nouvelle valeur
   */
  public UpdateField<K extends keyof ParametresDTO>(pField: K, pValue: ParametresDTO[K]): void
  {
    this.Form.update(lCurrent => ({ ...lCurrent, [pField]: pValue }));
  }

  /**
   * Convertit une valeur d'input (string ou number) en number, ou undefined si vide.
   * - cm - Necessaire car le binding de template Angular n'a pas acces a Number(...) (global JS).
   * @param pValue Valeur brute recue du ngModelChange
   * @returns Nombre converti ou undefined si vide / non convertible
   */
  public ToNumberOrUndefined(pValue: unknown): number | undefined
  {
    if (pValue === null || pValue === undefined || pValue === '')
    {
      return undefined;
    }
    const lNumber: number = Number(pValue);
    return Number.isFinite(lNumber) ? lNumber : undefined;
  }

  /**
   * Charge la liste des types de TVA actifs depuis l'API (table de reference crm.ref_type_tva).
   * - cm - Filtre isActive=true et trie par displayOrder croissant pour respecter l'ordre metier.
   * En cas d'erreur, on log sans bloquer la popup (champ reste vide / select vide).
   */
  public async LoadTypeTvaOptions(): Promise<void>
  {
    try
    {
      const lRows: RefTypeTvaDTO[] = await this.RefTypeTvaService.getAll({
        isActive: true
      } as any);

      const lSorted: RefTypeTvaDTO[] = [...lRows].sort((pA, pB) => {
        const lOrderA: number = pA.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const lOrderB: number = pB.displayOrder ?? Number.MAX_SAFE_INTEGER;
        return lOrderA - lOrderB;
      });

      this.TypeTvaOptions.set(lSorted);
    }
    catch (lError)
    {
      // - cm - On ne bloque pas l'edition si la liste de ref est indisponible
      this.TypeTvaOptions.set([]);
    }
  }

  /**
   * Sauvegarde la fiche ParametresDTO (POST si creation, PUT si mise a jour).
   * - cm - Ferme la popup apres sauvegarde reussie, et affiche un message de succes
   * sur la grille principale pour confirmer la prise en compte.
   */
  public async Save(): Promise<void>
  {
    this.Saving.set(true);
    this.ErrorMessage.set(null);

    try
    {
      const lDto: ParametresDTO = this.Form();

      if (this.HasExistingRow() && lDto.id)
      {
        const lUpdated: ParametresDTO | null = await this.ParametresService.update(lDto);
        if (lUpdated)
        {
          this.Form.set({ ...lUpdated });
        }
      }
      else
      {
        const lCreated: ParametresDTO = await this.ParametresService.create(lDto);
        this.Form.set({ ...lCreated });
        this.HasExistingRow.set(true);
      }

      this.PostHog.Capture('crm_parametres_save');

      // - cm - Ferme la popup et notifie le succes sur la grille
      this.ShowParametresPopup.set(false);
      this.ErrorMessage.set(null);
      this.SuccessMessage.set(this.SuccessMessageSave);

      // - cm - Efface le message de succes apres 5s pour ne pas le laisser affiche indefiniment
      setTimeout(() => this.SuccessMessage.set(null), 5000);
    }
    catch (lError: any)
    {
      this.ErrorMessage.set(lError?.message ?? 'Erreur lors de la sauvegarde des parametres.');
    }
    finally
    {
      this.Saving.set(false);
    }
  }
  //#endregion
}
