import { Component, ChangeDetectionStrategy, Input, inject, OnInit, signal, computed } from '@angular/core';
import { GridComponent } from '@shared/components/grid/grid.component';
import { GridColumnDirective } from '@shared/components/grid/grid-column.directive';
import { AddressMapTooltipComponent } from '@shared/components/address-map-tooltip/address-map-tooltip.component';
import { FilterFieldConfig } from '@shared/components/FilterBar/filter-bar.component';
import { IInputOption } from '@shared/components/input/input.types';
import { ContactsDTO } from '@core/crm/dto/contacts/contacts.dto';
import { ContactsCritereDTO } from '@core/crm/dto/contacts/contacts.critere';
import { GetContactsFieldValidator, ContactsValidator } from '@core/crm/dto/contacts/contacts.validator';
import { AdressesDTO } from '@core/sellmatchdb/dto';
import { IMapMarker } from '@shared/components/map-card/IMapMarker';
import { EMarkerType } from '@shared/components/map-card/EMarkerType';
import { ContactsService } from '@core/crm/services/contacts/contacts.service';
import { GridComponentBase } from '@shared/components/grid/grid-component-base';
import { PopupComponent } from '@shared/components/popup/popup.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { RefTypeContactService } from '@core/crm/services/ref-type-contact/ref-type-contact.service';
import { RefTypeContactCritereDTO } from '@core/crm/dto/ref-type-contact/ref-type-contact.critere';
import { RefOrigineContactService } from '@core/crm/services/ref-origine-contact/ref-origine-contact.service';
import { RefOrigineContactCritereDTO } from '@core/crm/dto/ref-origine-contact/ref-origine-contact.critere';
import { TranslateKeyPipe } from '@core/services/i18n/TranslateKeyPipe';

/**
 * Grille CRUD Contacts.
 * Pagination, tri, filtres, suppression simple/en lot gérés par GridComponentBase.
 * Surcharges : Service (DI), LoadRefOptions (référentiels type+origine), CreateNewContact,
 * ApplyAddressToRow (cas spécial adresse FK+nav), BuildMapMarkers.
 */
@Component({
  selector: 'app-contact-grid',
  standalone: true,
  imports: [GridComponent, GridColumnDirective, PopupComponent, ButtonComponent],
  templateUrl: './contact-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactGridComponent extends GridComponentBase<ContactsDTO, ContactsCritereDTO> implements OnInit {
  //#region Attributes
  private readonly _ContactsService: ContactsService = inject(ContactsService);
  private readonly _RefTypeContactService: RefTypeContactService = inject(RefTypeContactService);
  private readonly _RefOrigineContactService: RefOrigineContactService = inject(RefOrigineContactService);
  //#endregion

  //#region Properties
  /** Préfixe de référence (contact). */
  protected readonly PREFIX: string = 'CON';

  /** Options du référentiel type de contact. */
  public readonly TypeContactOptions = signal<IInputOption[]>([]);
  /** Options du référentiel origine. */
  public readonly OrigineOptions = signal<IInputOption[]>([]);
  /** Options statiques Oui/Non pour la colonne Consentement. */
  public readonly ConsentementOptions: IInputOption[] = [
    { Value: true, Label: 'Oui' },
    { Value: false, Label: 'Non' }
  ];

  /** Champs de filtre de la grid Contacts. */
  public readonly ContactFilterFields = computed<FilterFieldConfig[]>(() => {
    void this.Translate.InstantTick();
    return [
      { Key: 'prenom', LabelCle: 'crm-contacts-grid.filters.prenom', Type: 'text', PlaceholderCle: 'contacts.prenomPlaceholder', MaxLength: this.GetFieldMaxLength('prenom') },
      { Key: 'nom', LabelCle: 'crm-contacts-grid.filters.nom', Type: 'text', PlaceholderCle: 'contacts.nomPlaceholder', MaxLength: this.GetFieldMaxLength('nom') },
      { Key: 'email', LabelCle: 'crm-contacts-grid.filters.email', Type: 'text', PlaceholderCle: 'contacts.emailPlaceholder', MaxLength: this.GetFieldMaxLength('email') },
      { Key: 'telephone', LabelCle: 'crm-contacts-grid.filters.telephone', Type: 'text', PlaceholderCle: 'contacts.telephonePlaceholder', MaxLength: this.GetFieldMaxLength('telephone') },
      { Key: 'adresse', LabelCle: 'crm-contacts-grid.filters.adresse', Type: 'address' },
      { Key: 'typeContactId', LabelCle: 'crm-contacts-grid.filters.typeContactId', Type: 'select', Options: this.TypeContactOptions() },
      { Key: 'origineId', LabelCle: 'crm-contacts-grid.filters.origineId', Type: 'select', Options: this.OrigineOptions() },
      { Key: 'dateDerniereAction', LabelCle: 'crm-contacts-grid.filters.dateDerniereAction', Type: 'date' }
    ];
  });

  /** StorageKey pour la persistance des colonnes. */
  @Input() public override StorageKey: string = 'crm-contacts-grid';
  /** Active la barre de filtre (true par défaut). */
  @Input() public Filterable: boolean = true;
  /** Active la sélection de lignes (false par défaut). */
  @Input() public Selectable: boolean = false;
  //#endregion

  //#region Lifecycle
  public ngOnInit(): void {
    void this.LoadRefOptions();
    if (this.ServerSide) { void this.LoadCurrentPage(); }
  }
  //#endregion

  //#region Methods
  /** Charge les options des référentiels (type + origine). */
  private async LoadRefOptions(): Promise<void> {
    try {
      const lTypeCritere: RefTypeContactCritereDTO = { style: {}, includeStyleEmpty: true };
      const lOrigineCritere: RefOrigineContactCritereDTO = { style: {}, includeStyleEmpty: true };
      const [lTypes, lOrigines] = await Promise.all([
        this._RefTypeContactService.getAll(lTypeCritere),
        this._RefOrigineContactService.getAll(lOrigineCritere)
      ]);

      this.TypeContactOptions.set(
        (lTypes ?? [])
          .map((pI) => ({ Label: pI.libelle!, Value: pI.id!, style: pI.style }))
      );
      this.OrigineOptions.set(
        (lOrigines ?? [])
          .map((pI) => ({ Label: pI.libelle!, Value: pI.id!, style: pI.style }))
      );
    } catch (pErr) {
      console.error('Erreur chargement référentiels contacts', pErr);
    }
  }

  /** TrackBy pour le ngFor de la grid. */
  public TrackByContact(pItem: ContactsDTO): string {
    return String(pItem.id ?? '');
  }

  /** Récupère la fonction de validation pour un champ éditable de contact. */
  public GetFieldValidator(pKey: string): ((pValue: unknown, pRow: ContactsDTO) => string | null) | null {
    return GetContactsFieldValidator(pKey);
  }

  /** Lit la longueur max d'un champ depuis le validator TS. */
  public GetFieldMaxLength(pKey: string): number | null {
    const lRule: { MaxLength?: number } | undefined = ContactsValidator[pKey];
    return lRule?.MaxLength ?? null;
  }

  /**
   * Crée un nouveau DTO contact avec id temporaire.
   * - cm - Arrow function obligatoire : `this` doit rester lié au composant
   *      quand `app-grid` appelle `this.NewRowFactory()` (cf. skill
   *      sellmatch-angular-grid-crud, Problème 1).
   */
  public CreateNewContact = (): ContactsDTO => {
    return this.CreateNewRow();
  };

  /**
   * Applique une nouvelle valeur sur le DTO local avant persistance.
   * Override de la base pour gérer le cas spécial `adresse` (FK + nav property).
   */
  public override ApplyCellValue(pRow: ContactsDTO, pKey: string, pValue: unknown): void {
    if (pKey === 'adresse' && pValue && typeof pValue === 'object' && 'id' in pValue && 'city' in pValue) {
      const lAddress = pValue as AdressesDTO;
      pRow.adresse = lAddress;
      pRow.adresseId = lAddress.id;
      return;
    }
    super.ApplyCellValue(pRow, pKey, pValue);
  }

  /** Expose le service Contacts à la mécanique d'OnCellEdited de la base. */
  protected override get Service(): ContactsService { return this._ContactsService; }

  /** Recharge la page courante après une édition (mode server-side). */
  protected override async ReloadAfterEdit(): Promise<void> { if (this.ServerSide) { await this.LoadCurrentPage(); } }

  /**
   * Construit les marqueurs de carte enrichis pour les contacts affichés.
   * @param pData La liste des contacts.
   */
  public BuildMapMarkers(pData: ContactsDTO[]): IMapMarker[] {
    const lGetLabel = (pItem: ContactsDTO): string => {
      const lPrenom: string = pItem.prenom ?? '';
      const lNom: string = pItem.nom ?? '';
      const lFull: string = `${lPrenom}${lPrenom && lNom ? ' ' : ''}${lNom}`.trim();
      return lFull || `Contact #${pItem.id ?? ''}`;
    };
    const lGetInitials = (pItem: ContactsDTO): string => {
      const lP: string = (pItem.prenom ?? '').charAt(0);
      const lN: string = (pItem.nom ?? '').charAt(0);
      return `${lP}${lN}`.toUpperCase() || 'C';
    };
    return pData
      .filter((pItem: ContactsDTO) => {
        const lLat: number = Number(pItem.adresse?.latitude ?? 0);
        const lLng: number = Number(pItem.adresse?.longitude ?? 0);
        return lLat !== 0 && lLng !== 0;
      })
      .map((pItem: ContactsDTO) => {
        const lLabel: string = lGetLabel(pItem);
        const lTypeContact: string = pItem.typeContact?.libelle ?? '';
        const lOrigine: string = pItem.origine?.libelle ?? '';
        const lVille: string = pItem.adresse?.city ?? '';
        const lAdresse: string = [pItem.adresse?.housenumber, pItem.adresse?.street, lVille].filter((pPart: string | undefined) => !!pPart).join(' ');
        const lPopupLines: string[] = [
          `<strong>${lLabel}</strong>`,
          lAdresse,
          pItem.email ? `Email : ${pItem.email}` : '',
          pItem.telephone ? `Tél : ${pItem.telephone}` : '',
          lTypeContact ? `Type : ${lTypeContact}` : '',
          lOrigine ? `Origine : ${lOrigine}` : ''
        ].filter((pPart: string) => pPart !== '');
        return {
          Lat: Number(pItem.adresse?.latitude ?? 0),
          Lng: Number(pItem.adresse?.longitude ?? 0),
          Title: lLabel,
          Subtitle: [lTypeContact, lVille].filter((pPart: string) => pPart !== '').join(' · ') || undefined,
          Popup: lPopupLines.join('<br>'),
          Color: 'var(--sm-success)',
          Icon: 'person',
          Label: lGetInitials(pItem),
          Type: EMarkerType.Contact
        };
      });
  }
  //#endregion
}
