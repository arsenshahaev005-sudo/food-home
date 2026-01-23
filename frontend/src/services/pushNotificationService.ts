/**
 * Service for handling push notifications
 * This service manages browser push notification permissions and registration
 */

export interface PushNotificationPermission {
  state: 'granted' | 'denied' | 'default' | 'unsupported';
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Check if push notifications are supported in the browser
 */
export const isPushNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Get current push notification permission state
 */
export const getPushNotificationPermission = (): PushNotificationPermission => {
  if (!isPushNotificationSupported()) {
    return { state: 'unsupported' };
  }

  const permission = Notification.permission;
  return { state: permission as 'granted' | 'denied' | 'default' };
};

/**
 * Request push notification permission from the user
 */
export const requestPushNotificationPermission = async (): Promise<PushNotificationPermission> => {
  if (!isPushNotificationSupported()) {
    return { state: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { state: permission as 'granted' | 'denied' | 'default' };
  } catch (error) {
    console.error('Error requesting push notification permission:', error);
    return { state: 'denied' };
  }
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async (
  serviceWorkerRegistration: ServiceWorkerRegistration,
  applicationServerKey: string
): Promise<PushSubscription | null> => {
  try {
    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
        auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : '',
      },
    };
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async (
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<boolean> => {
  try {
    const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};

/**
 * Get current push subscription
 */
export const getPushSubscription = async (
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<PushSubscription | null> => {
  try {
    const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (!subscription) {
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
        auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : '',
      },
    };
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
};

/**
 * Show a local notification (for testing or fallback)
 */
export const showLocalNotification = (title: string, options?: NotificationOptions): void => {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
};

/**
 * Register service worker for push notifications
 */
export const registerServiceWorker = async (serviceWorkerPath: string): Promise<ServiceWorkerRegistration | null> => {
  try {
    const registration = await navigator.serviceWorker.register(serviceWorkerPath);
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Error registering Service Worker:', error);
    return null;
  }
};

/**
 * Convert VAPID key to Uint8Array
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};
