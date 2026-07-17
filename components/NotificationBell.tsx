import React, { useEffect, useRef, useState } from 'react';
import { UserNotification } from '../types';
import BellIcon from './icons/BellIcon';
import { useTranslations } from '../hooks/useTranslations';

interface NotificationBellProps {
  notifications: UserNotification[];
  unreadCount: number;
  pushPermission: NotificationPermission;
  pushSupported: boolean;
  onEnablePush: () => Promise<NotificationPermission>;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenConvocation: (eventId: string) => void;
  variant?: 'mobile' | 'desktop';
}

const formatRelativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  unreadCount,
  pushPermission,
  pushSupported,
  onEnablePush,
  onMarkRead,
  onMarkAllRead,
  onOpenConvocation,
  variant = 'desktop',
}) => {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleOpenNotification = (n: UserNotification) => {
    if (!n.read) onMarkRead(n.id);
    setOpen(false);
    onOpenConvocation(n.eventId);
  };

  const isMobile = variant === 'mobile';

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`relative flex items-center justify-center rounded-lg transition-colors ${
          isMobile
            ? 'w-10 h-10 hover:bg-white/10 active:bg-white/20'
            : 'w-10 h-10 text-gray-600 hover:bg-gray-100'
        }`}
        aria-label={t('notificationsTitle')}
      >
        <BellIcon className={`w-5 h-5 ${isMobile ? 'text-white' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-[min(100vw-1.5rem,22rem)] rounded-xl border border-gray-200 bg-white shadow-xl ${
            isMobile ? 'right-0' : 'right-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('notificationsTitle')}</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => onMarkAllRead()}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                {t('notificationsMarkAllRead')}
              </button>
            )}
          </div>

          {pushSupported && pushPermission !== 'granted' && (
            <div className="border-b border-gray-100 bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-900">{t('notificationsPushHint')}</p>
              <button
                type="button"
                onClick={() => void onEnablePush()}
                className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                {t('notificationsEnablePush')}
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">{t('notificationsEmpty')}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.slice(0, 20).map(n => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(n)}
                      className={`w-full px-4 py-3 text-left transition hover:bg-gray-50 ${
                        !n.read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{n.body}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
