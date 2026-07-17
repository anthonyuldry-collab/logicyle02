import React from 'react';
import { Rider, ClothingItem, ClothingType as ClothingTypeEnum } from '../../types';
import ActionButton from '../ActionButton';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import TrashIcon from '../icons/TrashIcon';
import {
  ClothingCategoryId,
  CLOTHING_CATEGORY_HINTS,
  CLOTHING_CATEGORY_LABELS,
  clothingCategoryOptions,
  filterClothingByCategory,
  getClothingCategory,
} from '../../utils/clothingUtils';

interface EquipmentTabProps {
  formData: Rider | Omit<Rider, 'id'>;
  setFormData: React.Dispatch<React.SetStateAction<Rider | Omit<Rider, 'id'>>>;
  formFieldsEnabled: boolean;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const EquipmentTab: React.FC<EquipmentTabProps> = ({
  formData,
  setFormData,
  formFieldsEnabled,
}) => {
  const handleAddClothingItem = (category: ClothingCategoryId) => {
    const types = clothingCategoryOptions().find((c) => c.id === category)?.types;
    const defaultType = types?.[0] || ClothingTypeEnum.MAILLOT;
    setFormData((prev) => ({
      ...prev,
      clothing: [
        ...(prev.clothing || []),
        { id: generateId(), type: defaultType, quantity: 1, size: '' },
      ],
    }));
  };

  const handleClothingChange = (index: number, field: keyof ClothingItem, value: any) => {
    setFormData((prev) => {
      const updatedClothing = [...(prev.clothing || [])];
      if (updatedClothing[index]) {
        (updatedClothing[index] as any)[field] =
          field === 'quantity' || field === 'unitCost'
            ? value === ''
              ? undefined
              : parseFloat(value)
            : value;
      }
      return { ...prev, clothing: updatedClothing };
    });
  };

  const handleRemoveClothingItem = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article de dotation ?')) {
      setFormData((prev) => ({
        ...prev,
        clothing: (prev.clothing || []).filter((item) => item.id !== id),
      }));
    }
  };

  const categoryGroups = clothingCategoryOptions();
  const categories: ClothingCategoryId[] = ['race', 'sportswear', 'accessories'];

  return (
    <div className="space-y-5">
      {categories.map((category) => {
        const items = filterClothingByCategory(formData.clothing, category);
        return (
          <div
            key={category}
            className="rounded-xl border border-white/15 bg-slate-800/60 p-3 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">
                  {CLOTHING_CATEGORY_LABELS[category]}
                </h4>
                <p className="text-[11px] text-slate-400">{CLOTHING_CATEGORY_HINTS[category]}</p>
              </div>
              {formFieldsEnabled && (
                <ActionButton
                  type="button"
                  onClick={() => handleAddClothingItem(category)}
                  variant="secondary"
                  size="sm"
                  icon={<PlusCircleIcon className="w-4 h-4" />}
                  className="text-xs"
                >
                  Ajouter
                </ActionButton>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Aucun article.</p>
            ) : (
              items.map((item) => {
                const index = (formData.clothing || []).findIndex((c) => c.id === item.id);
                if (index < 0) return null;
                return (
                  <div
                    key={item.id}
                    className="bg-slate-700 p-2 rounded-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end"
                  >
                    <div className="text-xs">
                      <label>Type</label>
                      <select
                        value={item.type}
                        onChange={(e) => handleClothingChange(index, 'type', e.target.value)}
                        className="input-field-sm w-full"
                        disabled={!formFieldsEnabled}
                      >
                        {categoryGroups.map((group) => (
                          <optgroup key={group.id} label={group.label}>
                            {group.types.map((ct) => (
                              <option key={ct} value={ct}>
                                {ct}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {CLOTHING_CATEGORY_LABELS[getClothingCategory(item.type)]}
                      </p>
                    </div>
                    <div className="text-xs">
                      <label>Marque</label>
                      <input
                        type="text"
                        value={item.brand || ''}
                        onChange={(e) => handleClothingChange(index, 'brand', e.target.value)}
                        className="input-field-sm w-full"
                        disabled={!formFieldsEnabled}
                      />
                    </div>
                    <div className="text-xs">
                      <label>Taille</label>
                      <input
                        type="text"
                        value={item.size || ''}
                        onChange={(e) => handleClothingChange(index, 'size', e.target.value)}
                        className="input-field-sm w-full"
                        disabled={!formFieldsEnabled}
                      />
                    </div>
                    <div className="text-xs">
                      <label>Référence</label>
                      <input
                        type="text"
                        value={item.reference || ''}
                        onChange={(e) => handleClothingChange(index, 'reference', e.target.value)}
                        className="input-field-sm w-full"
                        disabled={!formFieldsEnabled}
                      />
                    </div>
                    <div className="text-xs">
                      <label>Quantité</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleClothingChange(index, 'quantity', e.target.value)}
                        className="input-field-sm w-full"
                        disabled={!formFieldsEnabled}
                        min="0"
                      />
                    </div>
                    <div className="text-xs">
                      <label>Coût Unitaire (€)</label>
                      <input
                        type="number"
                        value={item.unitCost === undefined ? '' : item.unitCost}
                        onChange={(e) => handleClothingChange(index, 'unitCost', e.target.value)}
                        className="input-field-sm w-full"
                        disabled={!formFieldsEnabled}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="text-xs md:col-start-4 flex justify-end">
                      <ActionButton
                        type="button"
                        onClick={() => handleRemoveClothingItem(item.id)}
                        variant="danger"
                        size="sm"
                        icon={<TrashIcon className="w-3 h-3" />}
                        disabled={!formFieldsEnabled}
                      >
                        <span className="sr-only">Supprimer</span>
                      </ActionButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EquipmentTab;
