import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  ConvocationDispatchMode,
  Rider,
  StaffMember,
  User,
  UserNotification,
  UserNotificationType,
} from '../types';
import { resolveUserIdForRider, resolveUserIdForStaff } from '../utils/notificationUserUtils';
import { showLocalPushNotification } from './pushNotificationService';

const NOTIFICATIONS_COLLECTION = 'userNotifications';

export async function createUserNotification(
  notification: Omit<UserNotification, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notification);
  return ref.id;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { read: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export function subscribeUserNotifications(
  userId: string,
  onUpdate: (notifications: UserNotification[]) => void,
  onNewUnread?: (notification: UserNotification) => void,
): () => void {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  let isFirst = true;
  const knownIds = new Set<string>();

  return onSnapshot(
    q,
    snapshot => {
      const notifications = snapshot.docs.map(
        d => ({ id: d.id, ...d.data() }) as UserNotification,
      );

      if (!isFirst && onNewUnread) {
        notifications.forEach(n => {
          if (!n.read && !knownIds.has(n.id)) {
            onNewUnread(n);
          }
        });
      }

      notifications.forEach(n => knownIds.add(n.id));
      isFirst = false;
      onUpdate(notifications);
    },
    err => {
      console.warn('Écoute notifications:', err);
      onUpdate([]);
    },
  );
}

export interface SendDigitalConvocationParams {
  teamId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  mode: ConvocationDispatchMode;
  sentByUserId: string;
  users: User[];
  riders: Rider[];
  staff: StaffMember[];
  riderId?: string | null;
  staffId?: string | null;
  selectedRiderIds?: string[];
  selectedStaffIds?: string[];
  previewExcerpt?: string;
}

function buildConvocationTitle(mode: ConvocationDispatchMode, eventName: string): string {
  if (mode === 'general') return `Convocation équipe — ${eventName}`;
  if (mode === 'staff') return `Convocation staff — ${eventName}`;
  return `Convocation — ${eventName}`;
}

function buildConvocationBody(eventName: string, eventDate: string, excerpt?: string): string {
  const dateLabel = new Date(eventDate + 'T12:00:00Z').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const intro = `Vous êtes convoqué(e) pour ${eventName} (${dateLabel}).`;
  if (!excerpt) return `${intro} Consultez les détails dans l'application.`;
  const short = excerpt.replace(/\s+/g, ' ').trim().slice(0, 180);
  const wazeMatch = excerpt.match(/Waze\s*:\s*(https:\/\/\S+)/i);
  const wazeHint = wazeMatch ? ` Waze : ${wazeMatch[1]}` : '';
  return `${intro} ${short}${excerpt.length > 180 ? '…' : ''}${wazeHint}`;
}

function collectRecipientUserIds(params: SendDigitalConvocationParams): string[] {
  const { mode, users, riders, staff, riderId, staffId, eventId: _eventId } = params;
  const ids = new Set<string>();

  if (mode === 'athlete' && riderId) {
    const rider = riders.find(r => r.id === riderId);
    if (rider) {
      const uid = resolveUserIdForRider(rider, users);
      if (uid) ids.add(uid);
    }
    return [...ids];
  }

  if (mode === 'staff' && staffId) {
    const member = staff.find(s => s.id === staffId);
    if (member) {
      const uid = resolveUserIdForStaff(member, users);
      if (uid) ids.add(uid);
    }
    return [...ids];
  }

  if (mode === 'general') {
    const riderIds = params.selectedRiderIds ?? [];
    const staffIds = params.selectedStaffIds ?? [];
    riderIds.forEach(id => {
      const rider = riders.find(r => r.id === id);
      if (rider) {
        const uid = resolveUserIdForRider(rider, users);
        if (uid) ids.add(uid);
      }
    });
    staffIds.forEach(id => {
      const member = staff.find(s => s.id === id);
      if (member) {
        const uid = resolveUserIdForStaff(member, users);
        if (uid) ids.add(uid);
      }
    });
  }

  return [...ids];
}

export async function sendDigitalConvocationNotifications(
  params: SendDigitalConvocationParams,
): Promise<{ sent: number; skipped: number }> {
  const recipientIds = collectRecipientUserIds(params);
  if (recipientIds.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const title = buildConvocationTitle(params.mode, params.eventName);
  const body = buildConvocationBody(params.eventName, params.eventDate, params.previewExcerpt);
  const createdAt = new Date().toISOString();

  await Promise.all(
    recipientIds.map(userId =>
      createUserNotification({
        userId,
        teamId: params.teamId,
        type: UserNotificationType.CONVOCATION,
        title,
        body,
        eventId: params.eventId,
        eventName: params.eventName,
        convocationMode: params.mode,
        read: false,
        createdAt,
        sentByUserId: params.sentByUserId,
        targetSection: 'eventDetail',
      }),
    ),
  );

  return { sent: recipientIds.length, skipped: 0 };
}

export function notifyConvocationLocally(
  notification: UserNotification,
  onNavigate?: () => void,
): void {
  void showLocalPushNotification(notification.title, {
    body: notification.body,
    tag: `convocation-${notification.id}`,
    data: { eventId: notification.eventId, section: notification.targetSection ?? 'myCalendar' },
    onClick: onNavigate,
  });
}
