import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ElementRef, ViewChild, WritableSignal, Signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { BaseComponent } from '@base/BaseComponent';
import { environment } from '@env/environment';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { IInputOption } from '@shared/components/input/input.types';
import { UploadFileComponent, FileTypeConfig } from '@shared/components/UploadFile/upload-file.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { DiffViewComponent, DiffRecord, EDiffAction } from '@shared/components/diff-view/diff-view.component';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';
import { GridComponent } from '@shared/components/grid/grid.component';
import { TransactionGridComponent } from '@views/Crm/crm-layout/crm-biens/grids/transaction-grid.component';
import { LocationGridComponent } from '@views/Crm/crm-layout/crm-biens/grids/location-grid.component';
import { PropertyGridComponent } from '@views/Crm/crm-layout/crm-biens/grids/property-grid.component';
import { ContactGridComponent } from '@views/Crm/crm-layout/crm-contacts/grids/contact-grid.component';
import { HistoriqueGridComponent } from '@views/Crm/crm-layout/crm-historique/grids/historique-grid.component';
import { TacheGridComponent } from '@views/Crm/crm-layout/crm-taches/grids/tache-grid.component';
import { ObjectifGridComponent } from '@views/Crm/crm-layout/crm-objectifs/grids/objectif-grid.component';
import { ProjetGridComponent } from '@views/Crm/crm-layout/crm-projets/grids/projet-grid.component';
import { ProspectionGridComponent } from '@views/Crm/crm-layout/crm-prospection/grids/prospection-grid.component';
import { RecrutementGridComponent } from '@views/Crm/crm-layout/crm-recrutement/grids/recrutement-grid.component';
import { CrmAgentHubService, CrmAgentStepRecord, CrmAgentTurnResult, CrmAgentChatOptions, CrmAgentApprovalRequest, CrmAgentPlannedAction, HistoryMessage } from '@core/services/Crm/CrmAgentHub.service';
import { ImportParserService } from '@core/services/Crm/ImportParser.service';
import { GridColumn } from '@shared/components/grid/GridColumn';

/**
 * Rôle d'un message affiché dans le chat agent CRM.
 */
type EChatBubbleRole = 'user' | 'assistant' | 'step' | 'error' | 'approval';

/**
 * Décision de l'utilisateur face à une demande d'approbation d'actions.
 */
type EApprovalDecision = 'approved' | 'rejected';

/**
 * Suggestion interactive proposée par l'agent (bouton cliquable sous le message).
 */
interface ChatSuggestion {
  /** Libellé affiché sur le bouton. */
  Label: string;
}

/**
 * Bulle de message affichée dans le chat agent CRM.
 */
interface ChatBubble {
  /** Identifiant unique de la bulle. */
  Id: string;
  /** Rôle (user / assistant / étape agent / erreur / approbation). */
  Role: EChatBubbleRole;
  /** Contenu textuel (user / assistant). */
  Content?: string;
  /** Étape agent (si Role = step ou error). */
  Step?: CrmAgentStepRecord;
  /** Indique si l'agent travaille (spinner). */
  Pending?: boolean;
  /** Demande d'approbation d'actions mutantes (si Role = approval). */
  Approval?: CrmAgentApprovalRequest;
  /** Décision de l'utilisateur sur la demande d'approbation (null = en attente). */
  ApprovalDecision?: EApprovalDecision;
  /** Suggestions interactives proposées par l'agent (boutons cliquables sous le message). */
  Suggestions?: ChatSuggestion[];
}

/**
 * Résumé d'une conversation passée (pour l'historique latéral).
 * Stocke l'intégralité des bulles (prompt utilisateur, étapes agent, message final, erreurs)
 * pour une restauration fidèle lors de la sélection dans l'historique.
 */
interface ConversationSummary {
  /** Identifiant de session. */
  SessionId: string;
  /** Premier prompt utilisateur (extrait pour le titre, tronqué pour l'affichage). */
  Title: string;
  /** Prompt utilisateur complet (non tronqué, pour la restauration fidèle). */
  Prompt: string;
  /** Message final de l'agent. */
  FinalMessage: string;
  /** Snapshot complet des bulles de la conversation (user/assistant/step/error). */
  Bubbles: ChatBubble[];
  /** Résultat complet du dernier tour agent (usage tokens, MCP, diffs) — optionnel. */
  Result?: CrmAgentTurnResult;
  /** Date de création (ISO). */
  CreatedAt: string;
  /** Nombre d'appels d'outils MCP. */
  ToolCallCount: number;
  /** Total des tokens consommés. */
  TotalTokens: number;
}

/**
 * Fournisseur LLM disponible pour le chat agent CRM (config partagée avec la page Import IA).
 */
interface AiProviderOption {
  /** Valeur technique du fournisseur. */
  Value: string;
  /** Libellé affiché dans le select. */
  Label: string;
  /** Modèle par défaut proposé. */
  DefaultModel: string;
}

/**
 * Modèle retourné par l'API Ollama locale (/api/tags).
 */
interface OllamaModel {
  /** Nom technique du modèle. */
  Name: string;
}

/**
 * Composant chat agent CRM (bulle flottante).
 * Bulle FAB fixe en bas à droite, ouvrant un panneau chat conversationnel.
 * L'utilisateur saisit un prompt (+ fichier optionnel), l'agent remplit les tableaux CRM
 * en utilisant le MCP CRM. Chaque étape (tool calls, résultats, messages) s'affiche en temps réel.
 */
@Component({
  selector: 'app-crm-agent-chat',
  standalone: true,
  imports: [FormsModule, ButtonComponent, InputComponent, UploadFileComponent, BadgeComponent, DiffViewComponent, GridComponent, TooltipComponent, TransactionGridComponent, LocationGridComponent, PropertyGridComponent, ContactGridComponent, HistoriqueGridComponent, TacheGridComponent, ObjectifGridComponent, ProjetGridComponent, ProspectionGridComponent, RecrutementGridComponent],
  templateUrl: './crm-agent-chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './crm-agent-chat.component.scss',
  host: { '[class.is-embedded]': 'IsEmbedded()' }
})
export class CrmAgentChatComponent extends BaseComponent implements OnInit, OnDestroy {
  //#region Attributes
  /** Service de connexion SignalR au hub agent CRM. */
  private readonly _Hub: CrmAgentHubService = inject(CrmAgentHubService);
  /** Service de parsing unifie des resultats d'outils MCP (remplace ParseImportedRows / ParseListResult / ParseDiff). */
  public readonly Parser: ImportParserService = inject(ImportParserService);
  /** Sanitiseur Angular pour le rendu HTML du markdown des messages assistant. */
  private readonly _Sanitizer: DomSanitizer = inject(DomSanitizer);
  /** Abonnements SignalR actifs. */
  private readonly _Subscriptions: Subscription[] = [];
  /** Identifiant de la session agent courante (persistance multi-tour). */
  private _SessionId: string | null = null;
  /** Dernier prompt utilisateur saisi (pour le titre de conversation dans l'historique). */
  private _LastPrompt: string = '';
  /** Référence au conteneur des messages (pour auto-scroll). */
  @ViewChild('MessagesContainer') private _MessagesContainer?: ElementRef<HTMLElement>;
  //#endregion

  //#region Properties
  /** Contexte de la page CRM courante (vue + table/structure affichée). Injecté dans le prompt de l'agent. */
  @Input() public PageContext: string | null = null;

  /**
   * Mode intégré (embedded) : le composant est rendu en plein écran inline dans une page
   * (ex. page IA du CRM) au lieu d'être une bulle flottante FAB.
   * Quand `true`, le FAB n'est pas rendu, le panneau est ouvert par défaut, sans position fixed.
   */
  @Input() public set Embedded(pValue: boolean) {
    const lValue: boolean = pValue || false;
    this._EmbeddedSignal.set(lValue);
    if (lValue) {
      // - cm - En mode embedded, le panneau est ouvert par défaut et en plein écran inline
      this.IsOpen.set(true);
      this.IsFullscreen.set(true);
      // - cm - En mode full-page, l'historique est visible par défaut pour une expérience chat complète
      this.ShowHistory.set(true);
    }
  }
  public get Embedded(): boolean {
    return this._EmbeddedSignal();
  }

  /** Indique si le panneau chat est ouvert. */
  public readonly IsOpen: WritableSignal<boolean> = signal<boolean>(false);

  /** Indique si le panneau est en mode plein écran. */
  public readonly IsFullscreen: WritableSignal<boolean> = signal<boolean>(false);

  /** Indique si le panneau de configuration (provider/modèle) est visible. */
  public readonly ShowSettings: WritableSignal<boolean> = signal<boolean>(false);

  /** Indique si le panneau latéral d'historique est visible. */
  public readonly ShowHistory: WritableSignal<boolean> = signal<boolean>(false);

  /** Identifiant de la conversation actuellement sélectionnée dans l'historique (pour surbrillance). */
  public readonly SelectedSessionId: WritableSignal<string | null> = signal<string | null>(null);

  /** Largeur du panneau chat (px, persistée en localStorage). */
  public readonly PanelWidth: WritableSignal<number> = signal<number>(420);

  /** Hauteur du panneau chat (px, persistée en localStorage). */
  public readonly PanelHeight: WritableSignal<number> = signal<number>(600);

  /** Historique des conversations passées (persistées en localStorage). */
  public readonly Conversations: WritableSignal<ConversationSummary[]> = signal<ConversationSummary[]>([]);

  /** Indique si l'agent travaille (tour en cours). */
  public readonly IsBusy: WritableSignal<boolean> = signal<boolean>(false);

  /** Prompt texte saisi par l'utilisateur. */
  public readonly Prompt: WritableSignal<string> = signal<string>('');

  /** Fichier sélectionné pour l'envoi. */
  public readonly SelectedFile: WritableSignal<File | null> = signal<File | null>(null);

  /** Liste des bulles de message du chat. */
  public readonly Bubbles: WritableSignal<ChatBubble[]> = signal<ChatBubble[]>([]);

  /** Fournisseur LLM (préférence locale). */
  public readonly Provider: WritableSignal<string> = signal<string>('sellmatch');

  /** Modèle LLM. Doit supporter le tool-calling Ollama (qwen2.5, llama3.1+, mistral-nemo...). */
  public readonly Model: WritableSignal<string> = signal<string>('minimax-m3:cloud');

  /** URL d'endpoint personnalisée (optionnel). */
  public readonly EndpointUrl: WritableSignal<string> = signal<string>('');

  /** Clé API / token (optionnel, saisie masquée). */
  public readonly ApiKey: WritableSignal<string> = signal<string>('');

  /**
   * Liste des fournisseurs LLM disponibles (config partagée avec la page Import IA).
   * Doit rester identique à `CrmAiImportComponent.Providers` pour la cohérence du localStorage.
   */
  public readonly Providers: AiProviderOption[] = [
    { Value: 'sellmatch', Label: 'SellMatch IA', DefaultModel: 'minimax-m3:cloud' },
    { Value: 'ollama-local', Label: 'Ollama Local', DefaultModel: 'llama3' }
  ];

  /** Options formatées pour le select de fournisseurs. */
  public readonly ProviderOptions: IInputOption[] = this.Providers.map((pP: AiProviderOption) => ({ Value: pP.Value, Label: pP.Label }));

  /** Liste des modèles disponibles sur l'Ollama locale (résultat de /api/tags). */
  public readonly OllamaModels: WritableSignal<OllamaModel[]> = signal<OllamaModel[]>([]);

  /** Indique si la connexion à Ollama locale est en cours. */
  public readonly IsOllamaConnecting: WritableSignal<boolean> = signal<boolean>(false);

  /** Message d'erreur de connexion à Ollama locale. */
  public readonly OllamaConnectionError: WritableSignal<string | null> = signal<string | null>(null);

  /** Options formatées pour le select de modèles Ollama. */
  public readonly OllamaModelOptions: Signal<IInputOption[]> = computed<IInputOption[]>(() =>
    this.OllamaModels().map((pModel: OllamaModel) => ({ Value: pModel.Name, Label: pModel.Name }))
  );

  /** Liste des modèles disponibles sur l'API Ollama Cloud (utilisée par SellMatch IA). */
  public readonly OllamaCloudModels: WritableSignal<OllamaModel[]> = signal<OllamaModel[]>([]);

  /** Indique si la connexion à l'API Ollama Cloud est en cours. */
  public readonly IsOllamaCloudConnecting: WritableSignal<boolean> = signal<boolean>(false);

  /** Message d'erreur de connexion à l'API Ollama Cloud. */
  public readonly OllamaCloudConnectionError: WritableSignal<string | null> = signal<string | null>(null);

  /** Options formatées pour le select de modèles Ollama Cloud. */
  public readonly OllamaCloudModelOptions: Signal<IInputOption[]> = computed<IInputOption[]>(() =>
    this.OllamaCloudModels().map((pModel: OllamaModel) => ({ Value: pModel.Name, Label: pModel.Name }))
  );

  /** Computed : indique si le champ clé API doit être visible pour le fournisseur sélectionné. */
  public readonly IsApiKeyVisible: Signal<boolean> = computed<boolean>(() => this.Provider() !== 'ollama-local');

  /** Computed : classe de modificateur host selon le mode embedded. */
  public readonly IsEmbedded: Signal<boolean> = computed<boolean>(() => this._EmbeddedSignal());

  /** Signal interne miroir de l'input Embedded pour réactivité OnPush. */
  private readonly _EmbeddedSignal: WritableSignal<boolean> = signal<boolean>(false);

  /** Types de fichiers acceptés pour l'upload (pour app-upload-file). */
  public readonly FileTypes: FileTypeConfig[] = [
    { type: 'document', label: 'Document', extensions: ['pdf', 'txt', 'docx', 'md', 'jpg', 'jpeg', 'png', 'webp'], maxSize: 10 }
  ];

  /** Thème d'affichage de la zone d'upload. */
  public readonly UploadTheme: WritableSignal<'compact-inline' | 'card-dropzone' | 'minimal-chip' | 'agent-message-dropzone'> = signal<'compact-inline' | 'card-dropzone' | 'minimal-chip' | 'agent-message-dropzone'>('compact-inline');

  /** Message d'erreur affiché (null si aucun). */
  public readonly Error: WritableSignal<string | null> = signal<string | null>(null);

  /** Indique si la connexion SignalR est active. */
  public readonly IsConnected: WritableSignal<boolean> = signal<boolean>(false);

  /** Dernier résultat complet d'un tour agent (pour l'affichage des détails d'usage). */
  public readonly LastResult: WritableSignal<CrmAgentTurnResult | null> = signal<CrmAgentTurnResult | null>(null);

  /** Demande d'approbation d'actions mutantes en attente (null si aucune). */
  public readonly PendingApproval: WritableSignal<CrmAgentApprovalRequest | null> = signal<CrmAgentApprovalRequest | null>(null);

  /** Indices des actions sélectionnées/approuvées par l'utilisateur (sélection granulaire ligne par ligne). */
  public readonly ApprovedActionIndices: WritableSignal<Set<number>> = signal<Set<number>>(new Set<number>());

  /** Indices des actions dont la grille d'arguments est dépliée (mode "voir les détails"). */
  public readonly ExpandedActionIndices: WritableSignal<Set<number>> = signal<Set<number>>(new Set<number>());

  /** Indique si la grille d'apercu global (toutes actions agregees) est visible dans la carte d'approbation. */
  public readonly ShowAggregatePreview: WritableSignal<boolean> = signal<boolean>(false);

  /** Computed : nombre d'actions mutantes en attente d'approbation (pour le badge header). */
  public readonly PendingActionsCount: Signal<number> = computed<number>(() => this.PendingApproval()?.Actions.length ?? 0);

  /** Computed : nombre d'actions actuellement sélectionnées (pour le libellé du bouton confirmer). */
  public readonly SelectedActionsCount: Signal<number> = computed<number>(() => this.ApprovedActionIndices().size);

  /** Indique si le champ de feedback de refus est visible (carte d'approbation). */
  public readonly ShowRejectionInput: WritableSignal<boolean> = signal<boolean>(false);

  /** Feedback de refus saisi par l'utilisateur (transmis au backend RespondApprovalAsync). */
  public readonly RejectionFeedback: WritableSignal<string> = signal<string>('');

  /** Indique que le dernier message copié (feedback visuel temporaire, id de bulle). */
  public readonly CopiedBubbleId: WritableSignal<string | null> = signal<string | null>(null);

  /** Computed : libellé du fichier sélectionné. */
  public readonly FileNameLabel: Signal<string> = computed<string>(() => this.SelectedFile()?.name ?? '');

  /** Computed : total des tokens (entrée + sortie) du dernier tour. */
  public readonly TotalTokens: Signal<number> = computed<number>(() => {
    const lR: CrmAgentTurnResult | null = this.LastResult();
    return lR ? lR.TotalPromptTokens + lR.TotalCompletionTokens : 0;
  });

  /** Computed : libellé de la durée du dernier tour (secondes si > 1s, sinon ms). */
  public readonly DurationLabel: Signal<string> = computed<string>(() => {
    const lR: CrmAgentTurnResult | null = this.LastResult();
    if (!lR) return '';
    const lMs: number = lR.DurationMs;
    if (lMs >= 1000) return `${(lMs / 1000).toFixed(1)}s`;
    return `${lMs}ms`;
  });

  /** Computed : libellé des outils MCP utilisés (distincts, séparés par virgule). */
  public readonly ToolsUsedLabel: Signal<string> = computed<string>(() => {
    const lR: CrmAgentTurnResult | null = this.LastResult();
    // - cm - ToolNames peut être undefined au runtime (backend omet le champ si aucun outil)
    const lNames: string[] = lR?.ToolNames ?? [];
    if (lNames.length === 0) return 'aucun';
    const lDistinct: string[] = Array.from(new Set(lNames));
    return lDistinct.join(', ');
  });

  /** Computed : toutes les diffs du tour courant (parsées depuis les étapes ToolResult). */
  /** État d'acceptation de chaque diff (indexé par Summary). */
  private readonly _DiffStates: WritableSignal<Map<string, 'pending' | 'accepted' | 'rejected'>> = signal<Map<string, 'pending' | 'accepted' | 'rejected'>>(new Map());

  public readonly TourDiffs: Signal<DiffRecord[]> = computed<DiffRecord[]>(() => {
    const lR: CrmAgentTurnResult | null = this.LastResult();
    if (!lR?.Steps) return [];
    const lDiffs: DiffRecord[] = [];
    for (const lStep of lR.Steps) {
      // - cm - On ne parse que les résultats d'outils MCP contenant une diff
      if (lStep.Type !== 'ToolResult') continue;
      const lDiff: DiffRecord | null = this.ParseDiff(lStep.ResultJson);
      if (lDiff) lDiffs.push(lDiff);
    }
    return lDiffs;
  });
  //#endregion

  /** Clé de stockage local des préférences d'import IA (partagée avec crm-ai-import). */
  private static readonly _PreferencesStorageKey: string = 'crm-ai-import-preferences';

  /** Clé de stockage local des conversations agent CRM. */
  private static readonly _ConversationsStorageKey: string = 'crm-agent-conversations';

  /** Clé de stockage local des dimensions du panneau chat. */
  private static readonly _PanelSizeStorageKey: string = 'crm-agent-panel-size';

  /** Clé de stockage local du thème de la zone d'upload du chat agent CRM. */
  private static readonly _UploadThemeStorageKey: string = 'crm-agent-upload-theme';

  /** Map kind -> colonnes de la grille d'import (kind : transactions, locations, contacts, etc.). */
  private readonly _ImportColumns: Map<string, GridColumn<unknown>[]> = new Map<string, GridColumn<unknown>[]>();

  //#region Lifecycle
  /**
   * Initialisation : connexion au hub SignalR, chargement des préférences IA, dimensions, thème d'upload et historique.
   */
  public async ngOnInit(): Promise<void> {
    this.LoadPreferences();
    this.LoadPanelSize();
    this.LoadUploadTheme();
    this.LoadConversations();
    this._ImportColumns.clear();
    for (const [lKey, lValue] of this.BuildImportGridColumns()) {
      this._ImportColumns.set(lKey, lValue);
    }
    this.SetupHubHandlers();
    try {
      await this._Hub.startConnection();
      this.IsConnected.set(true);
    } catch (lError: unknown) {
      this.IsConnected.set(false);
      // - cm - On n'affiche pas d'erreur bloquante : la bulle reste utilisable en mode synchrone
      console.warn('CrmAgentChat : connexion SignalR échouée', lError);
    }
  }

  /**
   * Destruction : ferme la connexion SignalR et désabonne.
   */
  public ngOnDestroy(): void {
    this._Subscriptions.forEach((pSub: Subscription) => pSub.unsubscribe());
    this._Subscriptions.length = 0;
    this._Hub.stopConnection();
  }
  //#endregion

  //#region Methods
  /**
   * Charge les préférences IA (provider/modèle/endpoint) partagées avec l'onglet Import IA.
   * Lit localStorage sous la clé `crm-ai-import-preferences` pour récupérer le modèle choisi par l'utilisateur.
   */
  public LoadPreferences(): void {
    if (typeof localStorage === 'undefined') return;

    const lRaw: string | null = localStorage.getItem(CrmAgentChatComponent._PreferencesStorageKey);
    if (!lRaw) return;

    try {
      const lParsed: { Provider?: string; Model?: string; EndpointUrl?: string } = JSON.parse(lRaw) as { Provider?: string; Model?: string; EndpointUrl?: string };
      const lProviderValue: string = lParsed.Provider ?? '';
      const lProvider: AiProviderOption | undefined = this.Providers.find((pP: AiProviderOption) => pP.Value === lProviderValue);
      if (lProvider) {
        this.Provider.set(lProvider.Value);
        this.Model.set(lParsed.Model ?? lProvider.DefaultModel);
      } else if (lProviderValue) {
        this.Provider.set(lProviderValue);
        this.Model.set(lParsed.Model ?? this.Providers[0].DefaultModel);
      }
      if (lParsed.EndpointUrl !== undefined) {
        this.EndpointUrl.set(lParsed.EndpointUrl);
      }
    } catch (lError: unknown) {
      console.warn('CrmAgentChat : erreur lors du chargement des préférences IA', lError);
    }
  }

  /**
   * Persiste les préférences IA (provider/modèle/endpoint) dans le localStorage partagé.
   * La clé API n'est jamais sauvegardée (sécurité).
   */
  public SavePreferences(): void {
    if (typeof localStorage === 'undefined') return;
    const lPayload: { Provider: string; Model: string; EndpointUrl: string } = { Provider: this.Provider(), Model: this.Model(), EndpointUrl: this.EndpointUrl() };
    localStorage.setItem(CrmAgentChatComponent._PreferencesStorageKey, JSON.stringify(lPayload));
  }

  /**
   * Bascule l'affichage du panneau de configuration (provider/modèle/endpoint/apikey).
   */
  public ToggleSettings(): void {
    this.ShowSettings.update((pShow: boolean) => !pShow);
  }

  /**
   * Met à jour le modèle par défaut quand le fournisseur change.
   * @param pProvider Le fournisseur sélectionné
   */
  public OnProviderChange(pProvider: string): void {
    this.Provider.set(pProvider);
    const lProvider: AiProviderOption | undefined = this.Providers.find((pP: AiProviderOption) => pP.Value === pProvider);
    if (lProvider) {
      this.Model.set(lProvider.DefaultModel);
    }

    // - cm - Réinitialise l'état Ollama local à chaque changement de fournisseur
    this.OllamaModels.set([]);
    this.OllamaConnectionError.set(null);

    // - cm - Réinitialise l'état Ollama Cloud (SellMatch IA) à chaque changement de fournisseur
    this.OllamaCloudModels.set([]);
    this.OllamaCloudConnectionError.set(null);

    // - cm - Configuration de l'endpoint selon le provider
    if (pProvider === 'ollama-local') {
      this.EndpointUrl.set('http://localhost:11434');
      this.ApiKey.set('');
    } else {
      this.EndpointUrl.set('');
    }

    this.SavePreferences();
    this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_provider_change', 'tracking'), { provider: pProvider });
  }

  /**
   * Se connecte à l'instance Ollama locale et récupère la liste des modèles.
   * Utilise l'endpoint /api/tags et un timeout de 5 secondes.
   */
  public async OnConnectOllamaLocal(): Promise<void> {
    this.IsOllamaConnecting.set(true);
    this.OllamaConnectionError.set(null);

    const lBaseUrl: string = this.EndpointUrl().trim() || 'http://127.0.0.1:11434';
    const lUrl: string = `${lBaseUrl.replace(/\/$/, '')}/api/tags`;

    try {
      const lController: AbortController = new AbortController();
      const lTimeoutId: ReturnType<typeof setTimeout> = setTimeout((): void => lController.abort(), 5000);

      const lResponse: Response = await fetch(lUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: lController.signal
      });

      clearTimeout(lTimeoutId);

      if (!lResponse.ok) {
        throw new Error(`Ollama a répondu avec le statut ${lResponse.status}.`);
      }

      const lData: { models?: Array<{ name: string }> } = await lResponse.json();
      const lModels: OllamaModel[] = (lData.models ?? []).map((pModel: { name: string }): OllamaModel => ({ Name: pModel.name }));
      this.OllamaModels.set(lModels);

      if (lModels.length === 0) {
        this.OllamaConnectionError.set('Aucun modèle n\'est disponible sur Ollama Local. Vérifiez qu\'un modèle est bien téléchargé.');
      } else if (!lModels.some((pModel: OllamaModel): boolean => pModel.Name === this.Model())) {
        this.Model.set(lModels[0].Name);
      }

      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_ollama_local_connect', 'tracking'), { modelCount: lModels.length });
    } catch (pErr: unknown) {
      this.OllamaModels.set([]);
      this.OllamaConnectionError.set('Impossible de se connecter à Ollama Local. Vérifiez que Ollama est lancé et que le port 11434 est accessible.');
      console.error(pErr);
      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_ollama_local_connect_error', 'tracking'));
    } finally {
      this.IsOllamaConnecting.set(false);
    }
  }

  /**
   * Charge les modèles disponibles sur l'IA SellMatch (Ollama Cloud avec clé Infisical côté backend).
   * L'utilisateur n'a pas besoin de fournir de clé API ni d'endpoint URL.
   */
  public async OnConnectSellMatch(): Promise<void> {
    this.IsOllamaCloudConnecting.set(true);
    this.OllamaCloudConnectionError.set(null);

    try {
      const lResponse: Response = await fetch(`${environment.apiUrl}/ollama-cloud/list-models`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!lResponse.ok) {
        const lError: { message?: string } = await lResponse.json().catch((): { message?: string } => ({}));
        throw new Error(lError.message ?? `L'API a répondu avec le statut ${lResponse.status}.`);
      }

      const lData: Array<{ name: string; size?: number; details?: string }> = await lResponse.json();
      const lModels: OllamaModel[] = lData.map((pModel: { name: string; size?: number; details?: string }): OllamaModel => ({ Name: pModel.name }));

      this.OllamaCloudModels.set(lModels);

      if (lModels.length === 0) {
        this.OllamaCloudConnectionError.set('Aucun modèle disponible.');
      } else if (!lModels.some((pModel: OllamaModel): boolean => pModel.Name === this.Model())) {
        this.Model.set(lModels[0].Name);
      }

      this.SavePreferences();
      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_sellmatch_connect', 'tracking'), { modelCount: lModels.length });
    } catch (pErr: unknown) {
      this.OllamaCloudModels.set([]);
      const lMessage: string = pErr instanceof Error ? pErr.message : 'Erreur inconnue';
      this.OllamaCloudConnectionError.set(`Impossible de charger les modèles. ${lMessage}`);
      console.error(pErr);
      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_sellmatch_connect_error', 'tracking'));
    } finally {
      this.IsOllamaCloudConnecting.set(false);
    }
  }
  /**
   * Bascule l'ouverture/fermeture du panneau chat.
   * Recharge les préférences IA à l'ouverture pour rester synchro avec l'onglet IA.
   */
  public TogglePanel(): void {
    if (!this.IsOpen()) {
      this.LoadPreferences();
    }
    this.IsOpen.update((pOpen: boolean) => !pOpen);
  }

  /**
   * Bascule le mode plein écran du panneau chat.
   */
  public ToggleFullscreen(): void {
    this.IsFullscreen.update((pFull: boolean) => !pFull);
  }

  /**
   * Bascule l'affichage du panneau latéral d'historique des conversations.
   */
  public ToggleHistory(): void {
    this.ShowHistory.update((pShow: boolean) => !pShow);
  }

  /**
   * Démarre une nouvelle conversation : réinitialise la session, les bulles et le résultat.
   * L'historique latéral reste visible (l'utilisateur peut voir l'historique en continu).
   */
  public NewConversation(): void {
    this._SessionId = null;
    this.Bubbles.set([]);
    this.LastResult.set(null);
    this.Error.set(null);
    this.IsBusy.set(false);
    // - cm - On ne ferme pas l'historique : l'utilisateur veut le voir en permanence en mode full-page
    this.SelectedSessionId.set(null);
  }

  /**
   * Restaure une conversation depuis l'historique : reprend la session agent et
   * réaffiche l'intégralité des bulles (prompt utilisateur, étapes agent, message final, erreurs).
   * L'historique latéral reste ouvert pour permettre la navigation continue.
   * @param pConversation Le résumé de conversation à restaurer
   */
  public SelectConversation(pConversation: ConversationSummary): void {
    // - cm - Reprend la session agent existante pour permettre la suite multi-tour
    this._SessionId = pConversation.SessionId;
    this.SelectedSessionId.set(pConversation.SessionId);

    // [cm] Restauration fidèle des bulles : on reconstruit avec de nouveaux Ids pour éviter tout conflit de tracking avec les bulles courantes.
    if (pConversation.Bubbles && pConversation.Bubbles.length > 0) {
      const lRestored: ChatBubble[] = pConversation.Bubbles.map((pBubble: ChatBubble): ChatBubble => ({
        Id: this.GenId(),
        Role: pBubble.Role,
        Content: pBubble.Content,
        Step: pBubble.Step,
        // - cm - On ne restaure jamais l'état Pending (transient, lié au tour en cours)
        Pending: false
      }));
      this.Bubbles.set(lRestored);
    } else {
      // - cm - Compatibilité ascendante : anciennes conversations sans Bubbles (prompt + message final)
      this.Bubbles.set([
        { Id: this.GenId(), Role: 'user', Content: pConversation.Prompt ?? pConversation.Title },
        { Id: this.GenId(), Role: 'assistant', Content: pConversation.FinalMessage }
      ]);
    }

    // - cm - Restauration du résultat complet pour le panneau d'usage et les diffs du tour
    this.LastResult.set(pConversation.Result ?? null);
    this.Error.set(null);
    this.IsBusy.set(false);
    // - cm - On garde l'historique visible (l'utilisateur veut voir l'historique pendant le chat)
    this.ScrollToEnd();
  }

  /**
   * Charge les dimensions du panneau depuis localStorage.
   */
  public LoadPanelSize(): void {
    if (typeof localStorage === 'undefined') return;
    const lRaw: string | null = localStorage.getItem(CrmAgentChatComponent._PanelSizeStorageKey);
    if (!lRaw) return;
    try {
      const lParsed = JSON.parse(lRaw) as { Width?: number; Height?: number };
      if (lParsed.Width && lParsed.Width >= 320) this.PanelWidth.set(lParsed.Width);
      if (lParsed.Height && lParsed.Height >= 400) this.PanelHeight.set(lParsed.Height);
    } catch (lError: unknown) {
      console.warn('CrmAgentChat : erreur lors du chargement des dimensions du panneau', lError);
    }
  }

  /**
   * Sauvegarde les dimensions du panneau dans localStorage.
   */
  public SavePanelSize(): void {
    if (typeof localStorage === 'undefined') return;
    const lPayload = { Width: this.PanelWidth(), Height: this.PanelHeight() };
    localStorage.setItem(CrmAgentChatComponent._PanelSizeStorageKey, JSON.stringify(lPayload));
  }

  /**
   * Charge le thème de la zone d'upload depuis localStorage.
   */
  public LoadUploadTheme(): void {
    if (typeof localStorage === 'undefined') return;
    const lRaw: string | null = localStorage.getItem(CrmAgentChatComponent._UploadThemeStorageKey);
    const lValidThemes: Array<'compact-inline' | 'card-dropzone' | 'minimal-chip' | 'agent-message-dropzone'> = ['compact-inline', 'card-dropzone', 'minimal-chip', 'agent-message-dropzone'];
    if (lRaw && lValidThemes.includes(lRaw as any)) {
      this.UploadTheme.set(lRaw as 'compact-inline' | 'card-dropzone' | 'minimal-chip' | 'agent-message-dropzone');
    }
  }

  /**
   * Sauvegarde le thème de la zone d'upload dans localStorage.
   */
  public SaveUploadTheme(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CrmAgentChatComponent._UploadThemeStorageKey, this.UploadTheme());
  }

  /**
   * Bascule le thème de la zone d'upload vers le suivant dans la liste.
   */
  public SwitchUploadTheme(): void {
    const lThemes: Array<'compact-inline' | 'card-dropzone' | 'minimal-chip' | 'agent-message-dropzone'> = ['compact-inline', 'card-dropzone', 'minimal-chip', 'agent-message-dropzone'];
    const lCurrentIndex: number = lThemes.indexOf(this.UploadTheme());
    const lNextIndex: number = (lCurrentIndex + 1) % lThemes.length;
    this.UploadTheme.set(lThemes[lNextIndex]);
    this.SaveUploadTheme();
  }

  /**
   * Démarre le redimensionnement du panneau (mousedown sur la poignée).
   * @param pEvent L'événement souris
   */
  public OnResizeStart(pEvent: MouseEvent): void {
    if (this.IsFullscreen()) return;
    pEvent.preventDefault();
    const lStartX: number = pEvent.clientX;
    const lStartY: number = pEvent.clientY;
    const lStartWidth: number = this.PanelWidth();
    const lStartHeight: number = this.PanelHeight();

    const lOnMove = (pMoveEvent: MouseEvent): void => {
      const lNewWidth: number = Math.max(320, Math.min(window.innerWidth - 40, lStartWidth + (pMoveEvent.clientX - lStartX)));
      const lNewHeight: number = Math.max(400, Math.min(window.innerHeight - 40, lStartHeight - (pMoveEvent.clientY - lStartY)));
      this.PanelWidth.set(lNewWidth);
      this.PanelHeight.set(lNewHeight);
    };

    const lOnUp = (): void => {
      document.removeEventListener('mousemove', lOnMove);
      document.removeEventListener('mouseup', lOnUp);
      this.SavePanelSize();
    };

    document.addEventListener('mousemove', lOnMove);
    document.addEventListener('mouseup', lOnUp);
  }

  /**
   * Charge l'historique des conversations depuis localStorage.
   */
  public LoadConversations(): void {
    if (typeof localStorage === 'undefined') return;
    const lRaw: string | null = localStorage.getItem(CrmAgentChatComponent._ConversationsStorageKey);
    if (!lRaw) return;
    try {
      const lParsed = JSON.parse(lRaw) as ConversationSummary[];
      if (Array.isArray(lParsed)) {
        this.Conversations.set(lParsed);
      }
    } catch (lError: unknown) {
      console.warn('CrmAgentChat : erreur lors du chargement de l\'historique des conversations', lError);
    }
  }

  /**
   * Sauvegarde une conversation terminée dans l'historique (localStorage).
   * Stocke l'intégralité des bulles (user/assistant/step/error) pour une restauration fidèle.
   * Gère le quota localStorage (~5 Mo) en supprimant les plus anciennes conversations si nécessaire.
   * @param pResult Le résultat complet du tour agent
   * @param pPrompt Le prompt utilisateur initial
   */
  public SaveConversation(pResult: CrmAgentTurnResult, pPrompt: string): void {
    if (typeof localStorage === 'undefined') return;

    // - cm - Snapshot profond des bulles courantes en retirant l'état transient Pending
    const lBubbles: ChatBubble[] = this.Bubbles().map((pBubble: ChatBubble): ChatBubble => ({
      Id: pBubble.Id,
      Role: pBubble.Role,
      Content: pBubble.Content,
      Step: pBubble.Step,
      Pending: false
    }));

    const lSummary: ConversationSummary = {
      SessionId: pResult.SessionId,
      Title: pPrompt.slice(0, 80),
      Prompt: pPrompt,
      FinalMessage: pResult.FinalMessage,
      Bubbles: lBubbles,
      Result: pResult,
      CreatedAt: new Date().toISOString(),
      ToolCallCount: pResult.ToolCallCount,
      TotalTokens: pResult.TotalPromptTokens + pResult.TotalCompletionTokens
    };

    // - cm - Insertion en tête, plafonnée à 50 conversations
    this.Conversations.update((pConvos: ConversationSummary[]) => [lSummary, ...pConvos].slice(0, 50));
    this.PersistConversations();
  }

  /**
   * Persiste l'historique des conversations dans localStorage avec gestion du quota.
   * En cas de quota dépassé (QuotaExceededError), supprime les conversations les plus anciennes
   * et réessaie jusqu'à réussite ou liste vide.
   */
  private PersistConversations(): void {
    if (typeof localStorage === 'undefined') return;
    let lConvos: ConversationSummary[] = this.Conversations();
    const lKey: string = CrmAgentChatComponent._ConversationsStorageKey;
    try {
      localStorage.setItem(lKey, JSON.stringify(lConvos));
    } catch (lError: unknown) {
      // - cm - Quota dépassé : on retire les plus anciennes (fin du tableau) et on réessaie
      console.warn('CrmAgentChat : quota localStorage atteint, nettoyage des anciennes conversations', lError);
      while (lConvos.length > 1) {
        lConvos = lConvos.slice(0, -1);
        try {
          localStorage.setItem(lKey, JSON.stringify(lConvos));
          this.Conversations.set(lConvos);
          return;
        } catch (lRetryError: unknown) {
          // - cm - Toujours trop volumineux, on continue de nettoyer
          void lRetryError;
        }
      }
      // - cm - Dernier recours : on persiste la dernière conversation seule
      try {
        localStorage.setItem(lKey, JSON.stringify(lConvos));
        this.Conversations.set(lConvos);
      } catch (lFinalError: unknown) {
        console.error('CrmAgentChat : impossible de persister l\'historique même après nettoyage', lFinalError);
      }
    }
  }

  /**
   * Supprime une conversation de l'historique.
   * @param pSessionId L'identifiant de la session à supprimer
   */
  public DeleteConversation(pSessionId: string): void {
    this.Conversations.update((pConvos: ConversationSummary[]) => pConvos.filter((pC: ConversationSummary) => pC.SessionId !== pSessionId));
    this.PersistConversations();
  }

  /**
   * Callback appelé par app-upload-file quand un fichier est sélectionné.
   * @param pFile Le fichier sélectionné (ou null si retiré)
   */
  public OnFileSelected(pFile: File): void {
    this.SelectedFile.set(pFile);
  }

  /**
   * Callback appelé par app-upload-file en cas d'erreur d'upload.
   * @param pError Le message d'erreur
   */
  public OnUploadError(pError: string): void {
    this.Error.set(pError);
  }

  /**
   * Retire le fichier sélectionné.
   */
  public ClearFile(): void {
    this.SelectedFile.set(null);
  }

  /**
   * Construit l'historique des messages (user + assistant) depuis les bulles courantes.
   * Envoy au backend  chaque message pour reconstruire le contexte LLM si la session a t purge.
   * @returns La liste des messages d'historique (sans le message courant)
   */
  private BuildHistory(): HistoryMessage[] {
    const lBubbles: ChatBubble[] = this.Bubbles();
    const lHistory: HistoryMessage[] = [];
    for (const lBubble of lBubbles) {
      // - cm - On ne garde que les messages user et assistant avec du contenu textuel
      if ((lBubble.Role === 'user' || lBubble.Role === 'assistant') && lBubble.Content && lBubble.Content.trim()) {
        // - cm - On ignore les bulles "en cours" (Pending, contenu vide ou transitoire)
        if (lBubble.Pending) continue;
        lHistory.push({
          Role: lBubble.Role === 'user' ? 'User' : 'Assistant',
          Content: lBubble.Content
        });
      }
    }
    return lHistory;
  }

  /**
   * Envoie le prompt (+ fichier optionnel) à l'agent CRM.
   */
  public async SendPrompt(): Promise<void> {
    const lPrompt: string = this.Prompt().trim();
    if (!lPrompt || this.IsBusy()) return;

    this.Error.set(null);
    this.IsBusy.set(true);
    // - cm - RAZ du rsultat prcdent (les dtails d'usage seront mis  jour  la fin du tour)
    this.LastResult.set(null);
    // - cm - Stockage du prompt pour le titre de conversation dans l'historique
    this._LastPrompt = lPrompt;

    // - cm - Ajout de la bulle utilisateur
    this.AddBubble({ Id: this.GenId(), Role: 'user', Content: lPrompt });

    // - cm - Ajout d'une bulle "agent en cours" qui sera alimentée par les étapes SignalR
    const lPendingId: string = this.GenId();
    this.AddBubble({ Id: lPendingId, Role: 'assistant', Content: '', Pending: true });

    const lOptions: CrmAgentChatOptions = {
      Provider: this.Provider(),
      Model: this.Model(),
      EndpointUrl: this.EndpointUrl() || undefined,
      ApiKey: this.ApiKey() || undefined,
      SessionId: this._SessionId ?? undefined,
      Context: this.PageContext ?? undefined,
      // - cm - Envoi de l'historique pour reconstruire le contexte si la session backend a t purge
      History: this.BuildHistory()
    };

    try {
      // [cm] Dmarrage du tour agent via WebSocket (hub CrmAgentHub.StartChatAsync). Le hub ajoute automatiquement la connexion au group de la session (auto-join).
      const lResponse: { SessionId: string } = await this._Hub.startChat(lPrompt, this.SelectedFile(), lOptions);
      this._SessionId = lResponse.SessionId;
    } catch (lError: unknown) {
      this.IsBusy.set(false);
      this.RemoveBubble(lPendingId);
      const lMessage: string = this.ExtractErrorMessage(lError);
      this.Error.set(lMessage);
      this.AddBubble({ Id: this.GenId(), Role: 'error', Content: lMessage });
    } finally {
      this.Prompt.set('');
      this.SelectedFile.set(null);
    }
  }

  /**
   * Branche les handlers sur les observables du hub agent CRM.
   */
  private SetupHubHandlers(): void {
    // - cm - Démarrage d'un tour agent (aucune action : les étapes arrivent via AgentStep)
    this._Subscriptions.push(
      this._Hub.agentStarted$.subscribe(() => {
        // - cm - No-op volontaire
      })
    );

    // - cm - Étape agent (tool call / résultat / LLM / erreur)
    this._Subscriptions.push(
      this._Hub.agentStep$.subscribe(({ sessionId: pSessionId, step: pStep }: { sessionId: string; step: CrmAgentStepRecord }) => {
        if (this._SessionId && pSessionId !== this._SessionId) return;
        this.AddBubble({ Id: this.GenId(), Role: pStep.Type === 'Error' ? 'error' : 'step', Step: pStep });
        this.ScrollToEnd();
      })
    );

    // - cm - Message final de l'agent
    this._Subscriptions.push(
      this._Hub.agentMessage$.subscribe(({ sessionId: pSessionId, message: pMessage }: { sessionId: string; message: string }) => {
        if (this._SessionId && pSessionId !== this._SessionId) return;
        // - cm - Extraction des suggestions interactives (ligne SUGGESTIONS:...) du message
        const { CleanText: lCleanText, Suggestions: lSuggestions } = this.ExtractSuggestions(pMessage);
        // - cm - Remplace la bulle pending par le message final (texte nettoyé + suggestions)
        this.Bubbles.update((pBubbles: ChatBubble[]) => pBubbles.map((pBubble: ChatBubble) =>
          pBubble.Pending ? { ...pBubble, Pending: false, Content: lCleanText, Suggestions: lSuggestions } : pBubble
        ));
        this.ScrollToEnd();
      })
    );

    // - cm - Erreur agent
    this._Subscriptions.push(
      this._Hub.agentError$.subscribe(({ sessionId: pSessionId, error: pError }: { sessionId: string; error: string }) => {
        if (this._SessionId && pSessionId !== this._SessionId) return;
        this.Error.set(pError);
        this.AddBubble({ Id: this.GenId(), Role: 'error', Content: pError });
        this.ScrollToEnd();
      })
    );

    // - cm - Fin d'un tour agent
    this._Subscriptions.push(
      this._Hub.agentDone$.subscribe(({ sessionId: pSessionId, result: pResult }: { sessionId: string; result: CrmAgentTurnResult }) => {
        if (this._SessionId && pSessionId !== this._SessionId) return;
        this.IsBusy.set(false);
        // - cm - Sécurité : RAZ de toute approbation en attente et de la sélection (le tour est terminé)
        this.PendingApproval.set(null);
        this.ApprovedActionIndices.set(new Set<number>());
        this.ShowRejectionInput.set(false);
        // - cm - Normalisation ToolNames : le backend peut omettre le champ (undefined) si aucun outil
        if (!pResult.ToolNames) pResult.ToolNames = [];
        // - cm - Stockage du rsultat complet pour l'affichage des dtails d'usage (tokens, MCP, itrations)
        this.LastResult.set(pResult);
        // - cm - Sauvegarde de la conversation dans l'historique (localStorage)
        this.SaveConversation(pResult, this._LastPrompt);
        // - cm - S'assurer qu'une bulle assistant finale existe avec le message final
        const { CleanText: lDoneClean, Suggestions: lDoneSuggestions } = this.ExtractSuggestions(pResult.FinalMessage);
        this.Bubbles.update((pBubbles: ChatBubble[]): ChatBubble[] => {
          const lHasFinal: boolean = pBubbles.some((pB: ChatBubble) => pB.Role === 'assistant' && !pB.Pending && pB.Content === lDoneClean);
          if (!lHasFinal) {
            return [...pBubbles.filter((pB: ChatBubble) => !pB.Pending), { Id: this.GenId(), Role: pResult.HasError ? 'error' : 'assistant', Content: lDoneClean, Suggestions: lDoneSuggestions }];
          }
          // - cm - Synchronise aussi les suggestions sur la bulle finale existante
          return pBubbles.map((pB: ChatBubble): ChatBubble =>
            pB.Role === 'assistant' && !pB.Pending && pB.Content === lDoneClean
              ? { ...pB, Suggestions: lDoneSuggestions }
              : pB
          ).filter((pB: ChatBubble) => !pB.Pending);
        });
        this.ScrollToEnd();
      })
    );

    // - cm - Demande d'approbation d'actions mutantes (porte d'approbation utilisateur)
    this._Subscriptions.push(
      this._Hub.agentApprovalRequest$.subscribe(({ sessionId: pSessionId, request: pRequest }: { sessionId: string; request: CrmAgentApprovalRequest }) => {
        if (this._SessionId && pSessionId !== this._SessionId) return;
        // - cm - L'agent demande l'approbation d'actions mutantes : on expose la demande et on ajoute une bulle dédiée
        this.PendingApproval.set(pRequest);
        // - cm - Initialisation : toutes les actions sont sélectionnées par défaut (l'utilisateur peut décocher)
        const lInitialSelection: Set<number> = new Set<number>(pRequest.Actions.map((pA: CrmAgentPlannedAction, pIdx: number): number => pIdx));
        this.ApprovedActionIndices.set(lInitialSelection);
        // - cm - Repli les details d'arguments de l'ancienne demande au cas ou
        this.ExpandedActionIndices.set(new Set<number>());
        this.ShowRejectionInput.set(false);
        this.RejectionFeedback.set('');
        this.AddBubble({ Id: this.GenId(), Role: 'approval', Approval: pRequest });
        this.ScrollToEnd();
      })
    );
  }

  /**
   * Ajoute une bulle au chat.
   * @param pBubble La bulle à ajouter.
   */
  private AddBubble(pBubble: ChatBubble): void {
    this.Bubbles.update((pBubbles: ChatBubble[]) => [...pBubbles, pBubble]);
  }

  /**
   * Bascule la sélection d'une action individuelle (checkbox ligne par ligne).
   * @param pIndex L'index (0-based) de l'action dans la liste Actions
   */
  public ToggleActionApproval(pIndex: number): void {
    const lCurrent: Set<number> = new Set<number>(this.ApprovedActionIndices());
    if (lCurrent.has(pIndex)) {
      lCurrent.delete(pIndex);
    } else {
      lCurrent.add(pIndex);
    }
    this.ApprovedActionIndices.set(lCurrent);
  }

  /**
   * Sélectionne toutes les actions (tout approuver).
   */
  public ApproveAllActions(): void {
    const lRequest: CrmAgentApprovalRequest | null = this.PendingApproval();
    if (!lRequest) return;
    this.ApprovedActionIndices.set(new Set<number>(lRequest.Actions.map((pA: CrmAgentPlannedAction, pIdx: number): number => pIdx)));
  }

  /**
   * Désélectionne toutes les actions (tout refuser).
   */
  public RejectAllActions(): void {
    this.ApprovedActionIndices.set(new Set<number>());
  }

  /**
   * Traduit un nom d'outil MCP technique en français lisible.
   * @param pToolName Le nom technique de l'outil (ex: CreateContact, ListProperties)
   * @returns Le libellé français (ex: "Créer un contact", "Lister les biens")
   */
  public TranslateToolName(pToolName: string): string {
    if (!pToolName) return '';
    const lTranslations: Record<string, string> = {
      'CreateContact': 'Créer un contact',
      'ListContacts': 'Lister les contacts',
      'CreateProperty': 'Créer un bien',
      'ListProperties': 'Lister les biens',
      'CreateTransaction': 'Créer une affaire',
      'ListTransactions': 'Lister les affaires',
      'CreateRecherche': 'Créer une recherche',
      'ListRecherches': 'Lister les recherches',
      'CreateTache': 'Créer une tâche',
      'ListTaches': 'Lister les tâches',
      'CreateRecrutement': 'Créer un recrutement',
      'ListRecrutements': 'Lister les recrutements',
      'CreateHistoriqueEchange': 'Créer un échange',
      'ListHistoriqueEchanges': 'Lister les échanges',
      'CreateAlerte': 'Créer une alerte',
      'ListAlertes': 'Lister les alertes',
      'CreateObjectif': 'Créer un objectif',
      'ListObjectifs': 'Lister les objectifs',
      'CreateProspection': 'Créer une prospection',
      'ListProspections': 'Lister les prospections',
      'CreatePropertyHistoriquePrix': 'Créer un historique de prix',
      'ListPropertyHistoriquePrix': 'Lister l\'historique des prix',
      'UpdateContact': 'Modifier un contact',
      'DeleteContact': 'Supprimer un contact',
      'UpdateProperty': 'Modifier un bien',
      'DeleteProperty': 'Supprimer un bien',
      'UpdateTransaction': 'Modifier une affaire',
      'DeleteTransaction': 'Supprimer une affaire',
      'UpdateRecherche': 'Modifier une recherche',
      'DeleteRecherche': 'Supprimer une recherche',
      'UpdateTache': 'Modifier une tâche',
      'DeleteTache': 'Supprimer une tâche',
      'UpdateRecrutement': 'Modifier un recrutement',
      'DeleteRecrutement': 'Supprimer un recrutement',
      'UpdateHistoriqueEchange': 'Modifier un échange',
      'DeleteHistoriqueEchange': 'Supprimer un échange',
      'UpdateAlerte': 'Modifier une alerte',
      'DeleteAlerte': 'Supprimer une alerte',
      'UpdateObjectif': 'Modifier un objectif',
      'DeleteObjectif': 'Supprimer un objectif',
      'UpdateProspection': 'Modifier une prospection',
      'DeleteProspection': 'Supprimer une prospection',
      'UpdatePropertyHistoriquePrix': 'Modifier un historique de prix',
      'DeletePropertyHistoriquePrix': 'Supprimer un historique de prix'
    };
    return lTranslations[pToolName] ?? pToolName;
  }

  /**
   * Parse les arguments JSON d'une action planifiée et les transforme en paires clé/valeur
   * pour affichage tabulaire dans la carte d'approbation.
   * @param pArgsJson Le JSON brut des arguments (peut etre null si l'outil n'envoie pas d'args)
   * @returns Liste de paires { Key, Value } tries par cle, [] si invalide ou vide
   */
  public ParseActionArgs(pArgsJson: string | null): { Key: string; Value: string }[]
  {
    if (!pArgsJson) return [];
    try {
      const lParsed: unknown = JSON.parse(pArgsJson);
      if (lParsed === null || typeof lParsed !== 'object' || Array.isArray(lParsed)) return [];
      const lEntries: [string, string][] = Object.entries(lParsed as Record<string, unknown>)
        .filter(([_, lValue]) => lValue !== null && lValue !== undefined && lValue !== '')
        .map(([lKey, lValue]) => [lKey, this.FormatActionValue(lValue)]);
      return lEntries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([lKey, lValue]) => ({ Key: lKey, Value: lValue }));
    } catch {
      // - cm - JSON invalide : on n'affiche pas la grille plutot que de crasher la carte
      return [];
    }
  }

  /**
   * Formate une valeur d'argument (string, number, boolean, objet, array) en representation texte compacte.
   * @param pValue La valeur brute
   * @returns La representation texte
   */
  private FormatActionValue(pValue: unknown): string
  {
    if (pValue === null || pValue === undefined) return '';
    if (typeof pValue === 'string') return pValue;
    if (typeof pValue === 'number' || typeof pValue === 'boolean') return String(pValue);
    try {
      return JSON.stringify(pValue);
    } catch {
      return String(pValue);
    }
  }

  /**
   * Construit les lignes agregees pour l'apercu global de la carte d'approbation.
   * Pour chaque action : on prend ArgsJson parse en objet, on ajoute des colonnes
   * d'identification (_tool, _table, _summary) pour permettre le tri/filtre dans la grille.
   * @param pApproval La demande d'approbation
   * @returns La liste des lignes a afficher dans la grille d'apercu global
   */
  public ApprovalRowsPreview(pApproval: CrmAgentApprovalRequest): Array<Record<string, unknown>>
  {
    const lRows: Array<Record<string, unknown>> = [];
    for (let lIdx: number = 0; lIdx < pApproval.Actions.length; lIdx++) {
      const lAction: CrmAgentPlannedAction = pApproval.Actions[lIdx];
      const lArgs: { Key: string; Value: string }[] = this.ParseActionArgs(lAction.ArgsJson);
      const lRow: Record<string, unknown> = {
        _action: this.TranslateToolName(lAction.ToolName),
        _tool: lAction.ToolName,
        _summary: lAction.Summary
      };
      for (const lArg of lArgs) {
        lRow[lArg.Key] = lArg.Value;
      }
      lRows.push(lRow);
    }
    return lRows;
  }

  /**
   * Construit les colonnes pour l'apercu global : 3 colonnes d'identification puis
   * l'union des cles trouvees dans les ArgsJson de toutes les actions, triees par frequence.
   * @param pApproval La demande d'approbation
   * @returns Les colonnes pour la grille d'apercu global
   */
  public AggregatePreviewColumns(pApproval: CrmAgentApprovalRequest): GridColumn<Record<string, unknown>>[]
  {
    const lBaseCols: GridColumn<Record<string, unknown>>[] = [
      { Key: '_action', Label: 'Action', Width: '160px' },
      { Key: '_tool', Label: 'Outil MCP', Width: '180px' },
      { Key: '_summary', Label: 'Resume', Width: '200px' }
    ];

    // - cm - Frequence des cles d'args pour trier les plus utiles en premier
    const lKeyFreq: Map<string, number> = new Map<string, number>();
    for (const lAction of pApproval.Actions) {
      const lSeen: Set<string> = new Set<string>();
      for (const lArg of this.ParseActionArgs(lAction.ArgsJson)) {
        if (!lSeen.has(lArg.Key)) {
          lSeen.add(lArg.Key);
          lKeyFreq.set(lArg.Key, (lKeyFreq.get(lArg.Key) ?? 0) + 1);
        }
      }
    }
    const lSortedArgs: string[] = Array.from(lKeyFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    const lArgCols: GridColumn<Record<string, unknown>>[] = lSortedArgs.map((pKey: string) => ({
      Key: pKey,
      Label: pKey,
      Hideable: true,
      Width: '120px'
    }));
    return [...lBaseCols, ...lArgCols];
  }

  /**
   * Bascule l'affichage des details (grille d'arguments) d'une action d'approbation.
   * @param pIndex Index de l'action dans la liste
   */
  public ToggleActionDetails(pIndex: number): void
  {
    const lCurrent: Set<number> = new Set(this.ExpandedActionIndices());
    if (lCurrent.has(pIndex)) {
      lCurrent.delete(pIndex);
    } else {
      lCurrent.add(pIndex);
    }
    this.ExpandedActionIndices.set(lCurrent);
  }

  /**
   * Deplie toutes les actions pour visualiser l'integralite des arguments.
   */
  public ExpandAllActions(): void
  {
    const lRequest: CrmAgentApprovalRequest | null = this.PendingApproval();
    if (!lRequest) return;
    this.ExpandedActionIndices.set(new Set(lRequest.Actions.map((_, lIdx) => lIdx)));
  }

  /**
   * Replie toutes les actions (mode compact par defaut).
   */
  public CollapseAllActions(): void
  {
    this.ExpandedActionIndices.set(new Set());
  }

  /**
   * Confirme un refus total : ouvre la zone de motif si pas encore ouverte,
   * sinon envoie la décision avec 0 actions approuvées et le feedback saisi.
   */
  public async ConfirmRejection(): Promise<void> {
    // - cm - Si la zone de motif n'est pas encore ouverte, on l'ouvre d'abord
    if (!this.ShowRejectionInput()) {
      this.ShowRejectionInput.set(true);
      this.RejectAllActions();
      return;
    }
    // - cm - La zone de motif est ouverte : on envoie le refus avec le feedback
    const lRequest: CrmAgentApprovalRequest | null = this.PendingApproval();
    if (!lRequest) return;
    this.MarkApprovalDecision(lRequest.ApprovalId, 'rejected');
    this.PendingApproval.set(null);
    this.ShowRejectionInput.set(false);
    const lFeedback: string = this.RejectionFeedback().trim();
    this.RejectionFeedback.set('');
    this.ApprovedActionIndices.set(new Set<number>());
    try {
      await this._Hub.respondApproval(lRequest.SessionId, [], lFeedback || undefined);
      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_approval', 'tracking'), {
        decision: 'rejected',
        approvedCount: 0,
        totalCount: lRequest.Actions.length,
        feedbackLength: lFeedback.length
      });
    } catch (lError: unknown) {
      this.Error.set(this.ExtractErrorMessage(lError));
    }
  }

  /**
   * Confirme la sélection granulaire et notifie le backend via le hub.
   * Les actions sélectionnées seront exécutées, les autres seront refusées.
   */
  public async ConfirmApprovalSelection(): Promise<void> {
    const lRequest: CrmAgentApprovalRequest | null = this.PendingApproval();
    if (!lRequest) return;
    const lApprovedIndices: number[] = Array.from(this.ApprovedActionIndices()).sort((a: number, b: number): number => a - b);
    const lFeedback: string = this.RejectionFeedback().trim();
    // - cm - Marquage visuel : approuvé si au moins une action sélectionnée, refusé si aucune
    this.MarkApprovalDecision(lRequest.ApprovalId, lApprovedIndices.length > 0 ? 'approved' : 'rejected');
    this.PendingApproval.set(null);
    this.ShowRejectionInput.set(false);
    this.RejectionFeedback.set('');
    this.ApprovedActionIndices.set(new Set<number>());
    try {
      await this._Hub.respondApproval(lRequest.SessionId, lApprovedIndices, lFeedback || undefined);
      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_approval', 'tracking'), { 
        decision: lApprovedIndices.length > 0 ? 'approved' : 'rejected', 
        approvedCount: lApprovedIndices.length, 
        totalCount: lRequest.Actions.length,
        feedbackLength: lFeedback.length 
      });
    } catch (lError: unknown) {
      this.Error.set(this.ExtractErrorMessage(lError));
    }
  }

  /**
   * Annule la saisie du feedback de refus (ferme le champ sans confirmer).
   */
  public CancelReject(): void {
    this.ShowRejectionInput.set(false);
    this.RejectionFeedback.set('');
  }

  /**
   * Marque visuellement la bulle d'approbation comme approuvée ou refusée.
   * @param pApprovalId L'identifiant de la demande d'approbation
   * @param pDecision La décision prise (approved / rejected)
   */
  private MarkApprovalDecision(pApprovalId: string, pDecision: 'approved' | 'rejected'): void {
    this.Bubbles.update((pBubbles: ChatBubble[]): ChatBubble[] =>
      pBubbles.map((pBubble: ChatBubble): ChatBubble =>
        pBubble.Role === 'approval' && pBubble.Approval?.ApprovalId === pApprovalId
          ? { ...pBubble, ApprovalDecision: pDecision }
          : pBubble
      )
    );
  }

  /**
   * Annule le tour agent en cours via le hub (bouton Stop).
   */
  public async StopAgent(): Promise<void> {
    if (!this.IsBusy() || !this._SessionId) return;
    try {
      await this._Hub.stopChat(this._SessionId);
      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_stop', 'tracking'));
    } catch (lError: unknown) {
      this.Error.set(this.ExtractErrorMessage(lError));
    }
  }

  /**
   * Copie le contenu d'un message dans le presse-papier.
   * @param pText Le texte à copier
   * @param pBubbleId L'identifiant de la bulle (pour le feedback visuel temporaire)
   */
  public async CopyMessage(pText: string, pBubbleId: string): Promise<void> {
    if (!pText) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pText);
      } else {
        // - cm - Fallback pour navigateurs sans Clipboard API
        const lTextarea: HTMLTextAreaElement = document.createElement('textarea');
        lTextarea.value = pText;
        lTextarea.style.position = 'fixed';
        lTextarea.style.opacity = '0';
        document.body.appendChild(lTextarea);
        lTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(lTextarea);
      }
      this.CopiedBubbleId.set(pBubbleId);
      setTimeout((): void => { this.CopiedBubbleId.set(null); }, 2000);
      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_copy', 'tracking'));
    } catch (lError: unknown) {
      console.warn('CrmAgentChat : copie échouée', lError);
    }
  }

  /**
   * Régénère la réponse en relançant le dernier prompt utilisateur.
   */
  public RegenerateLastPrompt(): void {
    if (this.IsBusy() || !this._LastPrompt) return;
    this.Prompt.set(this._LastPrompt);
    this.SendPrompt();
    this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_regenerate', 'tracking'));
  }

  /**
   * Reconnexion manuelle au hub SignalR.
   */
  public async Reconnect(): Promise<void> {
    this.Error.set(null);
    try {
      this._Hub.stopConnection();
      await this._Hub.startConnection();
      this.IsConnected.set(true);
      this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_reconnect', 'tracking'));
    } catch (lError: unknown) {
      this.IsConnected.set(false);
      this.Error.set(this.ExtractErrorMessage(lError));
    }
  }

  /**
   * Retire une bulle par son identifiant.
   * @param pId L'identifiant de la bulle.
   */
  private RemoveBubble(pId: string): void {
    this.Bubbles.update((pBubbles: ChatBubble[]) => pBubbles.filter((pB: ChatBubble) => pB.Id !== pId));
  }

  /**
   * Fait défiler le conteneur des messages vers le bas.
   */
  private ScrollToEnd(): void {
    queueMicrotask((): void => {
      const lEl: HTMLElement | undefined = this._MessagesContainer?.nativeElement;
      if (lEl) {
        lEl.scrollTop = lEl.scrollHeight;
      }
    });
  }

  /**
   * Génère un identifiant unique court.
   * @returns Un identifiant unique.
   */
  private GenId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Extrait un message d'erreur lisible d'une erreur axios/inconnue.
   * @param pError L'erreur.
   * @returns Le message lisible.
   */
  private ExtractErrorMessage(pError: unknown): string {
    if (pError && typeof pError === 'object' && 'response' in pError) {
      const lResp: { data?: { error?: string } } | undefined = (pError as { response?: { data?: { error?: string } } }).response;
      if (lResp?.data?.error) return lResp.data.error;
    }
    if (pError instanceof Error) return pError.message;
    return 'Une erreur est survenue';
  }

  /**
   * Tente de parser un ResultJson d'outil MCP pour détecter une diff (Create*).
   * @param pJson Le ResultJson brut renvoyé par l'outil.
   * @returns La diff normalisée si c'en est une, null sinon.
   */
  /**
   * Retourne l'état d'acceptation d'une diff (pending, accepted, rejected).
   */
  public DiffState(pSummary: string): 'pending' | 'accepted' | 'rejected' {
    return this._DiffStates().get(pSummary) ?? 'pending';
  }

  /**
   * Accepte une diff.
   */
  public AcceptDiff(pSummary: string): void {
    const lStates = new Map(this._DiffStates());
    lStates.set(pSummary, 'accepted');
    this._DiffStates.set(lStates);
  }

  /**
   * Rejette une diff.
   */
  public RejectDiff(pSummary: string): void {
    const lStates = new Map(this._DiffStates());
    lStates.set(pSummary, 'rejected');
    this._DiffStates.set(lStates);
  }

  public ParseDiff(pJson: string | null): DiffRecord | null {
    if (!pJson) return null;
    try {
      const lParsed = JSON.parse(pJson) as { action?: string; table?: string; before?: unknown; after?: unknown; summary?: string };
      // - cm - On reconnaît une diff par la présence de action + table + after
      if (lParsed && typeof lParsed === 'object' && typeof lParsed.action === 'string' && typeof lParsed.table === 'string' && 'after' in lParsed) {
        const lAction: EDiffAction = (['insert', 'update', 'delete'].includes(lParsed.action) ? lParsed.action : 'insert') as EDiffAction;
        return {
          Action: lAction,
          Table: lParsed.table,
          Before: lParsed.before ?? null,
          After: lParsed.after ?? null,
          Summary: typeof lParsed.summary === 'string' ? lParsed.summary : `${lParsed.action} ${lParsed.table}`
        };
      }
    } catch (lError: unknown) {
      // - cm - JSON invalide : ce n'est pas une diff, on ignore silencieusement
      void lError;
    }
    return null;
  }

  /**
   * Tente de parser un ResultJson d'outil MCP pour détecter une liste de DTOs
   * affichable dans une grille extraite. Reconnaît toutes les entités CRM dont
   * la grille a été extraite : Properties, Transactions, Locations, Contacts,
   * HistoriqueEchanges, Taches, Objectifs, Recherches, Prospections, Recrutements.
   * Retourne null si le JSON n'est pas une liste exploitable ou si l'outil n'est pas reconnu.
   * La détection combine le nom de l'outil ET la structure du JSON pour éviter les faux positifs.
   * @param pJson Le ResultJson brut renvoyé par l'outil.
   * @param pToolName Le nom technique de l'outil MCP.
   * @returns La liste typée et son kind, ou null.
   */
  public ParseListResult(pJson: string | null, pToolName: string | null): { Kind: 'transactions' | 'locations' | 'properties' | 'contacts' | 'historique' | 'taches' | 'objectifs' | 'projets' | 'prospections' | 'recrutements'; Data: unknown[] } | null {
    if (!pJson || !pToolName) return null;
    const lNormalizedTool: string = pToolName.toLowerCase();
    // [cm] Détection par nom d'outil (lowercased). L'ordre n'a pas d'importance car chaque nom est unique. On exclut 'contact' du match de 'transaction' (pas d'overlap).
    let lKind: 'transactions' | 'locations' | 'properties' | 'contacts' | 'historique' | 'taches' | 'objectifs' | 'projets' | 'prospections' | 'recrutements' | null = null;
    if (lNormalizedTool.includes('transaction')) {
      lKind = 'transactions';
    } else if (lNormalizedTool.includes('location')) {
      lKind = 'locations';
    } else if (lNormalizedTool.includes('contact')) {
      lKind = 'contacts';
    } else if (lNormalizedTool.includes('historique')) {
      lKind = 'historique';
    } else if (lNormalizedTool.includes('tache')) {
      lKind = 'taches';
    } else if (lNormalizedTool.includes('objectif')) {
      lKind = 'objectifs';
    } else if (lNormalizedTool.includes('recherche') || lNormalizedTool.includes('projet')) {
      lKind = 'projets';
    } else if (lNormalizedTool.includes('prospection')) {
      lKind = 'prospections';
    } else if (lNormalizedTool.includes('recrutement')) {
      lKind = 'recrutements';
    } else if (lNormalizedTool.includes('propert')) {
      lKind = 'properties';
    } else {
      return null;
    }
    let lParsed: unknown;
    try {
      lParsed = JSON.parse(pJson);
    } catch {
      return null;
    }
    if (!Array.isArray(lParsed) || lParsed.length === 0) {
      return null;
    }
    const lFirst: unknown = lParsed[0];
    if (!lFirst || typeof lFirst !== 'object') {
      return null;
    }
    // [cm] Validation structurelle minimale : la première ligne doit être un objet. On ne fait pas de validation fine par DTO ici pour éviter la fragilité (champs optionnels).
    return { Kind: lKind, Data: lParsed };
  }

  /**
   * Extrait les suggestions interactives d'un message agent (ligne SUGGESTIONS:libell1|libell2|...).
   * Retire cette ligne du texte affiché et retourne les suggestions parsées (max 4).
   * @param pMessage Le message brut de l'agent
   * @returns Le texte nettoyé (sans la ligne SUGGESTIONS) + la liste des suggestions
   */
  public ExtractSuggestions(pMessage: string): { CleanText: string; Suggestions: ChatSuggestion[] } {
    if (!pMessage) return { CleanText: pMessage ?? '', Suggestions: [] };

    // - cm - Recherche de la ligne SUGGESTIONS: (en fin de message, insensible à la casse)
    const lMatch: RegExpMatchArray | null = pMessage.match(/\n*SUGGESTIONS:\s*(.+?)\s*$/i);
    if (!lMatch) return { CleanText: pMessage, Suggestions: [] };

    const lRawSuggestions: string = lMatch[1] ?? '';
    const lCleanText: string = pMessage.slice(0, lMatch.index).trimEnd();

    // - cm - Découpage par pipe, filtrage des vides, max 4 suggestions
    const lLabels: string[] = lRawSuggestions
      .split('|')
      .map((pLabel: string): string => pLabel.trim())
      .filter((pLabel: string): boolean => pLabel.length > 0 && pLabel.length <= 30)
      .slice(0, 4);

    const lSuggestions: ChatSuggestion[] = lLabels.map((pLabel: string): ChatSuggestion => ({ Label: pLabel }));
    return { CleanText: lCleanText, Suggestions: lSuggestions };
  }

  /**
   * Envoie une suggestion cliquée comme prompt à l'agent (réponse rapide interactive).
   * @param pLabel Le libellé de la suggestion cliquée
   */
  public SendSuggestion(pLabel: string): void {
    if (this.IsBusy() || !pLabel) return;
    this.Prompt.set(pLabel);
    this.SendPrompt();
    this.PostHog.Capture(this.BuildTrackingName('crm_agent_chat_suggestion', 'tracking'));
  }

  /**
   * Convertit le texte markdown d'un message agent en HTML sûr (paragraphes, listes, gras, titres, code inline).
   * Échappe d'abord le HTML pour éviter toute injection, puis applique un formattage markdown léger.
   * @param pText Le texte brut (markdown) du message
   * @returns Un SafeHtml sanitizé prêt pour [innerHTML]
   */
  public FormatMessage(pText: string | null | undefined): SafeHtml {
    if (!pText) return this._Sanitizer.bypassSecurityTrustHtml('');
    // - cm - 1. Échappement HTML pour neutraliser toute balise saisie par l'agent
    const lEscaped: string = pText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // - cm - 2. Découpage par lignes pour construire paragraphes et listes
    const lLines: string[] = lEscaped.split(/\r?\n/);
    const lHtml: string[] = [];
    let lInList: boolean = false;
    let lParagraph: string[] = [];

    /**
     * Formate le markdown inline d'une ligne (gras **, code `), italique *.
     * @param pLine La ligne échappée
     * @returns La ligne avec balises inline
     */
    const lFormatInline: (pLine: string) => string = (pLine: string): string => {
      let lOut: string = pLine;
      // - cm - Code inline `...`
      lOut = lOut.replace(/`([^`]+)`/g, '<code>$1</code>');
      // - cm - Gras **...**
      lOut = lOut.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // - cm - Italique *...* (après le gras pour éviter les conflits)
      lOut = lOut.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
      return lOut;
    };

    /**
     * Vide le paragraphe en cours dans le flux HTML.
     */
    const lFlushParagraph: () => void = (): void => {
      if (lParagraph.length > 0) {
        lHtml.push(`<p>${lFormatInline(lParagraph.join(' '))}</p>`);
        lParagraph = [];
      }
    };

    for (const lRaw of lLines) {
      const lLine: string = lRaw.trim();

      // - cm - Ligne vide : fin de paragraphe
      if (lLine === '') {
        lFlushParagraph();
        if (lInList) {
          lHtml.push('</ul>');
          lInList = false;
        }
        continue;
      }

      // - cm - Titres ### / ## / #
      const lHeaderMatch: RegExpMatchArray | null = lLine.match(/^(#{1,3})\s+(.+)$/);
      if (lHeaderMatch) {
        lFlushParagraph();
        if (lInList) {
          lHtml.push('</ul>');
          lInList = false;
        }
        const lLevel: number = lHeaderMatch[1]!.length;
        lHtml.push(`<h${lLevel}>${lFormatInline(lHeaderMatch[2]!)}</h${lLevel}>`);
        continue;
      }

      // - cm - Liste à puces (- ou • ou *)
      const lBulletMatch: RegExpMatchArray | null = lLine.match(/^[-•*]\s+(.+)$/);
      if (lBulletMatch) {
        lFlushParagraph();
        if (!lInList) {
          lHtml.push('<ul>');
          lInList = true;
        }
        lHtml.push(`<li>${lFormatInline(lBulletMatch[1]!)}</li>`);
        continue;
      }

      // - cm - Ligne normale : accumulation dans le paragraphe courant
      if (lInList) {
        lHtml.push('</ul>');
        lInList = false;
      }
      lParagraph.push(lLine);
    }

    lFlushParagraph();
    if (lInList) lHtml.push('</ul>');

    return this._Sanitizer.bypassSecurityTrustHtml(lHtml.join('\n'));
  }

  //#region Import Grid (transactions, contacts, etc.)
  /**
   * Construit les définitions de colonnes à utiliser dans la grille générique d'import,
   * une entrée par 'kind' d'entité CRM. Les colonnes sont volontairement simples (texte)
   * pour rester DRY avec la grille générique utilisée par les pages CRM.
   * @returns La map kind -> colonnes.
   */
  private BuildImportGridColumns(): Map<string, GridColumn<unknown>[]> {
    const lMap: Map<string, GridColumn<unknown>[]> = new Map<string, GridColumn<unknown>[]>([
      ['transactions', [
        { Key: 'reference', Label: 'Référence', Hideable: true },
        { Key: 'adresse', Label: 'Adresse', Hideable: true },
        { Key: 'natureAffaireId', Label: 'Nature', Hideable: true },
        { Key: 'prixAffiche', Label: 'Prix affiché', Hideable: true },
        { Key: 'prixFinal', Label: 'Prix final', Hideable: true },
        { Key: 'statutId', Label: 'Statut', Hideable: true },
        { Key: 'clientId', Label: 'Client', Hideable: true }
      ]],
      ['locations', [
        { Key: 'reference', Label: 'Référence', Hideable: true },
        { Key: 'adresse', Label: 'Adresse', Hideable: true },
        { Key: 'typeLocation', Label: 'Type', Hideable: true },
        { Key: 'loyer', Label: 'Loyer', Hideable: true },
        { Key: 'charges', Label: 'Charges', Hideable: true },
        { Key: 'statutId', Label: 'Statut', Hideable: true }
      ]],
      ['properties', [
        { Key: 'reference', Label: 'Référence', Hideable: true },
        { Key: 'adresse', Label: 'Adresse', Hideable: true },
        { Key: 'typeBienId', Label: 'Type de bien', Hideable: true },
        { Key: 'surface', Label: 'Surface', Hideable: true },
        { Key: 'nbPieces', Label: 'Pièces', Hideable: true },
        { Key: 'prixEstime', Label: 'Prix estimé', Hideable: true }
      ]],
      ['contacts', [
        { Key: 'nom', Label: 'Nom', Hideable: true },
        { Key: 'prenom', Label: 'Prénom', Hideable: true },
        { Key: 'email', Label: 'Email', Hideable: true },
        { Key: 'telephone', Label: 'Téléphone', Hideable: true },
        { Key: 'type', Label: 'Type', Hideable: true }
      ]],
      ['historique', [
        { Key: 'date', Label: 'Date', Hideable: true },
        { Key: 'type', Label: 'Type', Hideable: true },
        { Key: 'contactId', Label: 'Contact', Hideable: true },
        { Key: 'contenu', Label: 'Contenu', Hideable: true }
      ]],
      ['taches', [
        { Key: 'titre', Label: 'Titre', Hideable: true },
        { Key: 'dateEcheance', Label: 'Échéance', Hideable: true },
        { Key: 'priorite', Label: 'Priorité', Hideable: true },
        { Key: 'statutId', Label: 'Statut', Hideable: true }
      ]],
      ['objectifs', [
        { Key: 'libelle', Label: 'Libellé', Hideable: true },
        { Key: 'type', Label: 'Type', Hideable: true },
        { Key: 'dateDebut', Label: 'Début', Hideable: true },
        { Key: 'dateFin', Label: 'Fin', Hideable: true },
        { Key: 'valeurCible', Label: 'Valeur cible', Hideable: true }
      ]],
      ['projets', [
        { Key: 'nom', Label: 'Nom', Hideable: true },
        { Key: 'dateDebut', Label: 'Début', Hideable: true },
        { Key: 'dateFin', Label: 'Fin', Hideable: true },
        { Key: 'budget', Label: 'Budget', Hideable: true },
        { Key: 'statutId', Label: 'Statut', Hideable: true }
      ]],
      ['prospections', [
        { Key: 'nom', Label: 'Nom', Hideable: true },
        { Key: 'adresse', Label: 'Adresse', Hideable: true },
        { Key: 'typeBien', Label: 'Type de bien', Hideable: true },
        { Key: 'prixEstime', Label: 'Prix estimé', Hideable: true },
        { Key: 'statutId', Label: 'Statut', Hideable: true }
      ]],
      ['recrutements', [
        { Key: 'nom', Label: 'Nom', Hideable: true },
        { Key: 'prenom', Label: 'Prénom', Hideable: true },
        { Key: 'poste', Label: 'Poste', Hideable: true },
        { Key: 'dateCandidature', Label: 'Candidature', Hideable: true },
        { Key: 'statutId', Label: 'Statut', Hideable: true }
      ]]
    ]);
    return lMap;
  }

  /**
   * Récupère les colonnes d'import pour un type d'entité donné.
   * @param pKind Le type d'entité (transactions, locations, contacts, etc.).
   * @returns Les colonnes à afficher, ou un tableau vide si le kind est inconnu.
   */
  public ImportColumnsFor(pKind: string): GridColumn<unknown>[] {
    return this._ImportColumns.get(pKind) ?? [];
  }

  /**
   * Colonnes de fallback pour les plans g\u00e9n\u00e9riques (kind = 'plan') qui ne correspondent
   * pas \u00e0 une entit\u00e9 CRM connue. Affiche 3 colonnes : Param\u00e8tre, Valeur, D\u00e9tails.
   * Utilis\u00e9 par ParsePlanFromMessage quand le plan ne contient pas d'emoji de section.
   */
  public readonly PlanFallbackColumns: GridColumn<unknown>[] = [
    { Key: '#', Label: '#', Hideable: true, Width: '40px' },
    { Key: 'Nom', Label: 'Nom', Hideable: true },
    { Key: 'Details', Label: 'Details', Hideable: true },
    { Key: 'Parametre', Label: 'Parametre', Hideable: true },
    { Key: 'Valeur', Label: 'Valeur', Hideable: true }
  ];

  /**
   * Tente de parser un ResultJson d'outil MCP pour détecter une liste de DTOs créés
   * par un outil d'import (Create*, Import*, Batch*, BulkCreate*). Reconnaît les mêmes
   * 10 entités CRM que ParseListResult mais ne déclenche que pour les préfixes
   * d'import, afin d'afficher une grille générique des lignes à importer plutôt que
   * la grille spécifique (lecture seule) déjà gérée par ParseListResult.
   * Formats JSON supportés :
   * - Diff simple produit par McpDiffSerializer : { action: 'insert', table, after: { DTO } }
   *   → on enveloppe `after` dans un tableau.
   * - Tableau direct : [ DTO, DTO, ... ]
   * - Enveloppe : { rows | data | items : [ DTO, ... ] }
   * @param pJson Le ResultJson brut renvoyé par l'outil.
   * @param pToolName Le nom technique de l'outil MCP.
   * @returns Le kind et les lignes à importer, ou null si l'outil n'est pas un import.
   */
  public ParseImportedRows(pJson: string | null, pToolName: string | null): { Kind: 'transactions' | 'locations' | 'properties' | 'contacts' | 'historique' | 'taches' | 'objectifs' | 'projets' | 'prospections' | 'recrutements'; Data: unknown[] } | null {
    if (!pJson || !pToolName) return null;
    const lNormalizedTool: string = pToolName.toLowerCase();
    // - cm - Préfixes d'outils d'import : Create, Import, Batch, BulkCreate.
    const lImportPrefixes: readonly string[] = ['create', 'import', 'batch', 'bulkcreate'];
    const lIsImportTool: boolean = lImportPrefixes.some((pPrefix: string): boolean => lNormalizedTool.includes(pPrefix));
    if (!lIsImportTool) return null;

    let lKind: 'transactions' | 'locations' | 'properties' | 'contacts' | 'historique' | 'taches' | 'objectifs' | 'projets' | 'prospections' | 'recrutements' | null = null;
    if (lNormalizedTool.includes('transaction')) {
      lKind = 'transactions';
    } else if (lNormalizedTool.includes('location')) {
      lKind = 'locations';
    } else if (lNormalizedTool.includes('contact')) {
      lKind = 'contacts';
    } else if (lNormalizedTool.includes('historique')) {
      lKind = 'historique';
    } else if (lNormalizedTool.includes('tache')) {
      lKind = 'taches';
    } else if (lNormalizedTool.includes('objectif')) {
      lKind = 'objectifs';
    } else if (lNormalizedTool.includes('recherche') || lNormalizedTool.includes('projet')) {
      lKind = 'projets';
    } else if (lNormalizedTool.includes('prospection')) {
      lKind = 'prospections';
    } else if (lNormalizedTool.includes('recrutement')) {
      lKind = 'recrutements';
    } else if (lNormalizedTool.includes('propert')) {
      lKind = 'properties';
    } else {
      return null;
    }

    let lParsed: unknown;
    try {
      lParsed = JSON.parse(pJson);
    } catch {
      return null;
    }
    // - cm - Tolère 3 formats : tableau direct, enveloppe { rows/data/items }, diff MCP { action, table, after }.
    let lRows: unknown[] | null = null;
    if (Array.isArray(lParsed)) {
      lRows = lParsed;
    } else if (lParsed && typeof lParsed === 'object') {
      const lObj: Record<string, unknown> = lParsed as Record<string, unknown>;
      const lCandidate: unknown = lObj['rows'] ?? lObj['data'] ?? lObj['items'];
      if (Array.isArray(lCandidate)) {
        lRows = lCandidate;
      } else {
        // - cm - Diff MCP simple : { action: 'insert', table, after: { DTO } } → on enveloppe `after`.
        const lIsDiff: boolean = typeof lObj['action'] === 'string' && 'after' in lObj;
        if (lIsDiff) {
          const lAfter: unknown = lObj['after'];
          if (lAfter && typeof lAfter === 'object') {
            lRows = [lAfter];
          }
        }
      }
    }
    if (!lRows || lRows.length === 0) {
      return null;
    }
    return { Kind: lKind, Data: lRows };
  }

  /**
   * Parse un texte de plan d'import pour extraire les sections et les items.
   * Utilisé par la grille de preview affichée dans la bulle assistant.
   * Gère deux formats: sections markdown avec en-tête emoji, et bullets inline key:value.
   */
  public ParsePlanFromMessage(pMessage: string | null): { Kind: 'contacts' | 'properties' | 'transactions' | 'recherches' | 'taches' | 'prospections' | 'recrutements' | 'locations' | 'objectifs' | 'plan'; Title: string; Data: Array<Record<string, string>> }[] {
    if (!pMessage) return [];
    const lLines: string[] = pMessage.split(/\r?\n/);
    const lSectionMap: ReadonlyArray<{ Pattern: RegExp; Kind: 'contacts' | 'properties' | 'transactions' | 'recherches' | 'taches' | 'prospections' | 'recrutements' | 'locations' | 'objectifs' | 'plan'; Label: string }> = [
      { Pattern: /contact/i, Kind: 'contacts', Label: 'Contacts' },
      { Pattern: /bien|propert/i, Kind: 'properties', Label: 'Biens' },
      { Pattern: /transaction|affaire/i, Kind: 'transactions', Label: 'Transactions' },
      { Pattern: /recherche/i, Kind: 'recherches', Label: 'Recherches' },
      { Pattern: /tache/i, Kind: 'taches', Label: 'Taches' },
      { Pattern: /prospection/i, Kind: 'prospections', Label: 'Prospections' },
      { Pattern: /recrutement/i, Kind: 'recrutements', Label: 'Recrutements' },
      { Pattern: /location/i, Kind: 'locations', Label: 'Locations' },
      { Pattern: /objectif/i, Kind: 'objectifs', Label: 'Objectifs' }
    ];
    const lSections: { Kind: 'contacts' | 'properties' | 'transactions' | 'recherches' | 'taches' | 'prospections' | 'recrutements' | 'locations' | 'objectifs' | 'plan'; Title: string; Data: Array<Record<string, string>> }[] = [];
    let lCurrent: { Kind: 'contacts' | 'properties' | 'transactions' | 'recherches' | 'taches' | 'prospections' | 'recrutements' | 'locations' | 'objectifs' | 'plan'; Title: string; Data: Array<Record<string, string>> } | null = null;
    const lFlush = (): void => {
      if (lCurrent && lCurrent.Data.length > 0) {
        lSections.push(lCurrent);
      }
      lCurrent = null;
    };
    for (const lLine of lLines) {
      const lTrimmed: string = lLine.trim();
      if (!lTrimmed) continue;
      const lHasEmoji: boolean = /[^\x00-\x7F]/.test(lTrimmed);
      const lSectionHeader: RegExp = /^\s*(?:\d+\s+)?(?:nouveaux|nouvelles?|pack)?\s*(contacts|biens|transactions|recherches|taches|prospections|recrutements|locations|objectifs|affaires)\s*[:\u00a0]?\s*$/i;
      const lMatch: RegExpMatchArray | null = lTrimmed.match(lSectionHeader);
      if (lMatch && lHasEmoji) {
        lFlush();
        const lKeyword: string = lMatch[1].toLowerCase();
        const lMapping = lSectionMap.find((pSec): boolean => pSec.Pattern.test(lKeyword));
        lCurrent = lMapping
          ? { Kind: lMapping.Kind, Title: lMapping.Label, Data: [] }
          : { Kind: 'plan', Title: lMatch[1], Data: [] };
        continue;
      }
      const lNumberedItem: RegExpMatchArray | null = lTrimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*[—\-:]\s*(.+)$/);
      if (lNumberedItem) {
        if (!lCurrent) lCurrent = { Kind: 'plan', Title: 'Plan', Data: [] };
        lCurrent.Data.push({
          '#': lNumberedItem[1],
          Nom: lNumberedItem[2].trim(),
          Details: lNumberedItem[3].trim()
        });
        continue;
      }
      const lBulletKv: RegExpMatchArray | null = lTrimmed.match(/^[-*]\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)$/);
      if (lBulletKv) {
        if (!lCurrent) lCurrent = { Kind: 'plan', Title: 'Parametres', Data: [] };
        const lLastItem: Record<string, string> | undefined = lCurrent.Data[lCurrent.Data.length - 1];
        if (lLastItem && !lLastItem['Parametre']) {
          lLastItem['Parametre'] = lBulletKv[1];
          lLastItem['Valeur'] = lBulletKv[2].trim();
        }
        continue;
      }
      if (lCurrent && lCurrent.Data.length > 0 && !lTrimmed.startsWith('-') && !lTrimmed.match(/^\d+\./)) {
        const lLastItem: Record<string, string> = lCurrent.Data[lCurrent.Data.length - 1];
        const lDetails: string = lLastItem['Details'] ?? '';
        lLastItem['Details'] = lDetails ? `${lDetails} ${lTrimmed}` : lTrimmed;
      }
    }
    lFlush();
    return lSections;
  }
  //#endregion
}
