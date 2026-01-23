'use client';

import { useState, useEffect } from 'react';
import { archiveChat, getArchivedChats } from '@/lib/api';

interface Chat {
  id: string;
  name: string;
  last_message: string;
  timestamp: string;
  unread_count: number;
  is_archived: boolean;
}

interface ChatWithArchiveProps {
  chats: Chat[];
  onChatSelect: (chatId: string) => void;
  currentChatId: string | null;
  token: string;
}

const ChatWithArchive: React.FC<ChatWithArchiveProps> = ({ 
  chats, 
  onChatSelect, 
  currentChatId,
  token
}) => {
  const [archivedChats, setArchivedChats] = useState<Chat[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      loadArchivedChats();
    }
  }, [token]);

  const loadArchivedChats = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const archived = await getArchivedChats(token);
      setArchivedChats(archived);
    } catch (error) {
      console.error('Error loading archived chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the chat
    
    if (!token) {
      alert('Для архивации чата необходимо авторизоваться');
      return;
    }
    
    if (confirm('Вы уверены, что хотите архивировать этот чат?')) {
      try {
        await archiveChat(chatId, token);
        // Refresh both active and archived chats
        loadArchivedChats();
        // Optionally, notify parent component to refresh active chats
      } catch (error) {
        console.error('Error archiving chat:', error);
        alert('Ошибка при архивации чата');
      }
    }
  };

  const allChats = showArchived ? archivedChats : chats;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
        <h2 className="text-lg font-bold">
          {showArchived ? 'Архивные чаты' : 'Чаты'}
        </h2>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="text-sm font-medium text-[#c9825b] hover:underline"
        >
          {showArchived ? 'Показать активные' : 'Показать архив'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#c9825b]"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {allChats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {showArchived ? 'Нет архивных чатов' : 'Нет активных чатов'}
            </div>
          ) : (
            <ul className="space-y-2">
              {allChats.map((chat) => (
                <li key={chat.id}>
                  <button
                    onClick={() => onChatSelect(chat.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                      currentChatId === chat.id 
                        ? 'bg-[#c9825b]/10 border border-[#c9825b]/30' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{chat.name}</h3>
                        {chat.unread_count > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{chat.last_message}</p>
                      <p className="text-xs text-gray-400 mt-1">{chat.timestamp}</p>
                    </div>
                    
                    {!showArchived && (
                      <button
                        onClick={(e) => handleArchiveChat(chat.id, e)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                        aria-label="Архивировать чат"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWithArchive;