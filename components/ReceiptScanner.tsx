import React, { useRef, useState, useCallback } from 'react';
import { BudgetItemCategory, RaceEvent, EventTransportLeg } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { resolveAccountingCode, suggestCategoryFromTransportMode } from '../constants/accountingCodes';
import { fileToDataUrl, runReceiptOcr } from '../utils/receiptOcrUtils';
import ActionButton from './ActionButton';
import { Camera } from 'lucide-react';

export interface ReceiptScanResult {
  imageDataUrl: string;
  mimeType: string;
  amount: number;
  receiptDate: string;
  budgetCategory: BudgetItemCategory;
  accountingCode: string;
  accountingLabel: string;
  merchant: string;
  description: string;
  eventId?: string;
  transportLegId?: string;
  ocrRawText?: string;
  ocrConfidence?: number;
}

interface ReceiptScannerProps {
  raceEvents: RaceEvent[];
  transportLegs?: EventTransportLeg[];
  defaultEventId?: string;
  defaultTransportLegId?: string;
  onScanComplete: (result: ReceiptScanResult) => void;
  onCancel?: () => void;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  raceEvents,
  transportLegs = [],
  defaultEventId,
  defaultTransportLegId,
  onScanComplete,
  onCancel,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const lang = language === 'en' ? 'en' : 'fr';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultLeg = transportLegs.find((l) => l.id === defaultTransportLegId);
  const initialCategory = defaultLeg
    ? suggestCategoryFromTransportMode(defaultLeg.mode)
    : BudgetItemCategory.TRANSPORT;

  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [amount, setAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<BudgetItemCategory>(initialCategory);
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState(defaultEventId || defaultLeg?.eventId || '');
  const [transportLegId, setTransportLegId] = useState(defaultTransportLegId || '');
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [ocrRawText, setOcrRawText] = useState<string | undefined>();
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>();

  const accounting = resolveAccountingCode(category, lang);

  const handleFile = useCallback(async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setMimeType(file.type || 'image/jpeg');
    setIsScanning(true);
    setOcrHint(null);
    try {
      const ocr = await runReceiptOcr(dataUrl);
      if (ocr.suggestedAmount != null) {
        setAmount(String(ocr.suggestedAmount));
        setOcrHint(t('receiptOcrAmountDetected').replace('{amount}', ocr.suggestedAmount.toFixed(2)));
      } else if (ocr.text) {
        setOcrHint(t('receiptOcrNoAmount'));
      } else {
        setOcrHint(t('receiptOcrManual'));
      }
      setOcrRawText(ocr.text || undefined);
      setOcrConfidence(ocr.confidence || undefined);
      if (ocr.suggestedDate) {
        setReceiptDate(ocr.suggestedDate);
      }
    } finally {
      setIsScanning(false);
    }
  }, [t]);

  const handleSubmit = () => {
    if (!preview) return;
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return;
    const acc = resolveAccountingCode(category, lang);
    onScanComplete({
      imageDataUrl: preview,
      mimeType,
      amount: parsedAmount,
      receiptDate,
      budgetCategory: category,
      accountingCode: acc.code,
      accountingLabel: acc.label,
      merchant: merchant.trim(),
      description: description.trim() || merchant.trim() || t('receiptDefaultDescription'),
      eventId: eventId || undefined,
      transportLegId: transportLegId || undefined,
      ocrRawText,
      ocrConfidence,
    });
  };

  const eventLegs = transportLegs.filter((l) => !eventId || l.eventId === eventId);

  return (
    <div className="space-y-4">
      {!preview ? (
        <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 text-center">
          <Camera className="mx-auto h-12 w-12 text-blue-500" />
          <p className="mt-3 text-sm font-medium text-blue-900">{t('receiptScanPrompt')}</p>
          <p className="mt-1 text-xs text-blue-700">{t('receiptScanHint')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <ActionButton
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('receiptScanButton')}
          </ActionButton>
          {onCancel && (
            <button type="button" onClick={onCancel} className="mt-3 block w-full text-sm text-gray-500">
              {t('formCancel')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-black/5">
            <img src={preview} alt={t('receiptPreviewAlt')} className="max-h-64 w-full object-contain" />
          </div>

          {isScanning && (
            <p className="text-sm text-blue-600 animate-pulse">{t('receiptOcrRunning')}</p>
          )}
          {ocrHint && !isScanning && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{ocrHint}</p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('receiptAmount')}</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('formDate')}</label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('formCategory')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BudgetItemCategory)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {Object.values(BudgetItemCategory).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('receiptAccountingCode')}</label>
              <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                {accounting.code} — {accounting.label}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t('formEvent')}</label>
              <select
                value={eventId}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setTransportLegId('');
                }}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">{t('formEventGeneral')}</option>
                {raceEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
            {eventLegs.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{t('receiptLinkedTrip')}</label>
                <select
                  value={transportLegId}
                  onChange={(e) => setTransportLegId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">{t('receiptNoTrip')}</option>
                  {eventLegs.map((leg) => (
                    <option key={leg.id} value={leg.id}>
                      {leg.direction} — {leg.mode}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t('receiptMerchant')}</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder={t('receiptMerchantPlaceholder')}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={handleSubmit} disabled={!amount || isScanning}>
              {t('receiptSubmit')}
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => setPreview(null)}>
              {t('receiptRetake')}
            </ActionButton>
            {onCancel && (
              <ActionButton variant="secondary" onClick={onCancel}>
                {t('formCancel')}
              </ActionButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptScanner;
