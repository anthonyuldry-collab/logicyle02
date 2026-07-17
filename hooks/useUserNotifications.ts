import { useCallback, useEffect, useState } from 'react';
import { UserNotification } from '../types';
import {
  markAllNotificationsRead,
  markNotificationRead,
  notifyConvocationLocally,
  subscribeUserNotifications,
} from '../services/notificationService';
import {
  getNotificationPermission,
  isPushSupported,
  registerPushToken,
  requestPushPermission,
  subscribeForegroundMessages,
} from '../services/pushNotificationService';

interface UseUserNotificationsOptions {
  userId: string | null | undefined;
  enabled?: boolean;
  onNavigateToConvocation?: (eventId: string) => void;
  autoRegisterPush?: boolean;
}

export function useUserNotifications({
  userId,
  enabled = true,
  onNavigateToConvocation,
  autoRegisterPush = true,
}: UseUserNotificationsOptions) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushSupported, setPushSupported] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    void isPushSupported().then(setPushSupported);
    void getNotificationPermission().then(setPushPermission);
  }, []);

  useEffect(() => {
    if (!userId || !enabled) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeUserNotifications(
      userId,
      setNotifications,
      notification => {
        notifyConvocationLocally(notification, () => {
          onNavigateToConvocation?.(notification.eventId);
        });
      },
    );

    return unsubscribe;
  }, [userId, enabled, onNavigateToConvocation]);

  useEffect(() => {
    if (!userId || !autoRegisterPush || !pushSupported) return;
    if (pushPermission !== 'granted') return;
    void registerPushToken(userId);
  }, [userId, autoRegisterPush, pushSupported, pushPermission]);

  useEffect(() => {
    const unsubscribe = subscribeForegroundMessages((title, body) => {
      void import('../services/pushNotificationService').then(({ showLocalPushNotification }) =>
        showLocalPushNotification(title, { body }),
      );
    });
    return () => unsubscribe?.();
  }, []);

  const enablePush = useCallback(async () => {
    const permission = await requestPushPermission();
    setPushPermission(permission);
    if (permission === 'granted' && userId) {
      await registerPushToken(userId);
    }
    return permission;
  }, [userId]);

  const markRead = useCallback(async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [userId]);

  return {
    notifications,
    unreadCount,
    pushPermission,
    pushSupported,
    enablePush,
    markRead,
    markAllRead,
  };
}
