import React, { useState, useMemo, useEffect } from 'react';
import { StockItem, StockCategory, StaffMember, StaffRole, Warehouse, StockMovement, StockMovementReason } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import SearchIcon from '../components/icons/SearchIcon';
import XCircleIcon from '../components/icons/XCircleIcon';
import CircleStackIcon from '../components/icons/CircleStackIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import { findStockItemByBarcode, isValidBarcode, normalizeBarcode } from '../utils/stockBarcodeUtils';
import { summarizeStock, isStockAlert } from '../utils/stockSummaryUtils';
import {
  applyStockDelta,
  buildStockMovement,
  createDefaultWarehouses,
  exportStockMovementsCsv,
  getDefaultWarehouse,
  getStockQuantityAtWarehouse,
  getTotalStockQuantity,
  getWarehouseTypeLabel,
  syncStockTotal,
  transferStock,
} from '../utils/warehouseUtils';
import { useTranslations } from '../hooks/useTranslations';

interface StocksSectionProps {
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  staff: StaffMember[];
  warehouses?: Warehouse[];
  setWarehouses?: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  stockMovements?: StockMovement[];
  setStockMovements?: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  teamName?: string;
}

type ScanMode = 'in' | 'out' | 'inventory';
type StockTab = 'inventory' | 'movements';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const initialStockItemFormState: Omit<StockItem, 'id'> = {
  name: '',
  quantity: 0,
  unit: 'unités',
  lowStockThreshold: 10,
  category: StockCategory.BOISSONS,
  barcode: '',
  notes: '',
};

const StocksSection: React.FC<StocksSectionProps> = ({
  stockItems,
  setStockItems,
  staff,
  warehouses: warehousesProp,
  setWarehouses,
  stockMovements = [],
  setStockMovements,
  teamName = 'equipe',
}) => {
  const { t, language } = useTranslations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Omit<StockItem, 'id'> | StockItem>(initialStockItemFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StockCategory | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockItem | 'status', direction: 'ascending' | 'descending' } | null>({ key: 'status', direction: 'descending' });
  const [notifications, setNotifications] = useState<{ id: number, message: string }[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('in');
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>('');
  const [transferItem, setTransferItem] = useState<StockItem | null>(null);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StockTab>('inventory');

  const warehouses = useMemo(() => {
    if (warehousesProp && warehousesProp.length > 0) return warehousesProp;
    return createDefaultWarehouses();
  }, [warehousesProp]);

  useEffect(() => {
    if (!activeWarehouseId && warehouses.length > 0) {
      setActiveWarehouseId(getDefaultWarehouse(warehouses)?.id || warehouses[0].id);
    }
    if (warehousesProp?.length === 0 && setWarehouses) {
      setWarehouses(createDefaultWarehouses());
    }
  }, [warehouses, activeWarehouseId, warehousesProp, setWarehouses]);

  const activeWarehouse = warehouses.find((w) => w.id === activeWarehouseId) || warehouses[0];

  const getItemQuantity = (item: StockItem) =>
    activeWarehouse ? getStockQuantityAtWarehouse(item, activeWarehouse.id) : item.quantity;

  const summary = useMemo(() => {
    const adapted = stockItems.map((item) => ({
      ...item,
      quantity: getItemQuantity(item),
    }));
    return summarizeStock(adapted);
  }, [stockItems, activeWarehouse]);

  type StockStatusKey = 'out' | 'low' | 'ok';

  const getStatusKey = (item: StockItem): StockStatusKey => {
    const qty = getItemQuantity(item);
    if (qty <= 0) return 'out';
    if (qty <= item.lowStockThreshold) return 'low';
    return 'ok';
  };

  const getStatus = (item: StockItem): { key: StockStatusKey; text: string; colorClass: string } => {
    const key = getStatusKey(item);
    if (key === 'out') return { key, text: t('stocksStatusOut'), colorClass: 'bg-red-100 text-red-800' };
    if (key === 'low') return { key, text: t('stocksStatusLow'), colorClass: 'bg-yellow-100 text-yellow-800' };
    return { key, text: t('stocksStatusOk'), colorClass: 'bg-green-100 text-green-800' };
  };
  
  const getQuantityBarColor = (item: StockItem): string => {
    const qty = getItemQuantity(item);
    if (qty <= 0) return 'bg-red-500';
    if (qty <= item.lowStockThreshold) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  const getStockLevelPercentage = (item: StockItem) => {
    const qty = getItemQuantity(item);
    const fullStockLevel = item.lowStockThreshold * 3;
    if (fullStockLevel <= 0) return qty > 0 ? 100 : 0;
    return Math.min(100, (qty / fullStockLevel) * 100);
  };

  const recordMovement = (item: StockItem, delta: number, reason: StockMovementReason, barcode?: string) => {
    if (!activeWarehouse || !setStockMovements) return;
    const movement = buildStockMovement({
      item,
      warehouse: activeWarehouse,
      delta,
      reason,
      scannedBarcode: barcode,
    });
    setStockMovements((prev) => [movement, ...prev].slice(0, 500));
  };

  const handleTransfer = () => {
    setTransferError(null);
    if (!transferItem || !activeWarehouse) {
      setTransferError('Article ou entrepôt source manquant.');
      return;
    }
    if (!transferTargetId || transferTargetId === activeWarehouse.id) {
      setTransferError('Choisissez un entrepôt de destination.');
      return;
    }
    if (transferQty <= 0) {
      setTransferError('La quantité doit être supérieure à 0.');
      return;
    }
    const available = getItemQuantity(transferItem);
    if (transferQty > available) {
      setTransferError(`Stock insuffisant (${available} disponible).`);
      return;
    }
    const target = warehouses.find((w) => w.id === transferTargetId);
    if (!target) {
      setTransferError('Entrepôt destination introuvable.');
      return;
    }
    const updated = transferStock(transferItem, activeWarehouse.id, target.id, transferQty);
    if (!updated) {
      setTransferError('Transfert impossible.');
      return;
    }
    setStockItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (setStockMovements) {
      setStockMovements((prev) => [
        buildStockMovement({ item: updated, warehouse: activeWarehouse, delta: -transferQty, reason: 'transfer', transferToWarehouseId: target.id }),
        buildStockMovement({ item: updated, warehouse: target, delta: transferQty, reason: 'transfer', notes: `Depuis ${activeWarehouse.name}` }),
        ...prev,
      ].slice(0, 500));
    }
    setTransferItem(null);
    setTransferError(null);
  };

  const requestSort = (key: keyof StockItem | 'status') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof StockItem | 'status') => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const sortedItems = useMemo(() => {
    if (!stockItems) return [];
    let sortableItems = [...stockItems].filter(item => 
        (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.barcode && item.barcode.includes(normalizeBarcode(searchTerm)))) &&
        (categoryFilter === 'all' || item.category === categoryFilter) &&
        (!alertsOnly || getItemQuantity(item) <= item.lowStockThreshold)
    );
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;
        if (sortConfig.key === 'status') {
            const statusOrder: Record<StockStatusKey, number> = { out: 0, low: 1, ok: 2 };
            aValue = statusOrder[getStatusKey(a)];
            bValue = statusOrder[getStatusKey(b)];
        } else {
            aValue = a[sortConfig.key as keyof StockItem];
            bValue = b[sortConfig.key as keyof StockItem];
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [stockItems, searchTerm, categoryFilter, sortConfig, alertsOnly, activeWarehouse]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setCurrentItem(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const warehouseId = activeWarehouse?.id;

    if (isEditing && 'id' in currentItem) {
      let updated: StockItem = { ...currentItem };
      if (warehouseId) {
        const quantities = { ...(currentItem.quantities || {}) };
        quantities[warehouseId] = currentItem.quantity;
        updated = syncStockTotal({ ...currentItem, quantities });
      }
      setStockItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } else {
      const quantities = warehouseId ? { [warehouseId]: currentItem.quantity } : undefined;
      const newItem = syncStockTotal({
        ...currentItem,
        id: generateId(),
        quantities,
      } as StockItem);
      setStockItems((prev) => [...prev, newItem]);
      if (warehouseId && newItem.quantity > 0) {
        recordMovement(newItem, newItem.quantity, 'manual_adjustment');
      }
    }
    setIsModalOpen(false);
  };

  const openAddModal = () => {
    setCurrentItem(initialStockItemFormState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: StockItem) => {
    setCurrentItem({
      ...item,
      quantity: activeWarehouse ? getItemQuantity(item) : item.quantity,
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = (item: StockItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setStockItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  const pushNotification = (message: string) => {
    const newNotification = { id: Date.now(), message };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 8000);
  };

  const handleBarcodeScan = (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!isValidBarcode(code)) {
      setScanFeedback(t('stocksInvalidBarcode'));
      return;
    }
    setScanFeedback(null);
    const existing = findStockItemByBarcode(stockItems, code);
    const delta = scanMode === 'out' ? -1 : scanMode === 'inventory' ? 0 : 1;
    const reason: StockMovementReason =
      scanMode === 'out' ? 'scan_out' : scanMode === 'inventory' ? 'inventory' : 'scan_in';

    if (existing) {
      if (scanMode === 'inventory') {
        setScanFeedback(`Inventaire : ${existing.name} = ${getItemQuantity(existing)} ${existing.unit}`);
        recordMovement(existing, 0, reason, code);
        return;
      }
      handleQuantityChange(existing.id, delta, reason, code);
      const newQty = getItemQuantity(existing) + delta;
      pushNotification(`${delta > 0 ? '+' : ''}${delta} ${existing.name} (scan ${code}) — stock : ${newQty} ${existing.unit}`);
    } else {
      const initQty = scanMode === 'out' ? 0 : 1;
      const item: Omit<StockItem, 'id'> = {
        ...initialStockItemFormState,
        barcode: code,
        quantity: initQty,
        quantities: activeWarehouse ? { [activeWarehouse.id]: initQty } : undefined,
      };
      setCurrentItem(item);
      setIsEditing(false);
      setIsModalOpen(true);
      setScanFeedback(`Article inconnu (${code}) — création d'une fiche.`);
    }
  };

  const handleQuantityChange = (
    itemId: string,
    change: number,
    reason: StockMovementReason = 'manual_adjustment',
    barcode?: string
  ) => {
    const itemToUpdate = stockItems.find((item) => item.id === itemId);
    if (!itemToUpdate || !activeWarehouse) return;

    const oldQuantity = getItemQuantity(itemToUpdate);
    const newQuantity = Math.max(0, oldQuantity + change);

    if (newQuantity <= itemToUpdate.lowStockThreshold && oldQuantity > itemToUpdate.lowStockThreshold) {
      const assistants = staff ? staff.filter((s) => s.role === StaffRole.ASSISTANT) : [];
      const assistantNames =
        assistants.length > 0
          ? assistants.map((a) => `${a.firstName} ${a.lastName}`).join(', ')
          : 'aucun assistant configuré';
      pushNotification(
        `Alerte stock faible: "${itemToUpdate.name}" (${newQuantity} restants @ ${activeWarehouse.name}). Notification envoyée à: ${assistantNames}.`
      );
    }

    setStockItems((prevItems) => {
      const next = prevItems.map((item) => {
        if (item.id !== itemId) return item;
        return applyStockDelta(item, activeWarehouse.id, change);
      });
      const updated = next.find((item) => item.id === itemId);
      if (updated) {
        recordMovement(updated, change, reason, barcode);
      }
      return next;
    });
  };
  
  const thClasses = "py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none";
  const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500";
  const tabButtonStyle = (tab: StockTab) =>
    `px-3 py-2 font-medium text-sm rounded-t-md whitespace-nowrap transition-colors ${
      activeTab === tab
        ? 'bg-white text-gray-800 border-b-2 border-blue-500 shadow-sm'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  const renderKpis = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div className="bg-white rounded-xl border p-3 shadow-sm">
        <p className="text-[10px] uppercase text-gray-400">{t('stocksKpiArticles')}</p>
        <p className="text-xl font-bold text-gray-900">{summary.total}</p>
      </div>
      <div className="bg-white rounded-xl border p-3 shadow-sm">
        <p className="text-[10px] uppercase text-gray-400">{t('stocksStatusOk')}</p>
        <p className="text-xl font-bold text-emerald-600">{summary.ok}</p>
      </div>
      <div className="bg-white rounded-xl border p-3 shadow-sm">
        <p className="text-[10px] uppercase text-gray-400">{t('stocksKpiLow')}</p>
        <p className="text-xl font-bold text-amber-600">{summary.low}</p>
      </div>
      <div className="bg-white rounded-xl border p-3 shadow-sm">
        <p className="text-[10px] uppercase text-gray-400">{t('stocksKpiOut')}</p>
        <p className="text-xl font-bold text-red-600">{summary.out}</p>
      </div>
    </div>
  );

  const renderMovementsTab = () => (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{t('stocksMovementJournal')}</h3>
        {stockMovements.length > 0 && (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() =>
              exportStockMovementsCsv(
                stockMovements,
                teamName,
                language === 'en' ? 'en' : 'fr'
              )
            }
          >
            {t('stocksExportJournal')}
          </ActionButton>
        )}
      </div>
      {stockMovements.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">{t('stocksMovementEmpty')}</p>
      ) : (
        <div className="mt-3 max-h-[60vh] overflow-y-auto">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500">
                <th className="py-1 pr-2">Date</th>
                <th className="py-1 pr-2">Article</th>
                <th className="py-1 pr-2">{t('stocksWarehouse')}</th>
                <th className="py-1 pr-2 text-right">Δ</th>
                <th className="py-1">{t('stocksMovements')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stockMovements.slice(0, 100).map((m) => (
                <tr key={m.id}>
                  <td className="py-1.5 pr-2 text-gray-500 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString(language === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-1.5 pr-2 font-medium text-gray-900">{m.itemName}</td>
                  <td className="py-1.5 pr-2 text-gray-600">{m.warehouseName}</td>
                  <td className={`py-1.5 pr-2 text-right font-medium ${m.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td className="py-1.5 text-gray-600">
                    {t(`stocksMovementReason_${m.reason}` as 'stocksMovementReason_scan_in')}
                    {m.scannedBarcode ? ` · ${m.scannedBarcode}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <SectionWrapper title={t('stocksTitle')} actionButton={
      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => setIsScannerOpen(true)} variant="secondary">
          📷 {t('stocksScan')}
        </ActionButton>
        <ActionButton onClick={openAddModal} icon={<PlusCircleIcon className="w-5 h-5"/>}>{t('stocksAdd')}</ActionButton>
      </div>
    }>
        {notifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg flex justify-between items-start">
                <p className="text-sm font-medium">{notification.message}</p>
                <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))} className="ml-3 text-yellow-600 hover:text-yellow-800" aria-label="Fermer">
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {renderKpis()}

        {summary.lowItems.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-900 mb-1">{t('stocksReorderHint')}</p>
            <p className="text-sm text-amber-800">
              {summary.lowItems.slice(0, 5).map(i => i.name).join(' · ')}
              {summary.lowItems.length > 5 && ` · +${summary.lowItems.length - 5}`}
            </p>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600">
            {t('stocksWarehouse')}
            <select
              value={activeWarehouseId}
              onChange={(e) => setActiveWarehouseId(e.target.value)}
              className="ml-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({getWarehouseTypeLabel(w.type)})
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1">
            {(['in', 'out', 'inventory'] as ScanMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScanMode(mode)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  scanMode === mode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {mode === 'in' ? t('stocksScanIn') : mode === 'out' ? t('stocksScanOut') : t('stocksInventory')}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-2" aria-label="Tabs">
            <button type="button" onClick={() => setActiveTab('inventory')} className={tabButtonStyle('inventory')}>
              {t('stocksTabInventory')}
            </button>
            <button type="button" onClick={() => setActiveTab('movements')} className={tabButtonStyle('movements')}>
              {t('stocksTabMovements')}
              {stockMovements.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px]">{Math.min(stockMovements.length, 99)}{stockMovements.length > 99 ? '+' : ''}</span>
              )}
            </button>
          </nav>
        </div>

        {activeTab === 'movements' ? renderMovementsTab() : (
          <>
            <div className="p-4 bg-gray-50 rounded-lg border mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label htmlFor="stockSearch" className="block text-sm font-medium text-gray-700">{t('stocksSearchPlaceholder')}</label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-gray-400" /></div>
                    <input type="text" id="stockSearch" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('stocksSearchPlaceholder')} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                </div>
                <div>
                  <label htmlFor="stockCategoryFilter" className="block text-sm font-medium text-gray-700">{t('stocksAllCategories')}</label>
                  <select id="stockCategoryFilter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as StockCategory | 'all')} className={inputClass}>
                    <option value="all">{t('stocksAllCategories')}</option>
                    {Object.values(StockCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setAlertsOnly(v => !v)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    alertsOnly ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {alertsOnly ? `✓ ${t('stocksAlertsOnlyActive')}` : t('stocksAlertsOnly')}
                </button>
              </div>
            </div>

            {scanFeedback && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                {scanFeedback}
              </div>
            )}

            <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead className="bg-gray-100">
                    <tr>
                        <th className={thClasses} onClick={() => requestSort('name')}>Article {getSortIndicator('name')}</th>
                        <th className={thClasses} onClick={() => requestSort('category')}>Catégorie {getSortIndicator('category')}</th>
                        <th className={`${thClasses} text-center`} onClick={() => requestSort('quantity')}>Quantité {getSortIndicator('quantity')}</th>
                        <th className={`${thClasses} text-center`}>Seuil d'Alerte</th>
                        <th className={`${thClasses} text-center`} onClick={() => requestSort('status')}>Statut {getSortIndicator('status')}</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {sortedItems && sortedItems.length > 0 ? (
                    sortedItems.map(item => {
                        const status = getStatus(item);
                        const stockPercentage = getStockLevelPercentage(item);
                        return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <div className="font-semibold text-gray-800">{item.name}</div>
                                    {item.barcode && (
                                      <div className="text-[10px] font-mono text-gray-400 mt-0.5">{item.barcode}</div>
                                    )}
                                    <div className="text-xs text-gray-500">{item.notes}</div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap text-gray-600">{item.category}</td>
                                <td className="py-3 px-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <ActionButton aria-label={`Diminuer la quantité de ${item.name}`} onClick={() => handleQuantityChange(item.id, -1)} size="sm" variant="secondary" className="!p-1.5 !w-7 !h-7 rounded-full leading-none">-</ActionButton>
                                      <ActionButton aria-label={`Retirer 5 ${item.name}`} onClick={() => handleQuantityChange(item.id, -5)} size="sm" variant="secondary" className="!px-1.5 !py-0.5 !h-7 rounded text-[10px]">-5</ActionButton>
                                      <div className="w-20">
                                          <div className="font-bold text-lg text-gray-800">{getItemQuantity(item)} <span className="text-sm font-normal text-gray-500">{item.unit}</span></div>
                                          <div className="w-full bg-gray-200 rounded-full h-1 mt-1" title={`Niveau de stock: ${stockPercentage.toFixed(0)}%`}>
                                            <div className={`${getQuantityBarColor(item)} h-1 rounded-full`} style={{ width: `${stockPercentage}%` }}></div>
                                          </div>
                                      </div>
                                      <ActionButton aria-label={`Ajouter 5 ${item.name}`} onClick={() => handleQuantityChange(item.id, 5)} size="sm" variant="secondary" className="!px-1.5 !py-0.5 !h-7 rounded text-[10px]">+5</ActionButton>
                                      <ActionButton aria-label={`Augmenter la quantité de ${item.name}`} onClick={() => handleQuantityChange(item.id, 1)} size="sm" variant="secondary" className="!p-1.5 !w-7 !h-7 rounded-full leading-none">+</ActionButton>
                                    </div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap text-center text-gray-600">{item.lowStockThreshold}</td>
                                <td className="py-3 px-4 whitespace-nowrap text-center">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.colorClass}`}>{status.text}</span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                                    {warehouses.length > 1 && getItemQuantity(item) > 0 && (
                                      <ActionButton
                                        aria-label={`Transférer ${item.name} vers un autre entrepôt`}
                                        onClick={() => { setTransferItem(item); setTransferTargetId(''); setTransferQty(1); setTransferError(null); }}
                                        variant="secondary"
                                        size="sm"
                                      >
                                        {t('stocksTransfer')}
                                      </ActionButton>
                                    )}
                                    <ActionButton onClick={() => openEditModal(item)} variant="secondary" size="sm" icon={<PencilIcon className="w-4 h-4"/>}/>
                                    <ActionButton onClick={() => handleDelete(item)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4"/>}/>
                                </td>
                            </tr>
                        )
                    })
                ) : (
                    <tr>
                        <td colSpan={6}>
                            <div className="text-center py-10 bg-white rounded-lg">
                                <CircleStackIcon className="mx-auto h-12 w-12 text-gray-300" />
                                <h3 className="mt-2 text-md font-medium text-gray-800">{t('stocksEmpty')}</h3>
                            </div>
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
          </>
        )}
        
        {itemToDelete && (
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
                title={`${itemToDelete.name}`}
                message={t('stocksDeleteConfirm')}
            />
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? t('stocksModalEdit') : t('stocksModalAdd')}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  <input type="text" name="name" value={currentItem.name} onChange={handleInputChange} required className={inputClass}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                  <select name="category" value={currentItem.category} onChange={handleInputChange} className={inputClass}>
                    {Object.values(StockCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Code-barres (EAN/GTIN)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    name="barcode"
                    value={currentItem.barcode || ''}
                    onChange={handleInputChange}
                    placeholder="3560070460097"
                    className={`${inputClass} flex-1 font-mono mt-0`}
                  />
                  <ActionButton type="button" variant="secondary" onClick={() => setIsScannerOpen(true)}>
                    📷
                  </ActionButton>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {activeWarehouse ? `${t('stocksTabInventory')} (${activeWarehouse.name})` : 'Quantité'}
                  </label>
                  <input type="number" name="quantity" value={currentItem.quantity} onChange={handleInputChange} required min={0} className={inputClass}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unité</label>
                  <input type="text" name="unit" value={currentItem.unit} onChange={handleInputChange} required placeholder="packs, bouteilles…" className={inputClass}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seuil d'alerte</label>
                  <input type="number" name="lowStockThreshold" value={currentItem.lowStockThreshold} onChange={handleInputChange} required min={0} className={inputClass}/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea name="notes" value={currentItem.notes || ''} onChange={handleInputChange} rows={2} className={`${inputClass} w-full`} placeholder="Marque, fournisseur…"></textarea>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <ActionButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</ActionButton>
                <ActionButton type="submit">{isEditing ? 'Sauvegarder' : t('stocksAdd')}</ActionButton>
              </div>
            </form>
        </Modal>

        <Modal isOpen={!!transferItem} onClose={() => { setTransferItem(null); setTransferError(null); }} title={t('stocksTransferTitle')}>
          {transferItem && activeWarehouse && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{transferItem.name}</span> · {activeWarehouse.name} ({getItemQuantity(transferItem)} dispo.)
              </p>
              <div>
                <label className="text-sm font-medium">Destination</label>
                <select className="mt-1 w-full rounded border px-3 py-2 text-sm" value={transferTargetId} onChange={(e) => setTransferTargetId(e.target.value)}>
                  <option value="">Choisir…</option>
                  {warehouses.filter((w) => w.id !== activeWarehouse.id).map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Quantité</label>
                <input type="number" min={1} max={getItemQuantity(transferItem)} className="mt-1 w-full rounded border px-3 py-2 text-sm" value={transferQty} onChange={(e) => setTransferQty(Number(e.target.value))} />
              </div>
              {transferError && (
                <p className="text-sm text-red-600">{transferError}</p>
              )}
              <div className="flex justify-end gap-2">
                <ActionButton variant="secondary" onClick={() => { setTransferItem(null); setTransferError(null); }}>Annuler</ActionButton>
                <ActionButton
                  onClick={handleTransfer}
                  disabled={!transferTargetId || transferQty <= 0 || transferQty > getItemQuantity(transferItem)}
                >
                  {t('stocksTransfer')}
                </ActionButton>
              </div>
            </div>
          )}
        </Modal>

        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleBarcodeScan}
          title={t('stocksScan')}
        />
    </SectionWrapper>
  );
};

export default StocksSection;