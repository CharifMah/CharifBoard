import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@core/base/BaseComponent';
import { ProStateService } from '@core/states/pro-state/pro-state.service';
import { Subject, takeUntil } from 'rxjs';
import { ChatService } from '@core/services/Chats/ChatService';
import { ConversationsDTO } from '@core/sellmatchdb/dto/conversations/conversations.dto';
import { MessagesDTO } from '@core/sellmatchdb/dto/messages/messages.dto';

interface MessageCard
{
  Id: number;
  Expediteur: string;
  Date: Date | string;
  Sujet: string;
  Apercu: string;
  Type: string;
  Lu: boolean;
  ConversationId: number;
  LastMessageId?: number;
}

@Component({
  selector: 'app-message-card',
  standalone: true,
  templateUrl: './message-card.component.html',
  styleUrls: ['./message-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule]
})
export class MessageCardComponent extends BaseComponent implements OnInit, OnDestroy
{
  private _State = inject(ProStateService);
  private _ChatService = inject(ChatService);
  private destroy$ = new Subject<void>();
  private lastMessagesCache = new Map<number, MessagesDTO>();
  private joinedConversations = new Set<number>();

  Messages: MessageCard[] = [];
  isLoading = false;

  ngOnInit(): void
  {
    this.setupSignalR();
    this.connectToChat();
  }

  async ngOnDestroy(): Promise<void>
  {
    for (const convId of this.joinedConversations)
    {
      try
      {
        await this._ChatService.leaveConversation(convId);
      } catch (error)
      {
        console.error(`Erreur leave conversation ${convId}:`, error);
      }
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSignalR(): void
  {
    this._ChatService.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state =>
      {
        if (state === 'Connected') this._ChatService.getConversations();
      });

    this._ChatService.conversations$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async convs =>
      {
        if (convs?.length)
        {
          await this.joinAllConversations(convs);
          await this.loadAllLastMessages(convs);
          this.processConversations(convs);
        }
        else
        {
          this.Messages = [];
        }
        this.isLoading = false;
      });

    this._ChatService.messageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg =>
      {
        if (msg) this.handleNewMessage(msg);
      });

    this._ChatService.messagesLoaded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(msgs =>
      {
        if (msgs && msgs.length > 0)
        {
          const convId = msgs[0].conversationId;
          const lastMsg = msgs[msgs.length - 1];

          if (convId && lastMsg)
          {
            this.lastMessagesCache.set(convId, lastMsg);
            this.updateMessageCard(convId, lastMsg);
          }
        }
      });
  }

  private async connectToChat(): Promise<void>
  {
    this.isLoading = true;
    try
    {
      await this._ChatService.connect();
    } catch (error)
    {
      this.isLoading = false;
    }
  }

  private async joinAllConversations(conversations: ConversationsDTO[]): Promise<void>
  {
    for (const conv of conversations)
    {
      if (conv.id && !this.joinedConversations.has(conv.id))
      {
        try
        {
          await this._ChatService.joinConversation(conv.id);
          this.joinedConversations.add(conv.id);
        } catch (error)
        {
          console.error(`Erreur join conversation ${conv.id}:`, error);
        }
      }
    }
  }

  private async loadAllLastMessages(conversations: ConversationsDTO[]): Promise<void>
  {
    for (const conv of conversations)
    {
      if (conv.id && (!conv.messages || conv.messages.length === 0))
      {
        try
        {
          await this._ChatService.getMessages(conv.id, 0, 1);
        } catch (error)
        {
          console.error(`Erreur chargement conversation ${conv.id}:`, error);
        }
      }
    }
  }

  private updateMessageCard(convId: number, lastMsg: MessagesDTO): void
  {
    const idx = this.Messages.findIndex(m => m.ConversationId === convId);
    if (idx !== -1)
    {
      const content = lastMsg.content || 'Nouveau message';

      this.Messages[idx] = {
        ...this.Messages[idx],
        Expediteur: this.getSenderName(lastMsg), // Utilise le bon nom
        Date: lastMsg.createdAt || new Date(),
        Apercu: content.length > 50 ? content.substring(0, 50) + '...' : content,
        Lu: lastMsg.senderId === this.UsersService.currentUser?.id || !!lastMsg.readAt,
        LastMessageId: lastMsg.id
      };

      this.Messages = [...this.Messages];
    }
  }

  private processConversations(conversations: ConversationsDTO[]): void
  {
    this.Messages = conversations
      .filter(c => c?.id)
      .map(conv =>
      {
        const lastMsg = this.getLastMessage(conv);
        const content = lastMsg?.content || 'Aucun message';

        return {
          Id: conv.id!,
          Expediteur: this.getConversationSenderName(conv, lastMsg), // Nom complet
          Date: lastMsg?.createdAt || conv.updatedAt || new Date(),
          Sujet: this.getConversationSubject(conv), // Sujet complet
          Apercu: content.length > 50 ? content.substring(0, 50) + '...' : content,
          Type: this.IsVendeur ? 'vendeur' : 'professionnel',
          Lu: !lastMsg || lastMsg.senderId === this.UsersService.currentUser?.id || !!lastMsg.readAt,
          ConversationId: conv.id!,
          LastMessageId: lastMsg?.id
        };
      })
      .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
  }

  private getLastMessage(conv: ConversationsDTO): MessagesDTO | undefined
  {
    if (!conv.messages?.length) return this.lastMessagesCache.get(conv.id!);

    const last = [...conv.messages].sort((a, b) =>
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    )[0];

    if (last) this.lastMessagesCache.set(conv.id!, last);

    return last;
  }

  // Obtenir le nom complet de l'expéditeur du dernier message
  private getConversationSenderName(conv: ConversationsDTO, lastMsg?: MessagesDTO): string
  {
    if (lastMsg?.sender)
    {
      const firstName = lastMsg.sender.firstName || '';
      const lastName = lastMsg.sender.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return fullName || lastMsg.sender.username || 'Utilisateur';
    }

    if (conv.opportunity?.user)
    {
      const firstName = conv.opportunity.user.firstName || '';
      const lastName = conv.opportunity.user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return fullName || conv.opportunity.user.username || 'Utilisateur';
    }

    return 'Utilisateur';
  }

  // Obtenir le sujet complet de la conversation
  private getConversationSubject(conv: ConversationsDTO): string
  {
    if (conv.opportunity?.address)
    {
      return conv.opportunity.address?.street ?? '';
    }

    if (conv.opportunity?.propertyType)
    {
      return conv.opportunity.propertyType;
    }

    return 'Conversation';
  }

  // Obtenir le nom de l'expéditeur d'un message
  private getSenderName(msg: MessagesDTO): string
  {
    if (msg.sender)
    {
      const firstName = msg.sender.firstName || '';
      const lastName = msg.sender.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return fullName || msg.sender.username || 'Utilisateur';
    }

    return 'Utilisateur';
  }

  private handleNewMessage(msg: any): void
  {
    const idx = this.Messages.findIndex(m => m.ConversationId === msg.conversationId);

    if (idx !== -1)
    {
      const content = msg.content || 'Nouveau message';

      this.lastMessagesCache.set(msg.conversationId, {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        createdAt: msg.timestamp || msg.createdAt,
        sender: { id: msg.senderId, username: msg.senderName }
      });

      this.Messages[idx] = {
        ...this.Messages[idx],
        Expediteur: msg.senderName || 'Utilisateur',
        Date: new Date(msg.timestamp || msg.createdAt),
        Apercu: content.length > 50 ? content.substring(0, 50) + '...' : content,
        Lu: msg.senderId === this.UsersService.currentUser?.id,
        LastMessageId: msg.id
      };

      const updated = this.Messages.splice(idx, 1)[0];
      this.Messages = [updated, ...this.Messages];
    } else
    {
      this._ChatService.getConversations();
    }
  }

  GetTimeAgo(pDate: Date | string): string
  {
    return this._State.GetTimeAgo(pDate instanceof Date ? pDate : new Date(pDate));
  }
}
