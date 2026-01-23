/**
 * Custom hook для работы с чатом.
 * 
 * Обоснование: Централизует логику работы с чатом,
 * упрощает управление состоянием и API запросами.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getConversationHistory,
  getConversationPartners,
  getUnreadCount,
  markMessagesAsRead,
  sendMessage,
  archiveConversation,
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  submitCommunicationRating,
  getUserCommunicationRatings,
  getAverageCommunicationRating,
  ChatMessage,
  ConversationPartner,
  MessageTemplate,
  CommunicationRating,
} from '@/lib/api/chatApi';

export interface UseChatReturn {
  // Chat state
  messages: ChatMessage[];
  partners: ConversationPartner[];
  unreadCount: number;
  templates: MessageTemplate[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Chat actions
  loadConversation: (otherUserId: string) => Promise<void>;
  loadPartners: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  handleSendMessage: (recipientId: string, content: string, mediaFile?: File, orderId?: string) => Promise<void>;
  handleMarkAsRead: (senderId: string) => Promise<void>;
  handleArchive: (otherUserId: string) => Promise<void>;
  handleCreateTemplate: (title: string, content: string) => Promise<void>;
  handleUpdateTemplate: (templateId: string, title: string, content: string) => Promise<void>;
  handleDeleteTemplate: (templateId: string) => Promise<void>;
  handleSubmitRating: (orderId: string, ratedUserId: string, rating: number, comment: string) => Promise<void>;
}

export const useChat = (token: string, currentUserId: string): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partners, setPartners] = useState<ConversationPartner[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversation history
  const loadConversation = useCallback(async (otherUserId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getConversationHistory(token, otherUserId);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load conversation partners
  const loadPartners = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getConversationPartners(token);
      setPartners(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
      console.error('Failed to load partners:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load message templates
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMessageTemplates(token);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Send message
  const handleSendMessage = useCallback(async (
    recipientId: string,
    content: string,
    mediaFile?: File,
    orderId?: string
  ) => {
    setIsSending(true);
    setError(null);
    try {
      const messageType = mediaFile
        ? (mediaFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE')
        : 'TEXT';
      const newMessage = await sendMessage(
        token,
        recipientId,
        content,
        messageType,
        mediaFile,
        orderId
      );
      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Failed to send message:', err);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [token]);

  // Mark messages as read
  const handleMarkAsRead = useCallback(async (senderId: string) => {
    try {
      await markMessagesAsRead(token, senderId);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
      throw err;
    }
  }, [token]);

  // Archive conversation
  const handleArchive = useCallback(async (otherUserId: string) => {
    if (!confirm('Архивировать переписку?')) return;
    try {
      await archiveConversation(token, otherUserId);
      setPartners(prev => prev.filter(p => p.user_id !== otherUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive conversation');
      console.error('Failed to archive conversation:', err);
      throw err;
    }
  }, [token]);

  // Create message template
  const handleCreateTemplate = useCallback(async (title: string, content: string) => {
    try {
      const newTemplate = await createMessageTemplate(token, title, content);
      setTemplates(prev => [...prev, newTemplate]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      console.error('Failed to create template:', err);
      throw err;
    }
  }, [token]);

  // Update message template
  const handleUpdateTemplate = useCallback(async (templateId: string, title: string, content: string) => {
    try {
      const updatedTemplate = await updateMessageTemplate(token, templateId, title, content);
      setTemplates(prev =>
        prev.map(t => t.id === templateId ? updatedTemplate : t)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
      console.error('Failed to update template:', err);
      throw err;
    }
  }, [token]);

  // Delete message template
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteMessageTemplate(token, templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      console.error('Failed to delete template:', err);
      throw err;
    }
  }, [token]);

  // Submit communication rating
  const handleSubmitRating = useCallback(async (
    orderId: string,
    ratedUserId: string,
    rating: number,
    comment: string
  ) => {
    try {
      await submitCommunicationRating(token, orderId, ratedUserId, rating, comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
      console.error('Failed to submit rating:', err);
      throw err;
    }
  }, [token]);

  // Load unread count on mount
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await getUnreadCount(token);
        setUnreadCount(count);
      } catch (err) {
        console.error('Failed to load unread count:', err);
      }
    };
    loadUnreadCount();
  }, [token]);

  return {
    messages,
    partners,
    unreadCount,
    templates,
    isLoading,
    isSending,
    error,
    loadConversation,
    loadPartners,
    loadTemplates,
    handleSendMessage,
    handleMarkAsRead,
    handleArchive,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleDeleteTemplate,
    handleSubmitRating,
  };
};
