import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import ActionButton from './ActionButton';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scanner un code-barres',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [isDecodingPhoto, setIsDecodingPhoto] = useState(false);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    setCameraReady(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode('');
      setError(null);
      return;
    }

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        stream.getTracks().forEach(track => track.stop());

        if (cancelled || !videoRef.current) return;

        controlsRef.current = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result) => {
            if (result) {
              stopCamera();
              onScan(result.getText());
              onClose();
            }
          },
        );
        if (!cancelled) setCameraReady(true);
      } catch {
        try {
          if (cancelled || !videoRef.current) return;
          controlsRef.current = await reader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result) => {
              if (result) {
                stopCamera();
                onScan(result.getText());
                onClose();
              }
            },
          );
          if (!cancelled) setCameraReady(true);
        } catch {
          if (!cancelled) {
            setError('Caméra indisponible. Utilisez la saisie manuelle ou importez une photo.');
          }
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, onClose, onScan]);

  const handleManualSubmit = () => {
    const code = manualCode.replace(/\D/g, '');
    if (code.length >= 8) {
      stopCamera();
      onScan(code);
      onClose();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingPhoto(true);
    setError(null);
    try {
      const reader = readerRef.current ?? new BrowserMultiFormatReader();
      const objectUrl = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(objectUrl);
        stopCamera();
        onScan(result.getText());
        onClose();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      setError('Code-barres illisible sur cette photo. Réessayez ou saisissez-le manuellement.');
    } finally {
      setIsDecodingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Caméra, photo du code-barres ou saisie manuelle.
          </p>

          {!error && (
            <div className="relative overflow-hidden rounded-lg bg-black aspect-[4/3] max-h-56">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/50">
                  Activation de la caméra…
                </div>
              )}
              {cameraReady && (
                <div className="absolute inset-0 border-2 border-dashed border-white/60 m-8 rounded-lg pointer-events-none" />
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
              {error}
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDecodingPhoto}
              className="w-full"
            >
              {isDecodingPhoto ? 'Analyse de la photo…' : '🖼 Importer une photo du code-barres'}
            </ActionButton>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Saisir le code-barres</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Ex: 3560070460097"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <ActionButton onClick={handleManualSubmit} disabled={manualCode.replace(/\D/g, '').length < 8}>
                OK
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default BarcodeScannerModal;
