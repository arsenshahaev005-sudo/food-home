import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import {
  getPushNotificationPermission,
  requestPushNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscription,
  registerServiceWorker,
  isPushNotificationSupported,
  PushNotificationPermission,
} from '@/services/pushNotificationService';

interface PushNotificationSettingsProps {
  applicationServerKey: string;
  serviceWorkerPath: string;
  onSuccess?: () => void;
}

const PushNotificationSettings = ({
  applicationServerKey,
  serviceWorkerPath,
  onSuccess,
}: PushNotificationSettingsProps) => {
  const [permission, setPermission] = useState<PushNotificationPermission>({ state: 'default' });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    setIsLoading(true);
    setError(null);

    if (!isPushNotificationSupported()) {
      setPermission({ state: 'unsupported' });
      setIsLoading(false);
      return;
    }

    try {
      // Get current permission
      const currentPermission = getPushNotificationPermission();
      setPermission(currentPermission);

      // Register service worker
      const registration = await registerServiceWorker(serviceWorkerPath);
      if (!registration) {
        throw new Error('Failed to register service worker');
      }

      // Check if already subscribed
      const subscription = await getPushSubscription(registration);
      setIsSubscribed(subscription !== null);
    } catch (err: any) {
      console.error('Error initializing push notifications:', err);
      setError('Не удалось инициализировать push-уведомления. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnablePush = async () => {
    setIsToggling(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Request permission
      const newPermission = await requestPushNotificationPermission();
      setPermission(newPermission);

      if (newPermission.state !== 'granted') {
        setError('Разрешение на push-уведомления не было предоставлено.');
        setIsToggling(false);
        return;
      }

      // Register service worker
      const registration = await registerServiceWorker(serviceWorkerPath);
      if (!registration) {
        throw new Error('Failed to register service worker');
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications(registration, applicationServerKey);
      if (!subscription) {
        throw new Error('Failed to subscribe to push notifications');
      }

      // Send subscription to backend
      await sendSubscriptionToBackend(subscription);

      setIsSubscribed(true);
      setSuccessMessage('Push-уведомления успешно включены!');
      setTimeout(() => {
        setSuccessMessage(null);
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      console.error('Error enabling push notifications:', err);
      setError('Не удалось включить push-уведомления. Пожалуйста, попробуйте позже.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDisablePush = async () => {
    setIsToggling(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Register service worker
      const registration = await registerServiceWorker(serviceWorkerPath);
      if (!registration) {
        throw new Error('Failed to register service worker');
      }

      // Unsubscribe from push notifications
      const unsubscribed = await unsubscribeFromPushNotifications(registration);
      if (!unsubscribed) {
        throw new Error('Failed to unsubscribe from push notifications');
      }

      // Remove subscription from backend
      await removeSubscriptionFromBackend();

      setIsSubscribed(false);
      setSuccessMessage('Push-уведомления успешно отключены!');
      setTimeout(() => {
        setSuccessMessage(null);
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      console.error('Error disabling push notifications:', err);
      setError('Не удалось отключить push-уведомления. Пожалуйста, попробуйте позже.');
    } finally {
      setIsToggling(false);
    }
  };

  const sendSubscriptionToBackend = async (subscription: any) => {
    // TODO: Implement API call to send subscription to backend
    console.log('Sending subscription to backend:', subscription);
  };

  const removeSubscriptionFromBackend = async () => {
    // TODO: Implement API call to remove subscription from backend
    console.log('Removing subscription from backend');
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

  if (permission.state === 'unsupported') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">Push-уведомления не поддерживаются</p>
            <p className="text-sm text-yellow-700 mt-1">
              Ваш браузер не поддерживает push-уведомления. Пожалуйста, используйте современный браузер.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-orange-500" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <h2 className="text-2xl font-bold text-gray-900">Push-уведомления</h2>
        </div>
        <p className="text-gray-600">
          Получайте уведомления о заказах, акциях и новостях прямо в браузере
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

      {/* Permission Denied */}
      {permission.state === 'denied' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">Разрешение отклонено</p>
            <p className="text-sm text-yellow-700 mt-1">
              Вы отклонили разрешение на push-уведомления. Чтобы включить их, зайдите в настройки вашего браузера и разрешите уведомления для этого сайта.
            </p>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className="mb-6 p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 mb-1">Статус</p>
            <p className={`text-sm ${isSubscribed ? 'text-green-600' : 'text-gray-600'}`}>
              {isSubscribed ? 'Включены' : 'Отключены'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isSubscribed ? 'bg-green-100' : 'bg-gray-200'
          }`}>
            {isSubscribed ? (
              <Bell className="w-6 h-6 text-green-600" />
            ) : (
              <BellOff className="w-6 h-6 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="flex gap-3">
        {isSubscribed ? (
          <button
            onClick={handleDisablePush}
            disabled={isToggling}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            aria-busy={isToggling}
          >
            {isToggling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Отключение...
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                Отключить уведомления
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleEnablePush}
            disabled={isToggling || permission.state === 'denied'}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            aria-busy={isToggling}
          >
            {isToggling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Включение...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Включить уведомления
              </>
            )}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 mb-1">Как это работает</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Вы будете получать уведомления о статусе заказа</li>
              <li>• Акции и специальные предложения</li>
              <li>• Новости и обновления сервиса</li>
              <li>• Вы можете отключить уведомления в любой момент</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationSettings;
