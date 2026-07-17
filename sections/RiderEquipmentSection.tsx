import React, { useState, useEffect } from 'react';
import { User, EquipmentItem, ClothingItem, ClothingType, Rider, UserRole } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import RiderBikeFitWorkspace from '../components/bike/RiderBikeFitWorkspace';
import WrenchScrewdriverIcon from '../components/icons/WrenchScrewdriverIcon';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import Modal from '../components/Modal';
import { useTranslations } from '../hooks/useTranslations';
import { countWearAlerts } from '../utils/bikeWearUtils';
import { getOwnRider } from '../utils/riderAccessUtils';
import { userToRiderProfile } from '../utils/independentUtils';
import {
  ClothingCategoryId,
  CLOTHING_CATEGORY_HINTS,
  CLOTHING_CATEGORY_LABELS,
  clothingCategoryOptions,
  filterClothingByCategory,
  getClothingCategory,
} from '../utils/clothingUtils';

interface RiderEquipmentSectionProps {
  riders: Rider[];
  equipment: EquipmentItem[];
  currentUser: User;
  setRiders: (updater: React.SetStateAction<Rider[]>) => void;
  onSaveRider: (rider: Rider) => Promise<void> | void;
}

type MainTab = 'material' | 'bikefit';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const defaultItemForCategory = (category: ClothingCategoryId): Omit<ClothingItem, 'id'> => {
  const options = clothingCategoryOptions().find((c) => c.id === category);
  const defaultType = options?.types[0] || ClothingType.AUTRE;
  return {
    type: defaultType,
    quantity: 1,
    brand: '',
    reference: '',
    size: '',
    notes: '',
  };
};

const RiderEquipmentSection: React.FC<RiderEquipmentSectionProps> = ({
  riders,
  equipment,
  currentUser,
  setRiders,
  onSaveRider,
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('material');
  const [clothingFilter, setClothingFilter] = useState<ClothingCategoryId | 'all'>('all');
  const [assignedEquipment, setAssignedEquipment] = useState<EquipmentItem[]>([]);
  const [riderData, setRiderData] = useState<Rider | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [modalCategory, setModalCategory] = useState<ClothingCategoryId>('sportswear');
  const { t } = useTranslations();

  useEffect(() => {
    const rider =
      getOwnRider(riders, currentUser) ||
      (currentUser.userRole === UserRole.COUREUR ||
      String(currentUser.userRole).toLowerCase() === 'coureur'
        ? userToRiderProfile(currentUser)
        : undefined);
    if (rider) {
      setRiderData(structuredClone(rider));
      setAssignedEquipment(equipment.filter((eq) => eq.assignedToRiderId === rider.id));
    } else {
      setRiderData(null);
      setAssignedEquipment([]);
    }
  }, [riders, equipment, currentUser]);

  const wearAlerts = riderData
    ? countWearAlerts([riderData.roadBikeSetup, riderData.ttBikeSetup])
    : 0;

  const syncRider = (updated: Rider) => {
    setRiderData(updated);
    setRiders((prev) => {
      const exists = prev.some((r) => r.id === updated.id);
      if (!exists) return [...prev, updated];
      return prev.map((r) => (r.id === updated.id ? updated : r));
    });
  };

  const handleSaveMaterial = async () => {
    if (!riderData) return;
    try {
      await onSaveRider(riderData);
      alert(t('saveSuccess'));
    } catch {
      alert('Erreur lors de la sauvegarde.');
    }
  };

  const openAddModal = (category: ClothingCategoryId) => {
    setEditingItem(null);
    setModalCategory(category);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ClothingItem) => {
    setEditingItem(item);
    setModalCategory(getClothingCategory(item.type));
    setIsModalOpen(true);
  };

  const handleSavePersonalItem = async (itemToSave: ClothingItem) => {
    if (!riderData) return;
    const clothing = riderData.clothing || [];
    const updated: Rider = {
      ...riderData,
      clothing: editingItem
        ? clothing.map((c) => (c.id === itemToSave.id ? itemToSave : c))
        : [...clothing, { ...itemToSave, id: generateId() }],
    };
    syncRider(updated);
    await onSaveRider(updated);
    setIsModalOpen(false);
  };

  const handleDeletePersonalItem = async (itemId: string) => {
    if (!riderData || !window.confirm(t('riderEquipmentConfirmDelete'))) return;
    const updated = {
      ...riderData,
      clothing: (riderData.clothing || []).filter((c) => c.id !== itemId),
    };
    syncRider(updated);
    await onSaveRider(updated);
  };

  if (!riderData) {
    return (
      <SectionWrapper title="Mon Matériel & Bike Fit">
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-5 space-y-2">
          <p className="text-sm font-semibold text-amber-100">Profil coureur introuvable</p>
          <p className="text-sm text-slate-300">
            Impossible de charger votre matériel. Vérifiez que votre compte est lié à une fiche
            athlète dans l’effectif, puis rechargez la page.
          </p>
        </div>
      </SectionWrapper>
    );
  }

  const categoriesToShow: ClothingCategoryId[] =
    clothingFilter === 'all'
      ? ['race', 'sportswear', 'accessories']
      : [clothingFilter];

  const renderClothingSection = (category: ClothingCategoryId) => {
    const items = filterClothingByCategory(riderData.clothing, category);
    return (
      <div
        key={category}
        className="rounded-xl border border-white/15 bg-slate-900 p-4 shadow-sm"
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">
              {CLOTHING_CATEGORY_LABELS[category]}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {CLOTHING_CATEGORY_HINTS[category]}
            </p>
          </div>
          <ActionButton
            onClick={() => openAddModal(category)}
            icon={<PlusCircleIcon className="w-4 h-4" />}
            size="sm"
          >
            Ajouter
          </ActionButton>
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="p-2 font-medium">Type</th>
                  <th className="p-2 font-medium">Marque / Modèle</th>
                  <th className="p-2 font-medium">Taille</th>
                  <th className="p-2 font-medium">Qté</th>
                  <th className="p-2 font-medium">Notes</th>
                  <th className="p-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2 text-slate-100">{item.type}</td>
                    <td className="p-2 text-slate-200">
                      {[item.brand, item.reference].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="p-2 text-slate-300">{item.size || '—'}</td>
                    <td className="p-2 text-slate-300">{item.quantity ?? 1}</td>
                    <td className="max-w-[12rem] truncate p-2 text-slate-400">
                      {item.notes || '—'}
                    </td>
                    <td className="space-x-1 p-2 text-right">
                      <ActionButton
                        onClick={() => openEditModal(item)}
                        variant="secondary"
                        size="sm"
                        icon={<PencilIcon className="w-3 h-3" />}
                      />
                      <ActionButton
                        onClick={() => handleDeletePersonalItem(item.id)}
                        variant="danger"
                        size="sm"
                        icon={<TrashIcon className="w-3 h-3" />}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center text-sm text-slate-400">
            Aucun article dans cette catégorie.
          </p>
        )}
      </div>
    );
  };

  return (
    <SectionWrapper
      title="Mon Matériel & Bike Fit"
      actionButton={
        activeTab === 'material' ? (
          <ActionButton onClick={handleSaveMaterial}>Sauvegarder</ActionButton>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/15 bg-slate-900 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('material')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'material'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            Matériel & tenues
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bikefit')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'bikefit'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            Bike Fit & Usure
            {wearAlerts > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">
                {wearAlerts}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'material' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all' as const, label: 'Tout' },
                  { id: 'race' as const, label: 'Tenue course' },
                  { id: 'sportswear' as const, label: 'Sportswear' },
                  { id: 'accessories' as const, label: 'Accessoires' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setClothingFilter(f.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    clothingFilter === f.id
                      ? 'border-sky-500/50 bg-sky-950/50 text-sky-100'
                      : 'border-white/15 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                  {f.id !== 'all' && (
                    <span className="ml-1.5 opacity-70">
                      ({filterClothingByCategory(riderData.clothing, f.id).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {categoriesToShow.map(renderClothingSection)}

            <div className="rounded-xl border border-white/15 bg-slate-900 p-4 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-white">
                Matériel assigné par l&apos;équipe
              </h3>
              {assignedEquipment.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {assignedEquipment.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-slate-800 p-3"
                    >
                      <h4 className="font-semibold text-slate-100">{item.name}</h4>
                      <p className="text-sm text-slate-300">
                        {item.type} — {item.brand} {item.model}
                      </p>
                      <p className="text-xs text-slate-400">
                        N/S: {item.serialNumber || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/15 px-3 py-8 text-center">
                  <WrenchScrewdriverIcon className="mx-auto h-10 w-10 text-slate-500" />
                  <p className="mt-2 text-sm text-slate-400">
                    Aucun matériel assigné par l&apos;équipe.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bikefit' && (
          <RiderBikeFitWorkspace
            rider={riderData}
            onSaveRider={onSaveRider}
            onRiderUpdated={syncRider}
          />
        )}
      </div>

      {isModalOpen && (
        <PersonalItemModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSavePersonalItem}
          initialData={editingItem}
          preferredCategory={modalCategory}
        />
      )}
    </SectionWrapper>
  );
};

const PersonalItemModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ClothingItem) => void;
  initialData: ClothingItem | null;
  preferredCategory: ClothingCategoryId;
}> = ({ isOpen, onClose, onSave, initialData, preferredCategory }) => {
  const [itemData, setItemData] = useState<Omit<ClothingItem, 'id'>>(
    defaultItemForCategory(preferredCategory),
  );

  useEffect(() => {
    if (initialData) {
      setItemData(structuredClone(initialData));
    } else {
      setItemData(defaultItemForCategory(preferredCategory));
    }
  }, [initialData, isOpen, preferredCategory]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setItemData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...itemData,
      quantity: itemData.quantity && itemData.quantity > 0 ? itemData.quantity : 1,
      id: initialData?.id || generateId(),
    });
  };

  const inputClass =
    'mt-1 block w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30';
  const categoryGroups = clothingCategoryOptions();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Modifier un article' : 'Ajouter un article'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">Type d&apos;article</label>
            <select name="type" value={itemData.type} onChange={handleChange} className={inputClass}>
              {categoryGroups.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {group.types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              {CLOTHING_CATEGORY_HINTS[getClothingCategory(itemData.type)]}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">Taille</label>
            <input
              type="text"
              name="size"
              value={itemData.size || ''}
              onChange={handleChange}
              className={inputClass}
              placeholder="S, M, L, 42…"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-200">Marque</label>
            <input
              type="text"
              name="brand"
              value={itemData.brand || ''}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">Modèle / Référence</label>
            <input
              type="text"
              name="reference"
              value={itemData.reference || ''}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">Quantité</label>
            <input
              type="number"
              name="quantity"
              min={1}
              value={itemData.quantity ?? 1}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">Notes</label>
          <textarea
            name="notes"
            value={itemData.notes || ''}
            onChange={handleChange}
            rows={2}
            className={inputClass}
            placeholder="Ex: tenue podium, taille serrée, usure…"
          />
        </div>
        <div className="flex justify-end space-x-2 pt-3">
          <ActionButton type="button" variant="secondary" onClick={onClose}>
            Annuler
          </ActionButton>
          <ActionButton type="submit">Sauvegarder</ActionButton>
        </div>
      </form>
    </Modal>
  );
};

export default RiderEquipmentSection;
