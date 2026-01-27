/**
 * Компонент шаблонов сообщений.
 * 
 * Обоснование: Шаблоны частых вопросов
 * экономят время продавцам и обеспечивают
 * единообразие коммуникации.
 */

import React, { useState } from 'react';
import { MessageTemplate } from '@/lib/api/chatApi';

interface MessageTemplatesProps {
  templates: MessageTemplate[];
  onSelectTemplate: (content: string) => void; // eslint-disable-line no-unused-vars
  onCreateTemplate?: (title: string, content: string) => Promise<void>; // eslint-disable-line no-unused-vars
  onUpdateTemplate?: (templateId: string, title: string, content: string) => Promise<void>; // eslint-disable-line no-unused-vars
  onDeleteTemplate?: (templateId: string) => Promise<void>; // eslint-disable-line no-unused-vars
  isCreating?: boolean;
}

export const MessageTemplates: React.FC<MessageTemplatesProps> = ({
  templates,
  onSelectTemplate,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  isCreating = false,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      await onCreateTemplate?.(newTitle, newContent);
      setNewTitle('');
      setNewContent('');
      setIsCreatingNew(false);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplateId(template.id);
    setEditTitle(template.title);
    setEditContent(template.content);
  };

  const handleUpdate = async () => {
    if (!editingTemplateId || !editTitle.trim() || !editContent.trim()) return;
    try {
      await onUpdateTemplate?.(editingTemplateId, editTitle, editContent);
      setEditingTemplateId(null);
      setEditTitle('');
      setEditContent('');
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Удалить шаблон?')) return;
    try {
      await onDeleteTemplate?.(templateId);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditTitle('');
    setEditContent('');
  };

  if (templates.length === 0 && !isCreatingNew) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-500 mb-4">Нет шаблонов сообщений</p>
        {onCreateTemplate && (
          <button
            onClick={() => setIsCreatingNew(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Создать новый шаблон"
            type="button"
          >
            + Создать шаблон
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Шаблоны сообщений</h3>
        {onCreateTemplate && !isCreatingNew && (
          <button
            onClick={() => setIsCreatingNew(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Создать новый шаблон"
            type="button"
          >
            + Новый
          </button>
        )}
      </div>

      {/* Templates list */}
      <div className="p-4 space-y-3">
        {/* Create new template form */}
        {isCreatingNew && (
          <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Название шаблона"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              disabled={isCreating}
              aria-label="Название шаблона"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Текст сообщения"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 resize-none"
              rows={3}
              disabled={isCreating}
              aria-label="Текст сообщения"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isCreating || !newTitle.trim() || !newContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Сохранить шаблон"
                type="button"
              >
                {isCreating ? '...' : 'Сохранить'}
              </button>
              <button
                onClick={() => {
                  setIsCreatingNew(false);
                  setNewTitle('');
                  setNewContent('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                aria-label="Отмена"
                type="button"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Existing templates */}
        {templates.map((template) => (
          <div
            key={template.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            {editingTemplateId === template.id ? (
              // Edit mode
              <div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  aria-label="Название шаблона"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 resize-none"
                  rows={3}
                  aria-label="Текст сообщения"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    disabled={!editTitle.trim() || !editContent.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Сохранить изменения"
                    type="button"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    aria-label="Отмена"
                    type="button"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{template.title}</h4>
                  <div className="flex gap-2">
                    {onUpdateTemplate && (
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        aria-label="Редактировать шаблон"
                        type="button"
                      >
                        ✏️
                      </button>
                    )}
                    {onDeleteTemplate && (
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                        aria-label="Удалить шаблон"
                        type="button"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 whitespace-pre-wrap">{template.content}</p>
                <button
                  onClick={() => onSelectTemplate(template.content)}
                  className="mt-3 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  aria-label="Использовать этот шаблон"
                  type="button"
                >
                  Использовать шаблон
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
