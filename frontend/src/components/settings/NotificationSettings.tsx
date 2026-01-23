import React, { useState, useEffect } from 'react';
import { Mail, Bell, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { 
  getNotificationSettings, 
  updateNotificationSettings,
  NotificationSettings 
} from '@/lib/api/notificationApi';

interface NotificationSettingsProps {
  token: string;
  onSuccess?: () => void;
}

const NotificationSettings = ({ token, onSuccess }: NotificationSettingsProps) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [token]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const settingsData = await getNotificationSettings(token);
      setSettings(settingsData);
    } catch (err: any) {
      console.error('Error loading notification settings:', err);
      setError('Не удалось загрузить настройки уведомлений. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateNotificationSettings(newSettings, token);
      setSuccessMessage('Настройки успешно сохранены!');
      setTimeout(() => {
        setSuccessMessage(null);
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      console.error('Error saving notification settings:', err);
      setError('Не удалось сохранить настройки. Пожалуйста, попробуйте позже.');
      // Revert to previous settings on error
      loadSettings();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
          <p className="text-gray-600">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error || 'Не удалось загрузить настройки'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Настройки уведомлений</h2>
        <p className="text-gray-600">
          Управляйте тем, как и когда вы получаете уведомления
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Email Notifications */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Email-уведомления</h3>
        </div>

        <div className="space-y-4">
          {/* Email Enabled */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Включить email-уведомления</p>
              <p className="text-sm text-gray-600">Получать уведомления на email</p>
            </div>
            <button
              onClick={() => handleToggle('email_enabled')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                settings.email_enabled ? 'bg-orange-500' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={settings.email_enabled}
              aria-label="Включить email-уведомления"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Order Updates */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Обновления заказов</p>
              <p className="text-sm text-gray-600">Статус заказа, доставка, оплата</p>
            </div>
            <button
              onClick={() => handleToggle('email_order_updates')}
              disabled={isSaving || !settings.email_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                settings.email_order_updates && settings.email_enabled ? 'bg-orange-500' : 'bg-gray-300'
              } ${!settings.email_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={settings.email_order_updates}
              aria-label="Обновления заказов"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email_order_updates && settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Promotions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Акции и предложения</p>
              <p className="text-sm text-gray-600">Скидки, промокоды, специальные предложения</p>
            </div>
            <button
              onClick={() => handleToggle('email_promotions')}
              disabled={isSaving || !settings.email_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                settings.email_promotions && settings.email_enabled ? 'bg-orange-500' : 'bg-gray-300'
              } ${!settings.email_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={settings.email_promotions}
              aria-label="Акции и предложения"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email_promotions && settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Newsletter */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Рассылка новостей</p>
              <p className="text-sm text-gray-600">Рецепты, кулинарные советы, новости</p>
            </div>
            <button
              onClick={() => handleToggle('email_newsletter')}
              disabled={isSaving || !settings.email_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                settings.email_newsletter && settings.email_enabled ? 'bg-orange-500' : 'bg-gray-300'
              } ${!settings.email_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={settings.email_newsletter}
              aria-label="Рассылка новостей"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email_newsletter && settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Reminders */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Напоминания</p>
              <p className="text-sm text-gray-600">Забытая корзина, неактивный заказ</p>
            </div>
            <button
              onClick={() => handleToggle('email_reminders')}
              disabled={isSaving || !settings.email_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                settings.email_reminders && settings.email_enabled ? 'bg-orange-500' : 'bg-gray-300'
              } ${!settings.email_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={settings.email_reminders}
              aria-label="Напоминания"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email_reminders && settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Push-уведомления</h3>
        </div>

        <div className="space-y-4">
          {/* Push Enabled */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Включить push-уведомления</p>
              <p className="text-sm text-gray-600">Получать уведомления в браузере</p>
            </div>
            <button
              onClick={() => handleToggle('push_enabled')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                settings.push_enabled ? 'bg-orange-500' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={settings.push_enabled}
              aria-label="Включить push-уведомления"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.push_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push Order Updates */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Обновления заказов</p>
              <p className="text-sm text-gray-600">Статус заказа, доставка, оплата</p>
            </div>
            <button
              onClick={() => handleToggle('push_order_updates')}
              disabled={isSaving || !settings.push_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                settings.push_order_updates && settings.push_enabled ? 'bg-orange-500' : 'bg-gray-300'
              } ${!settings.push_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={settings.push_order_updates}
              aria-label="Push обновления заказов"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.push_order_updates && settings.push_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push Promotions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Акции и предложения</p>
              <p className="text-sm text-gray-600">Скидки, промокоды, специальные предложения</p>
            </div>
            <button
              onClick={() => handleToggle('push_promotions')}
              disabled={isSaving || !settings.push_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                settings.push_promotions && settings.push_enabled ? 'bg-orange-500' : 'bg-gray-300'
              } ${!settings.push_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={settings.push_promotions}
              aria-label="Push акции и предложения"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.push_promotions && settings.push_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
