/**
 * Компонент окна чата с уведомлениями.
 * 
 * Обоснование: Уведомления о новых сообщениях
 * и возможность отправки фото улучшают коммуникацию
 * между покупателем и продавцом.
 */

import React, { useState, useRef, useEffect } from 'react';
import { getFullImageUrl } from '@/lib/api';
import { ChatMessage } from '@/lib/api/chatApi';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, mediaFile?: File) => Promise<void>;
  onMarkAsRead: () => Promise<void>;
  unreadCount: number;
  isSending?: boolean;
  currentUserId: string;
  otherUserName?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  onMarkAsRead,
  unreadCount,
  isSending = false,
  currentUserId,
  otherUserName,
}) => {
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when component mounts
  useEffect(() => {
    if (unreadCount > 0) {
      onMarkAsRead();
    }
  }, [unreadCount, onMarkAsRead]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !selectedFile) || isSending) return;

    try {
      await onSendMessage(messageText, selectedFile || undefined);
      setMessageText('');
      handleRemoveFile();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 36000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const isOwnMessage = (message: ChatMessage): boolean => {
    return message.sender.id === currentUserId;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Нет сообщений. Начните диалог!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  isOwnMessage(message)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900'
                }`}
              >
                {/* Sender name for other's messages */}
                {!isOwnMessage(message) && otherUserName && (
                  <p className="text-xs font-semibold mb-1 opacity-75">
                    {otherUserName}
                  </p>
                )}

                {/* Media content */}
                {message.media_url && (
                  <div className="mb-2">
                    {message.message_type === 'IMAGE' && (
                      <img
                        src={getFullImageUrl(message.media_url)}
                        alt="Прикрепленное изображение"
                        className="max-w-full rounded-md"
                      />
                    )}
                    {message.message_type === 'VIDEO' && (
                      <video
                        src={getFullImageUrl(message.media_url)}
                        controls
                        className="max-w-full rounded-md"
                      />
                    )}
                  </div>
                )}

                {/* Text content */}
                {message.content && (
                  <p className="break-words whitespace-pre-wrap">{message.content}</p>
                )}

                {/* Order reference */}
                {message.order && (
                  <p className="text-xs mt-2 opacity-75">
                    Заказ: {message.order.dish_name}
                  </p>
                )}

                {/* Timestamp */}
                <p className={`text-xs mt-1 ${isOwnMessage(message) ? 'text-blue-100' : 'text-gray-500'}`}>
                  {formatTime(message.created_at)}
                  {!message.is_read && isOwnMessage(message) && (
                    <span className="ml-2">✓</span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-4">
        {/* File preview */}
        {previewUrl && (
          <div className="mb-3 relative inline-block">
            <img
              src={previewUrl}
              alt="Предпросмотр"
              className="h-20 rounded-md"
            />
            <button
              onClick={handleRemoveFile}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              aria-label="Удалить файл"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {/* Message input */}
        <div className="flex gap-2">
          {/* File input button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Прикрепить файл"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Прикрепить файл"
            type="button"
          >
            📎
          </button>

          {/* Text input */}
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={1}
            disabled={isSending}
            aria-label="Сообщение"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={(!messageText.trim() && !selectedFile) || isSending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Отправить сообщение"
            type="button"
          >
            {isSending ? '...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
};
