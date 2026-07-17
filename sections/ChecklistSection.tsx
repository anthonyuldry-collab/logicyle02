
import React, { useState, useEffect, useMemo } from 'react';
import { ChecklistTemplate, ChecklistRole, ChecklistTemplateKind, EventType, ChecklistTiming, TeamLevel, TeamOperationalSettings, RaceEvent } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import { TIMING_LABEL_ORDER_STAGE, TIMING_LABEL_ORDER_COMPETITION, sortIndexForTask, getTimingLabelFromFiche } from '../data/fichePosteAssistant';
import {
  buildChecklistTemplatesFromFiche,
  countMissingFichePosteTasks,
  getFichePosteDefinition,
  getFichePosteSummary,
  getFichePosteTasks,
  getStructureLevelLabel,
  getTimingLabelFromFicheCatalog,
  groupFicheTasksBySection,
  resolveFicheStructureForTeam,
} from '../utils/fichePosteUtils';
import {
  getEnabledChecklistRoles,
  getEventFocusLabel,
  getOperationalPreset,
  isChecklistRoleEnabled,
} from '../utils/teamOperationalUtils';

interface ChecklistSectionProps {
  checklistTemplates: Record<ChecklistRole, ChecklistTemplate[]>;
  onSaveChecklistTemplate: (template: ChecklistTemplate) => void;
  onDeleteChecklistTemplate: (template: ChecklistTemplate) => void;
  onImportChecklistTemplates?: (templates: ChecklistTemplate[]) => Promise<number>;
  effectivePermissions?: any;
  teamLevel?: TeamLevel;
  operationalSettings?: TeamOperationalSettings;
  raceEvents?: RaceEvent[];
  onNavigateToSettings?: () => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const CHECKLIST_ROLE_STORAGE_KEY = 'checklist_active_role';
const CHECKLIST_EVENT_TYPE_KEY = 'checklist_event_type_filter';

type EventTypeFilter = EventType | 'all';

const TIMING_LABELS: Record<ChecklistTiming, string> = { avant: 'Avant', pendant: 'Pendant', apres: 'Après' };
const TIMING_ORDER: ChecklistTiming[] = ['avant', 'pendant', 'apres'];

const ChecklistSection: React.FC<ChecklistSectionProps> = ({
  checklistTemplates,
  onSaveChecklistTemplate,
  onDeleteChecklistTemplate,
  onImportChecklistTemplates,
  effectivePermissions,
  teamLevel,
  operationalSettings,
  raceEvents,
  onNavigateToSettings,
}) => {
  const isRider = effectivePermissions && effectivePermissions.checklist && Array.isArray(effectivePermissions.checklist) && effectivePermissions.checklist.includes('view');
  const enabledRoles = useMemo(
    () => getEnabledChecklistRoles(teamLevel, operationalSettings),
    [teamLevel, operationalSettings]
  );
  const operationalPreset = getOperationalPreset(teamLevel);
  const defaultRole = isRider
    ? (enabledRoles.includes(ChecklistRole.COUREUR) ? ChecklistRole.COUREUR : enabledRoles[0])
    : (enabledRoles.includes(ChecklistRole.DS) ? ChecklistRole.DS : enabledRoles[0]);
  const storedRole = typeof localStorage !== 'undefined' ? localStorage.getItem(CHECKLIST_ROLE_STORAGE_KEY) : null;
  const initialRole = (storedRole && enabledRoles.includes(storedRole as ChecklistRole))
    ? (storedRole as ChecklistRole)
    : defaultRole;
  const storedEventType = typeof localStorage !== 'undefined' ? localStorage.getItem(CHECKLIST_EVENT_TYPE_KEY) : null;
  const initialEventType: EventTypeFilter = (storedEventType === EventType.COMPETITION || storedEventType === EventType.STAGE || storedEventType === 'all') ? (storedEventType as EventTypeFilter) : 'all';

  const [activeRole, setActiveRole] = useState<ChecklistRole>(initialRole);
  const [activeEventTypeFilter, setActiveEventTypeFilter] = useState<EventTypeFilter>(initialEventType);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<ChecklistTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ onConfirm: () => void } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const structureLevel = resolveFicheStructureForTeam(teamLevel, operationalSettings);
  const structureLabel = getStructureLevelLabel(structureLevel);
  const activeFiche = getFichePosteDefinition(activeRole);
  const activeFicheTasks = getFichePosteTasks(activeRole, structureLevel, teamLevel, operationalSettings, raceEvents);
  const activeFicheSummary = getFichePosteSummary(activeRole, structureLevel);
  const existingForRole = (checklistTemplates && checklistTemplates[activeRole]) || [];
  const missingFicheCount = countMissingFichePosteTasks(
    activeRole,
    structureLevel,
    existingForRole,
    teamLevel,
    operationalSettings,
    raceEvents
  );
  const eventFocusLabel = getEventFocusLabel(operationalSettings, raceEvents);
  const fichePreviewSections = groupFicheTasksBySection(activeFicheTasks);
  const roleEnabled = isChecklistRoleEnabled(activeRole, teamLevel, operationalSettings);

  const setActiveRolePersisted = (role: ChecklistRole) => {
    setActiveRole(role);
    try {
      localStorage.setItem(CHECKLIST_ROLE_STORAGE_KEY, role);
    } catch (_) {}
  };

  useEffect(() => {
    if (!enabledRoles.includes(activeRole) && enabledRoles[0]) {
      setActiveRolePersisted(enabledRoles[0]);
    }
  }, [enabledRoles, activeRole]);

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

  const handleImportFichePoste = async () => {
    const existing = (checklistTemplates && checklistTemplates[activeRole]) || [];
    const { added, templates } = buildChecklistTemplatesFromFiche(
      activeRole,
      structureLevel,
      existing,
      generateId,
      teamLevel,
      operationalSettings,
      raceEvents
    );
    if (added === 0) {
      const roleLabel = activeFiche?.title || activeRole;
      alert(`Aucune nouvelle tâche : la fiche de poste ${roleLabel} est déjà importée pour ce niveau de structure.`);
      return;
    }
    setIsImporting(true);
    try {
      if (onImportChecklistTemplates) {
        await onImportChecklistTemplates(templates);
      } else {
        for (const template of templates) {
          await onSaveChecklistTemplate(template);
        }
      }
      setActiveEventTypeFilter('all');
      const roleLabel = activeFiche?.title || activeRole;
      alert(`${added} tâche(s) de la fiche de poste ${roleLabel} (${structureLabel}) ont été ajoutées.`);
    } catch {
      alert('Erreur lors de l\'import. Veuillez réessayer.');
    } finally {
      setIsImporting(false);
    }
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

  /** Label de section pour affichage : priorité timingLabel en base, puis lookup fiche, sinon moment générique */
  const effectiveTimingLabel = (t: ChecklistTemplate): string =>
    t.timingLabel
    || getTimingLabelFromFiche(t.name ?? '', t.eventType)
    || getTimingLabelFromFicheCatalog(t.name ?? '', t.eventType)
    || (TIMING_LABELS[getTiming(t)] ?? '');

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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rôle</p>
            <span className="text-xs text-gray-500">{operationalPreset.label}</span>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Rôles">
            {enabledRoles.map(role => (
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
          {enabledRoles.length < Object.values(ChecklistRole).length && onNavigateToSettings && (
            <p className="text-xs text-slate-500 mt-2">
              Certains rôles sont masqués pour votre secteur ({enabledRoles.length}/{Object.values(ChecklistRole).length}).
              {' '}
              <button type="button" onClick={onNavigateToSettings} className="text-blue-600 hover:underline font-medium">
                Ajuster dans Paramètres
              </button>
            </p>
          )}
        </div>

        {!roleEnabled ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
            Ce rôle n&apos;est pas actif pour votre profil opérationnel.
            {onNavigateToSettings && (
              <>
                {' '}
                <button type="button" onClick={onNavigateToSettings} className="font-medium underline">
                  Activer dans Paramètres
                </button>
              </>
            )}
          </div>
        ) : (
        <div className="rounded-lg bg-slate-50/80 p-4 border border-slate-100">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Fiche de poste type</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Niveau : {structureLabel}
            </span>
          </div>
          {activeFiche && (
            <div className="mb-3">
              <p className="text-sm font-medium text-slate-800">{activeFiche.title}</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeFicheSummary}</p>
              <p className="text-xs text-slate-500 mt-1">
                {activeFicheTasks.length} tâche(s) dans la fiche
                {missingFicheCount > 0
                  ? ` · ${missingFicheCount} à importer`
                  : ' · déjà importée'}
              </p>
            </div>
          )}
          <details className="mb-3 rounded-lg border border-slate-200 bg-white/70">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900">
              Voir le détail de la fiche ({activeFicheTasks.length} tâches)
            </summary>
            <div className="px-3 pb-3 max-h-64 overflow-y-auto space-y-3">
              {fichePreviewSections.map(({ label, items }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
                  <ul className="space-y-0.5">
                    {items.map((task) => (
                      <li key={`${label}-${task.name}`} className="text-xs text-slate-700 leading-relaxed">
                        · {task.name}
                        {task.kind === 'a_prevoir' && (
                          <span className="ml-1 text-amber-700">(remarque)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
          <ActionButton
            onClick={handleImportFichePoste}
            variant="secondary"
            size="sm"
            disabled={isImporting || missingFicheCount === 0}
            icon={<PlusCircleIcon className="w-4 h-4"/>}
            title={`Ajoute les tâches du modèle ${activeFiche?.title || activeRole} adaptées au niveau ${structureLabel}. Les doublons sont ignorés.`}
          >
            {isImporting
              ? 'Import en cours…'
              : missingFicheCount > 0
                ? `Importer la fiche de poste — ${activeFiche?.title || activeRole} (${missingFicheCount})`
                : `Fiche déjà importée — ${activeFiche?.title || activeRole}`}
          </ActionButton>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Profil <strong>{operationalPreset.label}</strong> · fiches {structureLabel} · {eventFocusLabel}
            {teamLevel ? ` · ${teamLevel}` : ''}. Les doublons sont ignorés.
          </p>
        </div>
        )}
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
            <div className="py-6 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200 space-y-2">
              <p className="text-gray-500 text-sm italic">Aucune tâche.</p>
              {missingFicheCount > 0 && (
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {missingFicheCount} tâche(s) disponibles dans la fiche de poste {activeFiche?.title || activeRole}.
                  {' '}Cliquez sur <strong>Importer la fiche de poste</strong> ci-dessus pour les ajouter.
                </p>
              )}
            </div>
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
