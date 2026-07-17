import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from '../firebaseConfig';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  return isSupported();
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export async function registerPushToken(userId: string): Promise<string | null> {
  const permission = await requestPushPermission();
  if (permission !== 'granted') return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const messaging = await getMessagingInstance();
    if (!messaging || !VAPID_KEY) {
      await registration.update();
      return null;
    }
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token) {
      await updateDoc(doc(db, 'users', userId), {
        pushTokens: arrayUnion(token),
        pushNotificationsEnabled: true,
        updatedAt: new Date().toISOString(),
      });
    }
    return token ?? null;
  } catch (err) {
    console.warn('Enregistrement push impossible:', err);
    return null;
  }
}

export async function showLocalPushNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    data?: Record<string, string>;
    onClick?: () => void;
  },
): Promise<void> {
  const permission = await getNotificationPermission();
  if (permission !== 'granted') return;

  const payload = {
    body: options?.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: options?.tag,
    data: options?.data,
    vibrate: [120, 60, 120],
  };

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, payload);
  } catch {
    const notification = new Notification(title, {
      body: options?.body,
      icon: '/icons/icon-192.png',
      tag: options?.tag,
      data: options?.data,
    });
    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }
  }
}

export function subscribeForegroundMessages(onPayload: (title: string, body: string) => void): (() => void) | null {
  let unsubscribe: (() => void) | null = null;
  void (async () => {
    const messaging = await getMessagingInstance();
    if (!messaging) return;
    unsubscribe = onMessage(messaging, payload => {
      const title = payload.notification?.title ?? 'LogiCycle';
      const body = payload.notification?.body ?? '';
      onPayload(title, body);
    });
  })();
  return () => unsubscribe?.();
}
