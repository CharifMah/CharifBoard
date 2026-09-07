import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, computed, Signal } from '@angular/core';
import { BaseViewComponent } from '@core/base/BaseView/BaseViewComponent';
import { DashboardLayoutComponent } from '@shared/components/layout/dashboard-layout/dashboard-layout.component';
import { MenuItem } from '@shared/components/layout/sidebar/sidebar.component';
import { PopupSupportComponent } from '@components/popup-support/popup-support.component';
// [cm] 2026-08-12 : sous-vues CRM chargees en lazy via @defer (on viewport; prefetch on idle). Les imports ci-dessous restent obligatoires : le compilateur AOT a besoin que les selecteurs soient declares pour valider le template, et Angular 19+ genere un import dynamique vers le chunk dedie des qu'un composant apparait dans un bloc @defer (cf. angular.dev/guide/templates/defer).
import { CrmDashboardComponent } from '@views/Crm/crm-layout/crm-dashboard/crm-dashboard.component';
import { CrmContactsComponent } from '@views/Crm/crm-layout/crm-contacts/crm-contacts.component';
import { CrmBiensComponent } from '@views/Crm/crm-layout/crm-biens/crm-biens.component';
import { CrmObjectifsComponent } from '@views/Crm/crm-layout/crm-objectifs/crm-objectifs.component';
import { CrmIndicateursComponent } from '@views/Crm/crm-layout/crm-indicateurs/crm-indicateurs.component';
import { CrmProspectionComponent } from '@views/Crm/crm-layout/crm-prospection/crm-prospection.component';
import { CrmRecrutementComponent } from '@views/Crm/crm-layout/crm-recrutement/crm-recrutement.component';
import { CrmProjetsComponent } from '@views/Crm/crm-layout/crm-projets/crm-projets.component';
import { CrmTachesComponent } from '@views/Crm/crm-layout/crm-taches/crm-taches.component';
import { CrmParametresComponent } from '@views/Crm/crm-layout/crm-parametres/crm-parametres.component';
import { CrmHistoriqueComponent } from '@views/Crm/crm-layout/crm-historique/crm-historique.component';
import { CrmAgentChatComponent } from '@views/Crm/crm-layout/crm-agent-chat/crm-agent-chat.component';
import { CrmTutorialLauncherComponent } from '@components/crm-tutorial-launcher/crm-tutorial-launcher.component';
import { CrmHubService } from '@core/services/Crm/CrmHub.service';
import { ProfilComponent } from '@shared/components/profil/profil.component';
import { SupportedLanguage } from '@core/services/i18n/TranslationService';

/**
 * Shell du module CRM.
 * Etend {@link BaseViewComponent} pour suivre le pattern du dashboard pro :
 * navigation interne par signal `View` (via `Nav.Go`) et rendu par `@switch`,
 * reutilise le composant layout {@link DashboardLayoutComponent}.
 * Accessible aux roles `professionnel` et `admin` sous la route `/crm`.
 */
@Component({
  selector: 'app-crm-layout',
  imports: [
    DashboardLayoutComponent,
    PopupSupportComponent,
    // [cm] 2026-08-12 : sous-vues CRM declarees ici pour la validation AOT du template ; leur code est splitte en chunks lazy par le compilateur via les blocs @defer (cf. imports ci-dessus + bloc @defer dans le template).
    CrmDashboardComponent,
    CrmContactsComponent,
    CrmBiensComponent,
    CrmObjectifsComponent,
    CrmIndicateursComponent,
    CrmProspectionComponent,
    CrmRecrutementComponent,
    CrmProjetsComponent,
    CrmTachesComponent,
    CrmParametresComponent,
    CrmHistoriqueComponent,
    CrmAgentChatComponent,
    CrmTutorialLauncherComponent,
    ProfilComponent
  ],
  templateUrl: './crm-layout.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './crm-layout.component.scss'
})
export class CrmLayoutComponent extends BaseViewComponent implements OnInit, OnDestroy {
  //#region Attributes
  /** Service SignalR du CRM (connexion temps reel dashboard/alertes/activites) */
  private readonly _CrmHub: CrmHubService = inject(CrmHubService);
  //#endregion

  //#region Properties
  /** Vue par defaut au chargement du shell CRM */
  protected override readonly DefaultView: string = 'dashboard';

  /**
   * Liste des modules CRM navigables dans la sidebar.
   * Les libellés sont passés sous forme de clé i18n (`LabelCle`) : la sidebar
   * les traduit via le pipe `translate` à l'affichage et réagit aux changements
   * de langue sans recomputation côté composant.
   */
  public get MenuItems(): MenuItem[] {
    return [
      { LabelCle: 'crm-layout.menu.dashboard', View: 'dashboard', icon: 'dashboard' },
      { LabelCle: 'crm-layout.menu.contacts', View: 'contacts', icon: 'contacts' },
      { LabelCle: 'crm-layout.menu.portefeuilleGlobal', View: 'portefeuille', icon: 'home_work' },
      { LabelCle: 'crm-layout.menu.projets', View: 'projets', icon: 'group' },

      { LabelCle: 'crm-layout.menu.prospection', View: 'prospection', icon: 'travel_explore' },
      { LabelCle: 'crm-layout.menu.taches', View: 'taches', icon: 'task_alt' },
      { LabelCle: 'crm-layout.menu.objectifs', View: 'objectifs', icon: 'flag' },
      { LabelCle: 'crm-layout.menu.indicateurs', View: 'indicateurs', icon: 'insights' },

      { LabelCle: 'crm-layout.menu.recrutement', View: 'recrutement', icon: 'person_add' },
      { LabelCle: 'crm-layout.menu.historique', View: 'historique', icon: 'history' },
      { LabelCle: 'crm-layout.menu.parametres', View: 'parametres', icon: 'settings' },
      { LabelCle: 'crm-layout.menu.profil', View: 'profil', icon: 'person' },
      { LabelCle: 'crm-layout.menu.chatIa', View: 'chat-ia', icon: 'auto_awesome' }
    ];
  }

  //#region i18n computed (reactifs sur InstantTick)
  /** Libellé i18n "Vue inconnue" affichee dans le @default du @switch quand la vue n'existe pas. */
  public readonly ViewNotFound: Signal<string> = computed<string>(() => {
    this.Translate.InstantTick();
    return this.Translate.translate('crm-layout.viewNotFound', { view: this.Nav.View() });
  });
  //#endregion

  /**
   * Contexte de la page CRM courante (vue + table/structure affichée).
   * Injecté dans le prompt de l'agent chat pour orienter le remplissage vers la bonne table.
   * Recalculé automatiquement quand la vue change (signal Nav.View()).
   */
  public readonly CurrentPageContext: Signal<string> = computed<string>(() => this.BuildPageContext(this.Nav.View()));

  /**
   * Indique si la vue courante est la page Chat IA (chat-ia).
   * Quand `true`, le chat agent est rendu en mode embedded plein écran et la bulle flottante est masquée.
   */
  public readonly IsOnIaPage: Signal<boolean> = computed<boolean>(() => this.Nav.View() === 'chat-ia');

  /**
   * Construit la description du contexte de page pour l'agent IA.
   * @param pView Le nom de la vue courante
   * @returns Une chaîne décrivant la page, la table affichée et les outils MCP pertinents
   */
  private BuildPageContext(pView: string): string {
    // - cm - Cartographie vue -> contexte (page + table + colonnes + outils MCP pertinents)
    const lMap: Record<string, string> = {
      dashboard: 'Page courante : Dashboard CRM (vue d\'ensemble synthétique). Aucune table à remplir directement ; l\'agent peut créer des contacts, biens, transactions, locations, recherches ou tâches selon la demande.',
      objectifs: 'Page courante : Objectifs. Table : objectifs. Colonnes principales : objectif, periodeId, dateDebut, dateFin, cible, resultat, validee. Outils MCP pertinents : ListObjectifs, CreateObjectif.',
      indicateurs: 'Page courante : Indicateurs (lecture seule, calculés). Aucune création directe.',
      prospection: 'Page courante : Prospection. Table : prospections. Colonnes principales : action, dateAction, typeProspectionId, adresseId, quantite, tempsPasseMinutes, nbContacts, nbRendezVous, nbEstimations, nbMandats, caGenere. Outils MCP pertinents : ListProspections, CreateProspection.',
      recrutement: 'Page courante : Recrutement. Table : recrutements. Colonnes principales : classement, contactId, statutId, origineId, prochaineActionObjectif. Outils MCP pertinents : ListRecrutements, CreateRecrutement.',
      contacts: 'Page courante : Contacts. Table : contacts. Colonnes principales : prenom, nom, telephone, email, typeContactId, origineId, notes, consentement, preferenceContact. Outils MCP pertinents : ListContacts, CreateContact, AddContactTag.',
      biens: 'Page courante : Biens (fusion Portefeuille + Biens). Deux tableaux en onglets : Transactions (table transactions, colonnes : reference, adresseId, natureAffaireId, typeBienId, surface, statutId, etatCommercialId, motifBlocageId, clientId, prixAffiche, prixFinal, honorairesPct, commissionEstimee, revenuVariable, revenuTotalEncaisse, acquereurPotentiel, dateEstimation, datePriseMandat, dateCommercialisation, dateSignatureAuthentique) et Locations (table locations, colonnes : reference, adresseId, natureAffaireId, typeBienId, surface, statutId, etatCommercialId, motifBlocageId, clientId, loyerHc, honorairesLocationEstimes, honorairesLocationEncaisses, revenuVariable, revenuTotalEncaisse, locatairePotentiel, dateEstimation, datePriseMandat, dateCommercialisation, dateSignatureBailEntree). Outils MCP pertinents : ListTransactions, CreateTransaction, ListLocations, CreateLocation, ListProperties, CreateProperty.',
      projets: 'Page courante : Projets acquéreurs/locataires. Table : recherches. Colonnes principales : nomProjet, contactId, typeRechercheId, typeBienId, budgetMax, secteurRecherche, rayonKm, surfaceMin, nbChambres, biensCorrespondants, statutId. Outils MCP pertinents : ListRecherches, CreateRecherche, AddRechercheBien.',
      taches: 'Page courante : Tâches. Table : taches. Colonnes principales : nom, description, contactId, dateEcheance, prioriteId, notes, validee, archivee. Outils MCP pertinents : ListTaches, CreateTache.',
      parametres: 'Page courante : Paramètres. Table : parametres. Configuration du CRM (objectif annuel CA, part réseau, type TVA). Pas de création directe par l\'agent.',
      historique: 'Page courante : Historique. Table : historique_echanges. Journal des échanges avec les contacts (lecture seule via l\'agent, création possible via CreateHistoriqueEchange).',
      'chat-ia': 'Page courante : Chat IA. Page dédiée au chat agent IA en plein écran ; l\'agent peut importer des documents et compléter les tableaux CRM (contacts, biens, transactions, locations, recherches, tâches) via les outils MCP.'
    };
    const lDesc: string = lMap[pView] ?? `Page courante : ${pView}.`;
    return `${lDesc}\nL'utilisateur est sur cette page, privilégie le remplissage de la table correspondante si sa demande s'y prête.`;
  }
  //#endregion

  //#region Lifecycle
  /** @inheritdoc */
  public override async ngOnInit(): Promise<void> {
    // [cm] Init de la vue (Reset + LoadData) via BaseViewComponent. Le branchement auto du tuto (TutorialService.OnViewChange) est effectue dans BaseViewComponent.
    await super.ngOnInit();

    // [cm] 2026-08-13 : charge les traductions i18n du tutoriel CRM (registry `crm.tutorial`). Le service TutorialService.CurrentStep est reactif au InstantTick du TranslationService, donc il suffit de recharger a chaque changement de langue pour que les steps FR/EN/ES/PT suivent.
    void this.Translate.loadPageTranslations('crm.tutorial');
    this.Translate.LanguageChanged.subscribe((pLang: SupportedLanguage): void => {
      void this.Translate.loadPageTranslations('crm.tutorial', pLang);
    });

    // - cm - Demarre la connexion SignalR au hub CRM apres l'init de la vue
    void this._CrmHub.startConnection().then(() => {
      void this._CrmHub.joinDashboard();
    });
  }

  /** @inheritdoc */
  public override ngOnDestroy(): void {
    // - cm - Quitte le dashboard puis ferme la connexion SignalR
    void this._CrmHub.leaveDashboard();
    this._CrmHub.stopConnection();

    // - cm - Nettoyage des subscriptions + debranchement auto du tuto via BaseViewComponent
    super.ngOnDestroy();
  }
  //#endregion

  //#region Methods
  /**
   * Charge les donnees initiales du shell CRM.
   * @returns Promise resolu (pas de chargement asynchrone pour l'instant)
   */
  protected override LoadData(): Promise<void> {
    return Promise.resolve();
  }
  //#endregion
}
