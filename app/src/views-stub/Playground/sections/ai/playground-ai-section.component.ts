import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { BaseComponent } from '@base/BaseComponent';
import { PlaygroundSectionComponent } from '../playground-section.component';
import { UploadFileComponent, FileTypeConfig } from '@shared/components/UploadFile/upload-file.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { DiffViewComponent, DiffRecord, EDiffAction } from '@shared/components/diff-view/diff-view.component';
import { GridComponent } from'@shared/components/grid/grid.component';
import type { GridColumn } from '@shared/components/grid/GridColumn';

/**
 * Thème d'affichage de la zone d'upload dans le chat agent CRM.
 */
type EUploadTheme = 'compact-inline' | 'card-dropzone' | 'minimal-chip' | 'agent-message-dropzone';

/**
 * Option du switcher de thème d'upload.
 */
interface UploadThemeOption {
  /** Valeur du thème. */
  Value: EUploadTheme;
  /** Libellé affiché dans le switcher. */
  Label: string;
}

/**
 * Action simulée d'approbation (carte du chat agent CRM).
 * Représente un outil MCP mutant (famille Create / Update / Attach / Link) qui attend validation utilisateur.
 */
interface ApprovalMockAction {
  /** Identifiant unique de l'action (clé technique outil MCP). */
  Id: string;
  /** Libellé technique de l'outil MCP. */
  ToolName: string;
  /** Nom humain de l'outil (ex: "Créer prospection"). */
  DisplayName: string;
  /** Table CRM cible. */
  Table: 'prospections' | 'contacts' | 'properties' | 'taches';
  /** Résumé lisible (ex: "Sophie Garnier 0611223344"). */
  Summary: string;
  /** Paires clé/valeur des champs qui vont être insérés (utilisées pour la grille preview). */
  Fields: Record<string, string>;
}

/**
 * Section du playground dédiée aux composants IA du CRM :
 * app-upload-file avec ses 4 thèmes, preview statique du chat agent,
 * et badges utilisés dans les étapes agent (think, tool, result, agent, tokens).
 */
@Component({
  selector: 'app-playground-ai-section',
  standalone: true,
  imports: [PlaygroundSectionComponent, UploadFileComponent, BadgeComponent, ButtonComponent, DiffViewComponent, GridComponent],
  templateUrl: './playground-ai-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './playground-ai-section.component.scss'
})
export class PlaygroundAiSectionComponent extends BaseComponent
{
  //#region Attributes
  /** Thème d'upload actuellement sélectionné dans le switcher. */
  public readonly SelectedUploadTheme = signal<EUploadTheme>('compact-inline');

  /** Fichier sélectionné par la démo upload (affiché dans le panneau mock). */
  public readonly SelectedFile = signal<File | null>(null);

  /** Mode d'affichage du chat dans la démo : FAB (bulle flottante) ou embedded (full-page). */
  public readonly ChatViewMode = signal<'fab' | 'embedded'>('fab');

  /** Actions simulées d'approbation Approval (2 prospections + 1 contact + 1 bien). */
  public readonly ApprovalActions = signal<ApprovalMockAction[]>([
    {
      Id: 'p1',
      ToolName: 'crm_create_prospection',
      DisplayName: 'Créer une prospection',
      Table: 'prospections',
      Summary: 'Sophie Garnier - 0611223344',
      Fields: { nom: 'Sophie Garnier', telephone: '0611223344', type: 'Appartement', ville: 'Lyon 3e', budget: '320000' }
    },
    {
      Id: 'c1',
      ToolName: 'crm_create_contact',
      DisplayName: 'Créer un contact',
      Table: 'contacts',
      Summary: 'Marc Dubois - marc.dubois@example.com',
      Fields: { nom: 'Dubois', prenom: 'Marc', email: 'marc.dubois@example.com', telephone: '0698765432', type: 'Acheteur' }
    },
    {
      Id: 'p2',
      ToolName: 'crm_create_prospection',
      DisplayName: 'Créer une prospection',
      Table: 'prospections',
      Summary: 'Sophie Garnier - 0611223344',
      Fields: { nom: 'Sophie Garnier', telephone: '0611223344', type: 'Appartement', ville: 'Villeurbanne', budget: '290000' }
    },
    {
      Id: 'b1',
      ToolName: 'crm_create_property',
      DisplayName: 'Créer un bien',
      Table: 'properties',
      Summary: 'T3 65m2 - Lyon 3e - 340000 EUR',
      Fields: { type: 'Appartement', surface: '65', ville: 'Lyon 3e', prix: '340000', pieces: '3' }
    }
  ]);

  /** Indices des actions sélectionnées pour approbation (Record id -> bool, compatible signal). */
  public readonly ApprovalSelected = signal<Record<string, boolean>>({ p1: true, c1: true, p2: false, b1: true });

  /** État final de la décision Approval : null (en attente), 'approved' ou 'rejected'. */
  public readonly ApprovalDecision = signal<'approved' | 'rejected' | null>(null);

  /** Compteur d'actions sélectionnées (pour le label du bouton "Approuver"). */
  public readonly ApprovalSelectedCount = computed<number>(() =>
    Object.values(this.ApprovalSelected()).filter((v) => v).length
  );

  /** Live progress : itération courante de la simulation LLM. */
  public readonly LiveIteration = signal<number>(3);

  /** Live progress : nombre total d'étapes reçues depuis le début du tour. */
  public readonly LiveSteps = signal<number>(7);

  /** Live progress : tokens accumulés (prompt + completion). */
  public readonly LiveTokens = signal<number>(1842);

  /** Liste des outils MCP appelés pendant le tour courant (pour affichage code-style). */
  public readonly LiveTools = signal<string[]>(['crm_list_prospections', 'crm_create_prospection', 'crm_create_contact', 'crm_create_property']);

  /** Live progress : durée écoulée simulée du tour courant. */
  public readonly LiveDuration = signal<string>('3.2s');

  /** Liste des thèmes d'upload disponibles avec leur libellé. */
  public readonly UploadThemes: UploadThemeOption[] = [
    { Value: 'compact-inline', Label: 'Compact inline' },
    { Value: 'card-dropzone', Label: 'Card dropzone' },
    { Value: 'minimal-chip', Label: 'Minimal chip' },
    { Value: 'agent-message-dropzone', Label: 'Agent dropzone' }
  ];

  /** Types de fichiers acceptés par la zone d'upload démo. */
  public readonly UploadFileTypes: FileTypeConfig[] = [
    { type: 'document', label: 'Document', extensions: ['pdf', 'txt', 'docx', 'md', 'jpg', 'jpeg', 'png', 'webp'], maxSize: 10 }
  ];

  /** Snippet copiable pour l'upload avec switcher de thème. */
  public readonly UploadThemeCode: string = `<app-upload-file
  label="Joindre un fichier (optionnel)"
  [theme]="SelectedUploadTheme()"
  [fileTypes]="UploadFileTypes"
  selectedType="document"
  [showPreview]="false"
  [autoUpload]="false"
  accept=".pdf,.txt,.docx,.md,.jpg,.jpeg,.png,.webp"
  (fileSelected)="OnFileSelected($event)" />`;

  /** Snippet copiable pour les badges agent. */
  public readonly AgentBadgeCode: string = `<app-badge type="info" label="Réflexion" icon="psychology" variant="soft" size="xs" />
<app-badge type="default" label="Outil MCP" icon="build" variant="soft" size="xs" />
<app-badge type="success" label="Résultat" variant="soft" size="xs" />
<app-badge type="premium" label="Agent" icon="smart_toy" variant="soft" size="xs" />
<app-badge type="info" [count]="1242" icon="token" variant="soft" size="xs" />`;

  /** Exemples de diff pour la démo app-diff-view. */
  public readonly DiffRecords: DiffRecord[] = [
    {
      Action: 'insert' as EDiffAction,
      Table: 'contacts',
      Before: null,
      After: { id: 42, nom: 'Dupont', prenom: 'Jean', email: 'jd@example.com' },
      Summary: '+1 ligne dans contacts (id: 42)'
    },
    {
      Action: 'update' as EDiffAction,
      Table: 'properties',
      Before: { id: 7, statut_bien_id: 1, prix: 350000 },
      After: { id: 7, statut_bien_id: 2, prix: 340000 },
      Summary: 'properties id: 7 - statut et prix modifiés'
    },
    {
      Action: 'delete' as EDiffAction,
      Table: 'taches',
      Before: { id: 12, titre: 'Relancer client', statut: 'en cours' },
      After: null,
      Summary: '-1 ligne dans taches (id: 12)'
    }
  ];

  /** Diffs du tour courant (section "lignes ajoutées" mise en avant verte, voir crm-agent-tour-diffs). */
  public readonly TourDiffs: DiffRecord[] = [
    {
      Action: 'insert' as EDiffAction,
      Table: 'prospections',
      Before: null,
      After: { id: 88, nom: 'Sophie Garnier', telephone: '0611223344', ville: 'Lyon 3e', budget: 320000 },
      Summary: '+1 prospection (Sophie Garnier - Lyon 3e)'
    },
    {
      Action: 'insert' as EDiffAction,
      Table: 'contacts',
      Before: null,
      After: { id: 142, nom: 'Dubois', prenom: 'Marc', email: 'marc.dubois@example.com' },
      Summary: '+1 contact (Marc Dubois)'
    },
    {
      Action: 'insert' as EDiffAction,
      Table: 'properties',
      Before: null,
      After: { id: 57, type: 'Appartement', surface: 65, ville: 'Lyon 3e', prix: 340000 },
      Summary: '+1 bien (T3 65m2 Lyon 3e)'
    }
  ];

  /** Colonnes de la grille preview Approval (lecture seule, reflete les Fields des actions selectionnees). */
  public readonly ApprovalPreviewColumns: GridColumn<Record<string, string>>[] = [
    { Key: 'table', Label: 'Table', Width: '110px' },
    { Key: 'tool', Label: 'Outil MCP', Width: '180px' },
    { Key: 'summary', Label: 'Resume', Width: '220px' }
  ];

  /** Lignes de la grille preview : une par action Approval (toutes, cochees ou non), pour visualiser ce qui sera cree. */
  public readonly ApprovalPreviewRows = computed<Record<string, string>[]>(() =>
    this.ApprovalActions().map((a) => ({
      table: a.Table,
      tool: a.ToolName,
      summary: a.Summary
    }))
  );

  /** Snippet copiable pour la carte d'approbation Approval. */
  public readonly ApprovalCode: string = `<!-- Carte d'approbation generee par le chat agent CRM -->
<div class="crm-agent-approval">
  <div class="crm-agent-approval__header">
    <app-badge type="warning" label="Approbation requise" icon="gavel"
      variant="soft" size="xs" [showIcon]="true" />
    <span class="crm-agent-approval__hint">
      Selectionnez les actions a autoriser ({{ Actions.length }})
    </span>
  </div>
  <ul class="crm-agent-approval__actions">
    @for (lAction of Actions; track lAction.Id; let lIdx = $index) {
    <li class="crm-agent-approval__action"
      [class.is-approved]="ApprovedActionIndices().has(lIdx)"
      (click)="!Decision ? ToggleActionApproval(lIdx) : null">
      <span class="material-icons crm-agent-approval__check">
        {{ ApprovedActionIndices().has(lIdx) ? 'check_box' : 'check_box_outline_blank' }}
      </span>
      <div class="crm-agent-approval__action-text">
        <span class="crm-agent-approval__tool">{{ TranslateToolName(lAction.ToolName) }}</span>
        <span class="crm-agent-approval__summary">{{ lAction.Summary }}</span>
      </div>
    </li>
    }
  </ul>
  <div class="crm-agent-approval__buttons">
    <app-button variant="success" icon="check"
      (ButtonClick)="ConfirmApprovalSelection()">
      Approuver ({{ SelectedActionsCount() }}/{{ Actions.length }})
    </app-button>
    <app-button variant="danger" icon="close"
      (ButtonClick)="ConfirmRejection()">
      Refuser
    </app-button>
  </div>
</div>`;

  /** Snippet copiable pour le bloc "lignes ajoutees" du tour. */
  public readonly TourDiffsCode: string = `<div class="crm-agent-tour-diffs">
  <div class="crm-agent-tour-diffs__header">
    <app-badge type="success" label="Lignes ajoutees" icon="add_circle"
      variant="soft" size="xs" [showIcon]="true" />
    <span class="crm-agent-tour-diffs__count">{{ TourDiffs().length }}</span>
  </div>
  @for (lDiff of TourDiffs(); track $index) {
  <app-diff-view [Record]="lDiff" Mode="cards" />
  }
</div>`;

  /** Snippet copiable pour app-diff-view. */
  public readonly DiffViewCode: string = `<!-- Mode simple par défaut (cartes clés/valeurs) -->
<app-diff-view [Record]="DiffRecord" Mode="cards" />

<!-- Mode tableau compact -->
<app-diff-view [Record]="DiffRecord" Mode="table" />

<!-- Mode technique style git / VS Code -->
<app-diff-view [Record]="DiffRecord" Mode="inline" [MaxHeight]="240" />

<!-- DiffRecord -->
{
  Action: 'insert' | 'update' | 'delete',
  Table: 'contacts',
  Before: null,
  After: { id: 42, nom: 'Dupont' },
  Summary: '+1 ligne dans contacts (id: 42)'
}`;
  //#endregion

  //#region Methods
  /**
   * Sélectionne un thème d'upload dans le switcher.
   * @param pTheme Le thème à appliquer
   */
  public SelectTheme(pTheme: EUploadTheme): void
  {
    this.SelectedUploadTheme.set(pTheme);
    this.PostHog.Capture(this.BuildTrackingName('playground_ai_upload_theme_change', 'tracking'), { theme: pTheme });
  }

  /**
   * Gère la sélection d'un fichier dans la démo upload IA.
   * @param pFile Le fichier sélectionné
   */
  public OnFileSelected(pFile: File): void
  {
    this.SelectedFile.set(pFile);
    this.PostHog.Capture(this.BuildTrackingName('playground_ai_file_selected', 'tracking'), { name: pFile.name, theme: this.SelectedUploadTheme() });
  }

  /**
   * Gère une erreur d'upload dans la démo upload IA.
   * @param pError Le message d'erreur
   */
  public OnUploadError(pError: string): void
  {
    this.PostHog.Capture(this.BuildTrackingName('playground_ai_upload_error', 'tracking'), { error: pError });
  }

  /**
   * Retire le fichier sélectionné dans le panneau mock.
   */
  public ClearSelectedFile(): void
  {
    this.SelectedFile.set(null);
  }

  /**
   * Bascule le mode d'affichage du chat dans la démo (FAB vs embedded full-page).
   * @param pMode Le mode à appliquer
   */
  public SelectChatViewMode(pMode: 'fab' | 'embedded'): void
  {
    this.ChatViewMode.set(pMode);
    this.PostHog.Capture(this.BuildTrackingName('playground_ai_chat_view_mode', 'tracking'), { mode: pMode });
  }

  /**
   * Bascule la sélection d'une action Approval (carte d'approbation).
   * @param pId Identifiant de l'action à cocher/décocher
   */
  public ToggleApprovalAction(pId: string): void
  {
    if (this.ApprovalDecision() !== null) return;
    const lCurrent: Record<string, boolean> = { ...this.ApprovalSelected() };
    lCurrent[pId] = !lCurrent[pId];
    this.ApprovalSelected.set(lCurrent);
    this.PostHog.Capture(this.BuildTrackingName('playground_ai_approval_toggle', 'tracking'), { id: pId, selected: lCurrent[pId] });
  }

  /**
   * Sélectionne toutes les actions Approval (bouton "Tout sélectionner").
   */
  public ApprovalSelectAll(): void
  {
    const lAll: Record<string, boolean> = {};
    for (const lAction of this.ApprovalActions()) {
      lAll[lAction.Id] = true;
    }
    this.ApprovalSelected.set(lAll);
  }

  /**
   * Déselectionne toutes les actions Approval (bouton "Tout désélectionner").
   */
  public ApprovalSelectNone(): void
  {
    const lNone: Record<string, boolean> = {};
    for (const lAction of this.ApprovalActions()) {
      lNone[lAction.Id] = false;
    }
    this.ApprovalSelected.set(lNone);
  }

  /**
   * Valide la sélection courante et passe la carte en état "approuvé".
   */
  public ApprovalConfirmApproval(): void
  {
    this.ApprovalDecision.set('approved');
    this.PostHog.Capture(this.BuildTrackingName('playground_ai_approval_approve', 'tracking'), {
      count: this.ApprovalSelectedCount(),
      total: this.ApprovalActions().length
    });
  }

  /**
   * Refuse toutes les actions (passe la carte en état "refusé").
   */
  public ApprovalReject(): void
  {
    this.ApprovalDecision.set('rejected');
    this.PostHog.Capture(this.BuildTrackingName('playground_ai_approval_reject', 'tracking'), {
      count: this.ApprovalSelectedCount(),
      total: this.ApprovalActions().length
    });
  }

  /**
   * Réinitialise la carte d'approbation à l'état initial (en attente, sélections par défaut).
   */
  public ApprovalReset(): void
  {
    this.ApprovalDecision.set(null);
    this.ApprovalSelected.set({ p1: true, c1: true, p2: false, b1: true });
    this.PostHog.Capture(this.BuildTrackingName('playground_ai_approval_reset', 'tracking'));
  }

  //#endregion
}
