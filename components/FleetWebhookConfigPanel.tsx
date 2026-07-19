import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from './ActionButton';
import * as firebaseService from '../services/firebaseService';

interface FleetWebhookConfigPanelProps {
  teamId: string;
  webhookKey?: string;
  onKeyUpdated?: (key: string) => void;
}

const WEBHOOK_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_GPS_WEBHOOK_URL
    ? String(import.meta.env.VITE_GPS_WEBHOOK_URL)
    : `https://europe-west1-${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'logicycle01'}.cloudfunctions.net/ingestVehicleGps`;

function generateWebhookKey(): string {
  return `gps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const FleetWebhookConfigPanel: React.FC<FleetWebhookConfigPanelProps> = ({
  teamId,
  webhookKey,
  onKeyUpdated,
}) => {
  const { t } = useTranslations();
  const [key, setKey] = useState(webhookKey || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setKey(webhookKey || '');
  }, [webhookKey]);

  const webhookUrl = key
    ? `${WEBHOOK_BASE}?teamId=${encodeURIComponent(teamId)}&key=${encodeURIComponent(key)}`
    : `${WEBHOOK_BASE}?teamId=${encodeURIComponent(teamId)}&key=…`;

  const saveKey = useCallback(
    async (nextKey: string) => {
      setSaving(true);
      try {
        await firebaseService.saveGpsWebhookKey(teamId, nextKey);
        setKey(nextKey);
        onKeyUpdated?.(nextKey);
      } finally {
        setSaving(false);
      }
    },
    [teamId, onKeyUpdated],
  );

  const handleGenerate = () => {
    void saveKey(generateWebhookKey());
  };

  const handleCopy = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-medium text-gray-900">{t('fleetGpsWebhookTitle')}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{t('fleetGpsWebhookDesc')}</p>
      </div>

      <div className="rounded-md bg-white border border-gray-200 p-3">
        <p className="text-[10px] uppercase text-gray-400 mb-1">URL POST (Traccar / Geotab)</p>
        <code className="block text-xs text-gray-800 break-all font-mono">{webhookUrl}</code>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton size="sm" variant="secondary" onClick={handleGenerate} disabled={saving}>
          {key ? t('fleetGpsWebhookRegenerate') : t('fleetGpsWebhookGenerate')}
        </ActionButton>
        {key && (
          <ActionButton size="sm" onClick={() => void handleCopy()}>
            {copied ? t('fleetGpsWebhookCopied') : t('fleetGpsWebhookCopy')}
          </ActionButton>
        )}
      </div>

      <p className="text-[10px] text-gray-500">{t('fleetGpsWebhookHint')}</p>
    </div>
  );
};

export default FleetWebhookConfigPanel;
