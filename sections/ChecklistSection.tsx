
import React, { useState } from 'react';
import { ChecklistTemplate, ChecklistRole, ChecklistTemplateKind, EventType, ChecklistTiming } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import { FICHE_POSTE_ASSISTANT_ALL, TIMING_LABEL_ORDER_STAGE, TIMING_LABEL_ORDER_COMPETITION, sortIndexForTask, getTimingLabelFromFiche } from '../data/fichePosteAssistant';

interface ChecklistSectionProps {
  checklistTemplates: Record<ChecklistRole, ChecklistTemplate[]>;
  onSaveChecklistTemplate: (template: ChecklistTemplate) => void;
  onDeleteChecklistTemplate: (template: ChecklistTemplate) => void;
  effectivePermissions?: any;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const CHECKLIST_ROLE_STORAGE_KEY = 'checklist_active_role';
const CHECKLIST_EVENT_TYPE_KEY = 'checklist_event_type_filter';

type EventTypeFilter = EventType | 'all';

const TIMING_LABELS: Record<ChecklistTiming, string> = { avant: 'Avant', pendant: 'Pendant', apres: 'Après' };
const TIMING_ORDER: ChecklistTiming[] = ['avant', 'pendant', 'apres'];

const ChecklistSection: React.FC<ChecklistSectionProps> = ({ checklistTemplates, onSaveChecklistTemplate, onDeleteChecklistTemplate, effectivePermissions }) => {
  const isRider = effectivePermissions && effectivePermissions.checklist && Array.isArray(effectivePermissions.checklist) && effectivePermissions.checklist.includes('view');
  const defaultRole = isRider ? ChecklistRole.COUREUR : ChecklistRole.DS;
  const storedRole = typeof localStorage !== 'undefined' ? localStorage.getItem(CHECKLIST_ROLE_STORAGE_KEY) : null;
  const initialRole = (storedRole && Object.values(ChecklistRole).includes(storedRole as ChecklistRole)) ? (storedRole as ChecklistRole) : defaultRole;
  const storedEventType = typeof localStorage !== 'undefined' ? localStorage.getItem(CHECKLIST_EVENT_TYPE_KEY) : null;
  const initialEventType: EventTypeFilter = (storedEventType === EventType.COMPETITION || storedEventType === EventType.STAGE || storedEventType === 'all') ? (storedEventType as EventTypeFilter) : 'all';

  const [activeRole, setActiveRole] = useState<ChecklistRole>(initialRole);
  const [activeEventTypeFilter, setActiveEventTypeFilter] = useState<EventTypeFilter>(initialEventType);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<ChecklistTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ onConfirm: () => void } | null>(null);

  const setActiveRolePersisted = (role: ChecklistRole) => {
    setActiveRole(role);
    try {
      localStorage.setItem(CHECKLIST_ROLE_STORAGE_KEY, role);
    } catch (_) {}
  };

  const setEventTypeFilterPersisted = (filter: EventTypeFilter) => {
    setActiveEventTypeFilter(filter);
    try {
      localStorage.setItem(CHECKLIST_EVENT_TYPE_KEY, filter);
    } catch (_) {}
  };

  const handleAdd = (kind: ChecklistTemplateKind) => {
    const eventType = activeEventTypeFilter === 'all' ? undefined : activeEventTypeFilter;
    setCurrentItem({ id: '', name: '', kind, eventType, timing: 'pendant' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: ChecklistTemplate) => {
    setCurrentItem(task);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (task: ChecklistTemplate) => {
    setConfirmAction({
      onConfirm: () => {
        onDeleteChecklistTemplate(task);
      }
    });
  };

  const handleImportFichePosteAssistant = () => {
    const existing = (checklistTemplates && checklistTemplates[ChecklistRole.ASSISTANT]) || [];
    const existingKeys = new Set(
      existing.map(t => `${(t.name || '').trim().toLowerCase()}|${t.eventType || ''}|${t.timingLabel || ''}`)
    );
    let added = 0;
    FICHE_POSTE_ASSISTANT_ALL.forEach(task => {
      const key = `${task.name.trim().toLowerCase()}|${task.eventType}|${task.timingLabel || ''}`;
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      onSaveChecklistTemplate({
        id: generateId(),
        name: task.name,
        role: ChecklistRole.ASSISTANT,
        kind: (task.kind as ChecklistTemplateKind) || 'task',
        eventType: task.eventType,
        timing: task.timing || 'pendant',
        timingLabel: task.timingLabel,
      });
      added += 1;
    });
    if (added > 0) {
      setActiveRolePersisted(ChecklistRole.ASSISTANT);
      setActiveEventTypeFilter('all');
    }
    alert(added > 0 ? `${added} tâche(s) de la fiche de poste Assistant Sportif ont été ajoutées.` : 'Aucune nouvelle tâche : la fiche de poste est déjà importée pour ce rôle.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem || !currentItem.name) return;
    const eventType = currentItem.eventType ?? (activeEventTypeFilter === 'all' ? undefined : activeEventTypeFilter);
    const itemWithRole = { ...currentItem, role: activeRole, kind: currentItem.kind || 'task', eventType, timing: currentItem.timing || 'pendant' };
    if (isEditing) {
      onSaveChecklistTemplate(itemWithRole);
    } else {
      onSaveChecklistTemplate({ ...itemWithRole, id: generateId() });
    }
    setIsModalOpen(false);
    setCurrentItem(null);
  };

  const allForRole = (checklistTemplates && checklistTemplates[activeRole]) || [];
  const matchesEventType = (t: ChecklistTemplate) =>
    activeEventTypeFilter === 'all' || !t.eventType || t.eventType === activeEventTypeFilter;
  const getTiming = (t: ChecklistTemplate): ChecklistTiming => (t.timing || 'pendant');
  const filteredForRole = allForRole.filter(matchesEventType);

  /** Label de section pour affichage : priorité timingLabel en base, puis lookup fiche (Assistant), sinon moment générique */
  const effectiveTimingLabel = (t: ChecklistTemplate): string =>
    t.timingLabel || getTimingLabelFromFiche(t.name ?? '', t.eventType) || (TIMING_LABELS[getTiming(t)] ?? '');

  const sortByFicheOrder = (a: ChecklistTemplate, b: ChecklistTemplate) => {
    const aWithLabel = { ...a, timingLabel: effectiveTimingLabel(a) };
    const bWithLabel = { ...b, timingLabel: effectiveTimingLabel(b) };
    const ia = sortIndexForTask(aWithLabel, TIMING_LABEL_ORDER_STAGE, TIMING_LABEL_ORDER_COMPETITION);
    const ib = sortIndexForTask(bWithLabel, TIMING_LABEL_ORDER_STAGE, TIMING_LABEL_ORDER_COMPETITION);
    if (ia !== ib) return ia - ib;
    return (a.name || '').localeCompare(b.name || '');
  };
  const tasksList = filteredForRole.filter(t => (t.kind || 'task') === 'task').sort(sortByFicheOrder);
  const aPrevoirList = filteredForRole.filter(t => t.kind === 'a_prevoir').sort(sortByFicheOrder);

  /** Groupe les tâches par timingLabel (ordre de la fiche) pour afficher des sous-titres. Utilise effectiveTimingLabel pour les modèles sans timingLabel en base. */
  const groupByTimingLabel = (list: ChecklistTemplate[]) => {
    const groups: { label: string; items: ChecklistTemplate[] }[] = [];
    let currentLabel = '';
    let currentItems: ChecklistTemplate[] = [];
    list.forEach(t => {
      const label = effectiveTimingLabel(t);
      if (label !== currentLabel) {
        if (currentItems.length) groups.push({ label: currentLabel, items: currentItems });
        currentLabel = label;
        currentItems = [];
      }
      currentItems.push(t);
    });
    if (currentItems.length) groups.push({ label: currentLabel, items: currentItems });
    return groups;
  };
  const tasksBySection = groupByTimingLabel(tasksList);
  const aPrevoirBySection = groupByTimingLabel(aPrevoirList);

  const tabButtonStyle = (role: ChecklistRole) =>
    `px-4 py-2.5 font-medium text-sm rounded-lg whitespace-nowrap transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
      activeRole === role
        ? 'bg-white text-gray-900 border-2 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
        : 'text-gray-600 hover:text-gray-800 hover:bg-white/80 border-2 border-transparent'
    }`;

  const eventTypeButtonStyle = (value: EventTypeFilter) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 ${
      activeEventTypeFilter === value
        ? 'bg-gray-800 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  const sectionTitle = isRider ? "Ma Checklist Modèle (Coureur)" : "Éditeur de Checklists Modèles";

  const listItem = (task: ChecklistTemplate, showTimingBadge?: boolean) => (
    <li key={task.id} className="py-3 px-4 bg-gray-50/80 hover:bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center gap-4">
      <span className="text-gray-800 text-sm leading-relaxed flex-1 min-w-0">
          {showTimingBadge && (task.timingLabel || TIMING_LABELS[getTiming(task)]) && (
          <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
            {task.timingLabel || TIMING_LABELS[getTiming(task)]}
          </span>
        )}
        {task.name}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <ActionButton onClick={() => handleEditTask(task)} variant="secondary" size="sm" icon={<PencilIcon className="w-4 h-4"/>}>Modifier</ActionButton>
        <ActionButton onClick={() => handleDeleteTask(task)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4"/>}>Supprimer</ActionButton>
      </div>
    </li>
  );

  const modalTitle = currentItem?.kind === 'a_prevoir'
    ? (isEditing ? "Modifier la remarque" : "Ajouter une remarque")
    : (isEditing ? "Modifier la tâche modèle" : "Ajouter une tâche modèle");

  return (
    <SectionWrapper title={sectionTitle}>
      <div className="mb-6 pb-6 border-b border-gray-200 space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Définissez les tâches et remarques par <strong>rôle</strong> et par <strong>type d&apos;événement</strong> (stage ou compétition). Ces modèles seront proposés lors de la création d&apos;un événement.
        </p>

        <div className="rounded-lg bg-gray-50/60 p-4 border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Type d&apos;événement</p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setEventTypeFilterPersisted('all')} className={eventTypeButtonStyle('all')}>Tous</button>
            <button type="button" onClick={() => setEventTypeFilterPersisted(EventType.COMPETITION)} className={eventTypeButtonStyle(EventType.COMPETITION)}>{EventType.COMPETITION}</button>
            <button type="button" onClick={() => setEventTypeFilterPersisted(EventType.STAGE)} className={eventTypeButtonStyle(EventType.STAGE)}>{EventType.STAGE}</button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Rôle</p>
          <nav className="flex flex-wrap gap-1" aria-label="Rôles">
            {Object.values(ChecklistRole)
              .filter(role => role && typeof role === 'string')
              .map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRolePersisted(role as ChecklistRole)}
                  className={tabButtonStyle(role as ChecklistRole)}
                >
                  {role}
                </button>
              ))}
          </nav>
        </div>

        <div className="rounded-lg bg-slate-50/80 p-4 border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Fiche de poste type</p>
          <ActionButton
            onClick={handleImportFichePosteAssistant}
            variant="secondary"
            size="sm"
            icon={<PlusCircleIcon className="w-4 h-4"/>}
            title="Ajoute les tâches Stage et Compétition du modèle Assistant Sportif. Les doublons sont ignorés."
          >
            Importer la fiche de poste Assistant Sportif
          </ActionButton>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Ajoute les tâches du modèle pour le rôle Assistant (Stage + Compétition). Doublons ignorés.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-b-lg overflow-hidden">
        <section className="p-5 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Tâches <span className="font-normal text-gray-500">({tasksList.length})</span>
            </h2>
            <ActionButton onClick={() => handleAdd('task')} icon={<PlusCircleIcon className="w-4 h-4"/>} size="sm">
              Ajouter une tâche
            </ActionButton>
          </div>
          {tasksList.length === 0 ? (
            <p className="py-6 text-center text-gray-500 text-sm italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">Aucune tâche.</p>
          ) : (
            <div className="space-y-4">
              {tasksBySection.map(({ label, items }) => (
                <div key={label}>
                  <h3 className="text-sm font-medium text-gray-600 mb-2 mt-4 first:mt-0">{label}</h3>
                  <ul className="space-y-2">{items.map(t => listItem(t, false))}</ul>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Remarques <span className="font-normal text-gray-500">({aPrevoirList.length})</span>
            </h2>
            <ActionButton onClick={() => handleAdd('a_prevoir')} icon={<PlusCircleIcon className="w-4 h-4"/>} size="sm">
              Ajouter une remarque
            </ActionButton>
          </div>
          {aPrevoirList.length === 0 ? (
            <p className="py-6 text-center text-gray-500 text-sm italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">Aucune remarque.</p>
          ) : (
            <div className="space-y-4">
              {aPrevoirBySection.map(({ label, items }) => (
                <div key={label}>
                  <h3 className="text-sm font-medium text-gray-600 mb-2 mt-4 first:mt-0">{label}</h3>
                  <ul className="space-y-2">{items.map(t => listItem(t, false))}</ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">
              {currentItem?.kind === 'a_prevoir' ? "Libellé de la remarque" : "Nom de la tâche"}
            </label>
            <input 
              type="text" 
              id="itemName"
              value={currentItem?.name || ''} 
              onChange={e => setCurrentItem(prev => prev ? {...prev, name: e.target.value} : null)}
              required 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
            />
          </div>
          <div>
            <label htmlFor="itemTiming" className="block text-sm font-medium text-gray-700">Moment</label>
            <select
              id="itemTiming"
              value={currentItem?.timing || 'pendant'}
              onChange={e => setCurrentItem(prev => prev ? { ...prev, timing: e.target.value as ChecklistTiming } : null)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
            >
              {TIMING_ORDER.map(t => (
                <option key={t} value={t}>{TIMING_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            Rôle : <strong>{activeRole}</strong>
            {currentItem?.timing && ` · Moment : ${TIMING_LABELS[currentItem.timing]}`}
            {currentItem?.kind === 'a_prevoir' && " · Remarque"}
            {currentItem?.eventType && ` · ${currentItem.eventType}`}
            {(!currentItem?.eventType && activeEventTypeFilter !== 'all') && ` · ${activeEventTypeFilter}`}
            {!currentItem?.eventType && activeEventTypeFilter === 'all' && " · Stage et Compétition"}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <ActionButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</ActionButton>
            <ActionButton type="submit">{isEditing ? "Sauvegarder" : "Ajouter"}</ActionButton>
          </div>
        </form>
      </Modal>

      {confirmAction && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
          title="Confirmer la suppression"
          message="Êtes-vous sûr de vouloir supprimer cette tâche du modèle ?"
        />
      )}

    </SectionWrapper>
  );
};

export default ChecklistSection;
