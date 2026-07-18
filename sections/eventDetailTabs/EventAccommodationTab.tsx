
import React, { useState, useMemo } from 'react';
import {
  RaceEvent,
  AppState,
  EventAccommodation,
  AccommodationStatus,
  EventBudgetItem,
  BudgetItemCategory,
  User,
  AppSection,
  PermissionLevel,
  ExpenseReceipt,
} from '../../types';
import { isCompetitiveStageRace } from '../../utils/trainingCampUtils';
import StageAccommodationEditor from './StageAccommodationEditor';
import { emptyEventAccommodation } from '../../constants';
import { saveData, deleteData } from '../../services/firebaseService';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import PlusCircleIcon from '../../components/icons/PlusCircleIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';

interface EventAccommodationTabProps {
  event: RaceEvent;
  eventId: string;
  updateEvent: (updatedEventData: Partial<RaceEvent>) => void;
  setEventAccommodations: React.Dispatch<React.SetStateAction<EventAccommodation[]>>;
  setEventBudgetItems: React.Dispatch<React.SetStateAction<EventBudgetItem[]>>;
  appState: AppState;
  currentUser?: User | null;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const EventAccommodationTab: React.FC<EventAccommodationTabProps> = ({
  event,
  eventId,
  updateEvent,
  appState,
  setEventAccommodations,
  setEventBudgetItems,
  currentUser,
  effectivePermissions,
}) => {
  const stageRace = isCompetitiveStageRace(event);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Omit<EventAccommodation, 'id'> | EventAccommodation>(
    emptyEventAccommodation(eventId, ''),
  );

  const canViewFinancialInfo = effectivePermissions?.financial?.includes('view') || false;

  const accommodationsForEvent = useMemo(() => {
    return appState.eventAccommodations.filter((acc) => acc.eventId === eventId);
  }, [appState.eventAccommodations, eventId]);

  const receiptsForEvent = useMemo(() => {
    return (appState.expenseReceipts || []).filter(
      (r) =>
        r.eventId === eventId ||
        r.budgetCategory === BudgetItemCategory.HEBERGEMENT ||
        !r.eventId,
    );
  }, [appState.expenseReceipts, eventId]);

  const getLinkedReceipts = (item: EventAccommodation): ExpenseReceipt[] => {
    const ids = item.expenseReceiptIds || [];
    if (!ids.length) return [];
    return (appState.expenseReceipts || []).filter((r) => ids.includes(r.id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let processedValue: any;
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (type === 'number') {
      if (value === '') {
        processedValue = undefined;
      } else {
        const num = parseFloat(value);
        processedValue = isNaN(num) ? undefined : num;
      }
    } else {
      processedValue = value;
    }

    setCurrentItem((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const toggleReceiptLink = (receiptId: string) => {
    setCurrentItem((prev) => {
      const current = (prev as EventAccommodation).expenseReceiptIds || [];
      const next = current.includes(receiptId)
        ? current.filter((id) => id !== receiptId)
        : [...current, receiptId];
      return { ...prev, expenseReceiptIds: next };
    });
  };

  const handleSave = async () => {
    let savedItem: EventAccommodation;
    if (isEditing && 'id' in currentItem) {
      savedItem = {
        ...currentItem,
        expenseReceiptIds: currentItem.expenseReceiptIds || [],
        proofDocumentUrl: (currentItem.proofDocumentUrl || '').trim(),
        proofDocumentName: (currentItem.proofDocumentName || '').trim(),
      };
    } else {
      savedItem = {
        ...currentItem,
        id: generateId(),
        expenseReceiptIds: currentItem.expenseReceiptIds || [],
        proofDocumentUrl: (currentItem.proofDocumentUrl || '').trim(),
        proofDocumentName: (currentItem.proofDocumentName || '').trim(),
      } as EventAccommodation;
    }

    try {
      if (appState.activeTeamId) {
        const savedId = await saveData(appState.activeTeamId, 'eventAccommodations', savedItem);
        savedItem.id = savedId;
      }

      if (isEditing && 'id' in currentItem) {
        setEventAccommodations((prev) => prev.map((item) => (item.id === savedItem.id ? savedItem : item)));
      } else {
        setEventAccommodations((prev) => [...prev, savedItem]);
      }

      const linkedReceiptIds = savedItem.expenseReceiptIds || [];
      const primaryReceiptId = linkedReceiptIds[0];
      const linkedReceipts = (appState.expenseReceipts || []).filter((r) => linkedReceiptIds.includes(r.id));
      const receiptsTotal = linkedReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

      setEventBudgetItems((prevBudget) => {
        const budgetItemId = `auto-acco-${savedItem.id}`;
        const otherBudgetItems = prevBudget.filter((item) => item.id !== budgetItemId);
        if (savedItem.estimatedCost && savedItem.estimatedCost > 0) {
          return [
            ...otherBudgetItems,
            {
              id: budgetItemId,
              eventId: eventId,
              category: BudgetItemCategory.HEBERGEMENT,
              description: `Hébergement: ${savedItem.hotelName || 'Hôtel sans nom'}`,
              estimatedCost: savedItem.estimatedCost,
              actualCost: receiptsTotal > 0 ? receiptsTotal : undefined,
              notes: [
                `Hôtel: ${savedItem.hotelName || 'Hôtel sans nom'}`,
                `Coût estimé: ${savedItem.estimatedCost}€`,
                linkedReceiptIds.length ? `${linkedReceiptIds.length} justificatif(s) lié(s)` : null,
                savedItem.proofDocumentUrl ? `Confirmation: ${savedItem.proofDocumentName || savedItem.proofDocumentUrl}` : null,
              ]
                .filter(Boolean)
                .join('\n'),
              isAutoGenerated: true,
              expenseReceiptId: primaryReceiptId,
              proofDocumentId: primaryReceiptId,
            },
          ];
        }
        return otherBudgetItems;
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'hébergement:", error);
      alert("Erreur lors de la sauvegarde de l'hébergement. Veuillez réessayer.");
    }
  };

  const openAddModal = () => {
    setCurrentItem(emptyEventAccommodation(eventId, ''));
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: EventAccommodation) => {
    setCurrentItem({
      ...item,
      expenseReceiptIds: item.expenseReceiptIds || [],
      proofDocumentUrl: item.proofDocumentUrl || '',
      proofDocumentName: item.proofDocumentName || '',
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet hébergement ?')) {
      try {
        if (appState.activeTeamId) {
          await deleteData(appState.activeTeamId, 'eventAccommodations', id);
        }
        setEventAccommodations((prev) => prev.filter((item) => item.id !== id));
        const budgetItemId = `auto-acco-${id}`;
        setEventBudgetItems((prev) => prev.filter((item) => item.id !== budgetItemId));
      } catch (error) {
        console.error("Erreur lors de la suppression de l'hébergement:", error);
        alert("Erreur lors de la suppression de l'hébergement. Veuillez réessayer.");
      }
    }
  };

  const lightInputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
  const lightSelectClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
  const lightCheckboxClass = 'h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500';

  const selectedReceiptIds = (currentItem as EventAccommodation).expenseReceiptIds || [];

  return (
    <div>
      {stageRace && (
        <StageAccommodationEditor
          event={event}
          eventId={eventId}
          updateEvent={updateEvent}
          appState={appState}
          canViewFinancialInfo={canViewFinancialInfo}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-700">
          {stageRace ? 'Hébergements complémentaires' : `Hébergement pour ${event.name}`}
        </h3>
        <ActionButton onClick={openAddModal} icon={<PlusCircleIcon className="w-5 h-5" />}>
          Ajouter Hébergement
        </ActionButton>
      </div>

      {accommodationsForEvent.length === 0 ? (
        <p className="text-gray-500 italic p-4 bg-gray-50 rounded-md border text-center">
          Aucun hébergement défini pour cet événement.
        </p>
      ) : (
        <div className="space-y-4">
          {accommodationsForEvent.map((item) => {
            const linked = getLinkedReceipts(item);
            return (
              <div key={item.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-md font-semibold text-gray-800">{item.hotelName || 'Hébergement sans nom'}</h4>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        item.isStopover ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {item.isStopover ? 'Étape en Route' : 'Principal'}
                    </span>
                  </div>
                  <div className="flex-shrink-0 space-x-1">
                    <ActionButton
                      onClick={() => openEditModal(item)}
                      variant="secondary"
                      size="sm"
                      icon={<PencilIcon className="w-3 h-3" />}
                    />
                    <ActionButton
                      onClick={() => handleDelete(item.id)}
                      variant="danger"
                      size="sm"
                      icon={<TrashIcon className="w-3 h-3" />}
                    />
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                  <p>
                    <strong>Adresse:</strong> {item.address || 'N/A'}
                  </p>
                  <p>
                    <strong>Personnes:</strong> {item.numberOfPeople ?? 'N/A'}
                  </p>
                  <p>
                    <strong>Nuits:</strong> {item.numberOfNights}
                  </p>
                  <p>
                    <strong>Statut:</strong> {item.status}
                  </p>
                  {canViewFinancialInfo && (
                    <p>
                      <strong>Coût Estimé:</strong>{' '}
                      {item.estimatedCost !== undefined ? `${item.estimatedCost.toLocaleString('fr-FR')} €` : 'N/A'}
                    </p>
                  )}
                  <p>
                    <strong>Confirmé:</strong> {item.reservationConfirmed ? 'Oui' : 'Non'}
                  </p>
                  <p>
                    <strong>Distance Départ:</strong>{' '}
                    {item.distanceFromStartKm !== undefined ? `${item.distanceFromStartKm} km` : 'N/A'}
                  </p>
                  {!item.isStopover && (
                    <p>
                      <strong>Temps Trajet Départ:</strong> {item.travelTimeToStart || 'N/A'}
                    </p>
                  )}
                  <p className="md:col-span-2">
                    <strong>Détails:</strong> {item.confirmationDetails || 'N/A'}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Justificatifs</p>
                  {item.proofDocumentUrl ? (
                    <a
                      href={item.proofDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:underline"
                    >
                      {item.proofDocumentName || 'Confirmation / facture hôtel'}
                    </a>
                  ) : null}
                  {linked.length > 0 ? (
                    <ul className="space-y-1">
                      {linked.map((r) => (
                        <li key={r.id} className="text-sm text-gray-700 flex flex-wrap items-center gap-x-2">
                          <span className="font-medium">
                            {r.merchant || r.description || 'Justificatif'}
                          </span>
                          <span className="text-gray-500">
                            {r.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                          <span className="text-xs text-gray-400">{r.receiptDate}</span>
                          {r.imageUrl ? (
                            <a
                              href={r.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Voir scan
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : !item.proofDocumentUrl ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                      Aucun justificatif lié — ouvrez Modifier pour rattacher une facture ou une note de frais.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Modifier Hébergement' : 'Ajouter Hébergement'}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div>
            <label htmlFor="hotelName" className="block text-sm font-medium text-gray-700">
              Nom de l&apos;hôtel
            </label>
            <input
              type="text"
              name="hotelName"
              id="hotelName"
              value={(currentItem as EventAccommodation).hotelName}
              onChange={handleInputChange}
              className={lightInputClass}
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <textarea
              name="address"
              id="address"
              value={(currentItem as EventAccommodation).address}
              onChange={handleInputChange}
              rows={2}
              className={lightInputClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="numberOfPeople" className="block text-sm font-medium text-gray-700">
                Nombre de Personnes
              </label>
              <input
                type="number"
                name="numberOfPeople"
                id="numberOfPeople"
                value={(currentItem as EventAccommodation).numberOfPeople ?? ''}
                onChange={handleInputChange}
                min="0"
                className={lightInputClass}
              />
            </div>
            <div>
              <label htmlFor="numberOfNights" className="block text-sm font-medium text-gray-700">
                Nombre de nuits
              </label>
              <input
                type="number"
                name="numberOfNights"
                id="numberOfNights"
                value={(currentItem as EventAccommodation).numberOfNights}
                onChange={handleInputChange}
                min="0"
                className={lightInputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Statut
              </label>
              <select
                name="status"
                id="status"
                value={(currentItem as EventAccommodation).status}
                onChange={handleInputChange}
                className={lightSelectClass}
              >
                {Object.values(AccommodationStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="distanceFromStartKm" className="block text-sm font-medium text-gray-700">
                Distance du départ (km)
              </label>
              <input
                type="number"
                name="distanceFromStartKm"
                id="distanceFromStartKm"
                value={(currentItem as EventAccommodation).distanceFromStartKm ?? ''}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                className={lightInputClass}
                placeholder="Ex: 5.5"
              />
            </div>
          </div>
          {!(currentItem as EventAccommodation).isStopover && (
            <div>
              <label htmlFor="travelTimeToStart" className="block text-sm font-medium text-gray-700">
                Temps de trajet jusqu&apos;au départ
              </label>
              <input
                type="text"
                name="travelTimeToStart"
                id="travelTimeToStart"
                value={(currentItem as EventAccommodation).travelTimeToStart || ''}
                onChange={handleInputChange}
                className={lightInputClass}
                placeholder="Ex: 25min, 1h15"
              />
            </div>
          )}
          {canViewFinancialInfo && (
            <div>
              <label htmlFor="estimatedCost" className="block text-sm font-medium text-gray-700">
                Coût Estimé (€)
              </label>
              <input
                type="number"
                name="estimatedCost"
                id="estimatedCost"
                value={(currentItem as EventAccommodation).estimatedCost ?? ''}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={lightInputClass}
              />
            </div>
          )}
          <div>
            <label htmlFor="confirmationDetails" className="block text-sm font-medium text-gray-700">
              Détails confirmation (N°, lien…)
            </label>
            <input
              type="text"
              name="confirmationDetails"
              id="confirmationDetails"
              value={(currentItem as EventAccommodation).confirmationDetails}
              onChange={handleInputChange}
              className={lightInputClass}
            />
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 space-y-3">
            <p className="text-sm font-semibold text-indigo-900">Justificatifs d&apos;hébergement</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="proofDocumentName" className="block text-xs font-medium text-gray-700">
                  Nom du document
                </label>
                <input
                  type="text"
                  name="proofDocumentName"
                  id="proofDocumentName"
                  value={(currentItem as EventAccommodation).proofDocumentName || ''}
                  onChange={handleInputChange}
                  className={lightInputClass}
                  placeholder="Ex: Facture Oceania La Baule"
                />
              </div>
              <div>
                <label htmlFor="proofDocumentUrl" className="block text-xs font-medium text-gray-700">
                  Lien confirmation / facture
                </label>
                <input
                  type="url"
                  name="proofDocumentUrl"
                  id="proofDocumentUrl"
                  value={(currentItem as EventAccommodation).proofDocumentUrl || ''}
                  onChange={handleInputChange}
                  className={lightInputClass}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">
                Lier des notes de frais existantes
              </p>
              {receiptsForEvent.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  Aucun justificatif disponible. Scannez-en un dans Finances → Justificatifs (catégorie Hébergement),
                  puis revenez ici pour le rattacher.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-md border border-indigo-100 bg-white p-2">
                  {receiptsForEvent.map((r) => {
                    const checked = selectedReceiptIds.includes(r.id);
                    const isHotel =
                      r.budgetCategory === BudgetItemCategory.HEBERGEMENT ||
                      r.eventId === eventId;
                    return (
                      <label
                        key={r.id}
                        className={`flex items-start gap-2 rounded px-2 py-1.5 text-sm cursor-pointer ${
                          checked ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        } ${!isHotel ? 'opacity-70' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className={lightCheckboxClass + ' mt-0.5'}
                          checked={checked}
                          onChange={() => toggleReceiptLink(r.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-gray-800 block truncate">
                            {r.merchant || r.description || 'Justificatif'}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {r.budgetCategory} · {r.receiptDate} ·{' '}
                            {r.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            {r.eventId === eventId ? ' · cet événement' : ''}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="reservationConfirmed"
              id="reservationConfirmedModal"
              checked={(currentItem as EventAccommodation).reservationConfirmed}
              onChange={handleInputChange}
              className={lightCheckboxClass}
            />
            <label htmlFor="reservationConfirmedModal" className="ml-2 block text-sm text-gray-900">
              Réservation confirmée ?
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isStopover"
              id="isStopoverModal"
              checked={(currentItem as EventAccommodation).isStopover || false}
              onChange={handleInputChange}
              className={lightCheckboxClass}
            />
            <label htmlFor="isStopoverModal" className="ml-2 block text-sm text-gray-900">
              Ceci est un hébergement d&apos;étape (pour une nuit en route)
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <ActionButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </ActionButton>
            <ActionButton type="submit">Sauvegarder</ActionButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EventAccommodationTab;
