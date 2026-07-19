import React, { useState, Suspense } from 'react';
import { TeamProduct } from '../../types';
import ActionButton from '../ActionButton';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  formatGlucoseFructoseRatio,
  fetchProductByBarcode,
  syncCarbsFromSugars,
} from '../../utils/nutritionProductUtils';
import { lazyWithReload } from '../../utils/lazyWithReload';

const BarcodeScannerModal = lazyWithReload(() => import('../BarcodeScannerModal'));
const PRODUCT_TYPE_CONFIG = {
  gel: {
    sectionTitle: '🧪 Ratios & nutrition (par gel)',
    compositionPlaceholder: 'Ex: Eau, maltodextrine, fructose, citrate de sodium, arôme…',
    ratioHint: 'Ratio glucose:fructose calculé automatiquement (ex. 2:1 pour 40g glucose / 20g fructose).',
  },
  bar: {
    sectionTitle: '🧪 Ratios & nutrition (par barre)',
    compositionPlaceholder: 'Ex: Flocons d\'avoine, sirop de glucose, fructose, protéines, amandes…',
    ratioHint: 'Ratio glucose:fructose calculé automatiquement pour la barre.',
  },
  drink: {
    sectionTitle: '🧪 Ratios & nutrition (par portion / bidon)',
    compositionPlaceholder: 'Ex: Eau, maltodextrine, fructose, électrolytes, arôme citron…',
    ratioHint: 'Ratio glucose:fructose calculé automatiquement pour la boisson.',
  },
} as const;

interface CustomProductFormProps {
  product: Omit<TeamProduct, 'id'>;
  onChange: (product: Omit<TeamProduct, 'id'>) => void;
  onSubmit: () => void;
  productType: 'gel' | 'bar' | 'drink';
  submitLabel?: string;
  inputClass?: string;
}

const CustomProductForm: React.FC<CustomProductFormProps> = ({
  product,
  onChange,
  onSubmit,
  productType,
  submitLabel = 'Ajouter et Sélectionner',
  inputClass = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-gray-900 placeholder-gray-400',
}) => {
  const isMobile = useIsMobile();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  const smallInputClass = `${inputClass} !text-sm py-1.5`;
  const ratio = formatGlucoseFructoseRatio(product.glucose, product.fructose);
  const typeConfig = PRODUCT_TYPE_CONFIG[productType];

  const updateField = <K extends keyof Omit<TeamProduct, 'id'>>(key: K, value: Omit<TeamProduct, 'id'>[K]) => {
    let updated = { ...product, [key]: value, type: productType };
    if (key === 'glucose' || key === 'fructose') {
      updated = syncCarbsFromSugars(updated);
    }
    onChange(updated);
  };

  const handleBarcodeScan = async (barcode: string) => {
    const clean = barcode.replace(/\D/g, '');
    if (clean.length < 8) {
      setScanError('Code-barres invalide (minimum 8 chiffres).');
      return;
    }
    setIsLoadingScan(true);
    setScanError(null);
    setBarcodeInput(clean);
    try {
      const data = await fetchProductByBarcode(clean);
      if (!data) {
        setScanError('Produit non trouvé dans la base. Complétez les informations manuellement.');
        onChange({ ...product, barcode: clean, type: productType });
        return;
      }
      onChange({
        ...product,
        type: productType,
        barcode: data.barcode,
        name: data.name || product.name,
        brand: data.brand || product.brand,
        composition: data.composition || product.composition,
        carbs: data.carbs ?? product.carbs,
        caffeine: data.caffeine ?? product.caffeine,
        sodium: data.sodium ?? product.sodium,
      });
    } catch {
      setScanError('Erreur lors de la recherche. Vérifiez votre connexion internet.');
    } finally {
      setIsLoadingScan(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Recherche par code-barres — visible sur PC */}
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-md space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Code-barres du produit
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const code = barcodeInput.replace(/\D/g, '');
                if (code.length >= 8) handleBarcodeScan(code);
              }
            }}
            placeholder="Ex: 3560070460097"
            className={`${inputClass} flex-1 min-w-[180px]`}
          />
          <ActionButton
            type="button"
            variant="secondary"
            onClick={() => handleBarcodeScan(barcodeInput.replace(/\D/g, ''))}
            disabled={isLoadingScan || barcodeInput.replace(/\D/g, '').length < 8}
          >
            {isLoadingScan ? 'Recherche…' : 'Rechercher'}
          </ActionButton>
          <ActionButton
            type="button"
            variant="secondary"
            onClick={() => setIsScannerOpen(true)}
          >
            {isMobile ? '📷 Scanner' : '📷 Caméra / photo'}
          </ActionButton>
        </div>
        {product.barcode && (
          <span className="text-xs text-gray-500">Code enregistré : {product.barcode}</span>
        )}
      </div>
      {scanError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">{scanError}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={product.name}
          onChange={e => updateField('name', e.target.value)}
          placeholder="Nom du produit"
          className={inputClass}
        />
        <input
          type="text"
          value={product.brand || ''}
          onChange={e => updateField('brand', e.target.value)}
          placeholder="Marque"
          className={inputClass}
        />
      </div>

      <div className="border-t pt-3">
        <h5 className="text-sm font-semibold text-gray-700 mb-3">
          {typeConfig.sectionTitle}
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Glucides totaux (g)</label>
            <input
              type="number"
              value={product.carbs || ''}
              onChange={e => updateField('carbs', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.1"
              className={smallInputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Glucose (g)</label>
            <input
              type="number"
              value={product.glucose || ''}
              onChange={e => updateField('glucose', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.1"
              className={smallInputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fructose (g)</label>
            <input
              type="number"
              value={product.fructose || ''}
              onChange={e => updateField('fructose', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.1"
              className={smallInputClass}
            />
          </div>
          {ratio && (
            <div className="flex flex-col justify-end">
              <span className="text-xs font-medium text-gray-600 mb-1">Ratio G:F</span>
              <span className="px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-sm font-semibold text-blue-800 text-center">
                {ratio}
              </span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caféine (mg)</label>
            <input
              type="number"
              value={product.caffeine || ''}
              onChange={e => updateField('caffeine', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.1"
              className={smallInputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sodium (mg)</label>
            <input
              type="number"
              value={product.sodium || ''}
              onChange={e => updateField('sodium', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.1"
              className={smallInputClass}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {typeConfig.ratioHint}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Composition / ingrédients</label>
        <textarea
          value={product.composition || ''}
          onChange={e => updateField('composition', e.target.value)}
          placeholder={typeConfig.compositionPlaceholder}
          rows={3}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (allergènes, goût…)</label>
        <textarea
          value={product.notes || ''}
          onChange={e => updateField('notes', e.target.value)}
          placeholder="Ex: Sans gluten, goût cola, contient caféine…"
          rows={2}
          className={inputClass}
        />
      </div>

      <ActionButton onClick={onSubmit} disabled={!product.name.trim()}>
        {submitLabel}
      </ActionButton>

      {isScannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScan={handleBarcodeScan}
          />
        </Suspense>
      )}
    </div>
  );
};

export default CustomProductForm;
