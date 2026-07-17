import React, { useState, useMemo, useCallback } from 'react';
import { AppPermissions, PermissionRole, AppSection, PermissionLevel, User, TeamRole } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import ShieldCheckIcon from '../components/icons/ShieldCheckIcon';
import { useTranslations } from '../hooks/useTranslations';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import {
  PERMISSION_PRESETS,
  PermissionPresetId,
  buildPresetPermissions,
  groupSectionsForPermissions,
  resolveRolePermissions,
} from '../utils/permissionUtils';

const generateId = () => `role_${Date.now().toString(36)}`;

export interface PermissionsSectionProps {
  permissions: AppPermissions;
  setPermissions: React.Dispatch<React.SetStateAction<AppPermissions>>;
  permissionRoles: PermissionRole[];
  setPermissionRoles: React.Dispatch<React.SetStateAction<PermissionRole[]>>;
  users: User[];
  onSave?: (permissions: AppPermissions, permissionRoles: PermissionRole[]) => Promise<void>;
  /** Intégré dans Utilisateurs & accès (sans SectionWrapper). */
  embedded?: boolean;
}

const PermissionsSection: React.FC<PermissionsSectionProps> = ({
  permissions,
  setPermissions,
  permissionRoles,
  setPermissionRoles,
  users,
  onSave,
  embedded = false,
}) => {
  const { language, t } = useTranslations();
  const editableRoles = useMemo(
    () => permissionRoles.filter((r) => r.id !== TeamRole.ADMIN && r.name !== 'Administrateur'),
    [permissionRoles]
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>(editableRoles[0]?.id || TeamRole.MEMBER);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [currentRoleName, setCurrentRoleName] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<PermissionRole | null>(null);

  const groupedSections = useMemo(() => groupSectionsForPermissions(language), [language]);

  const selectedRole = permissionRoles.find((r) => r.id === selectedRoleId);
  const permissionsForRole = useMemo(
    () => resolveRolePermissions(selectedRoleId, permissions),
    [selectedRoleId, permissions]
  );

  const markDirty = useCallback(() => setIsDirty(true), []);

  const handlePermissionChange = (
    roleId: string,
    sectionId: AppSection,
    permission: PermissionLevel,
    isChecked: boolean
  ) => {
    markDirty();
    setPermissions((currentPermissions) => {
      const newPermissions = structuredClone(currentPermissions || {});
      if (!newPermissions[roleId]) newPermissions[roleId] = {};
      if (!newPermissions[roleId]![sectionId]) newPermissions[roleId]![sectionId] = [];

      let sectionPerms = [...(newPermissions[roleId]![sectionId] as PermissionLevel[])];
      if (isChecked) {
        if (!sectionPerms.includes(permission)) sectionPerms.push(permission);
        if (permission === 'edit' && !sectionPerms.includes('view')) sectionPerms.push('view');
      } else {
        sectionPerms = sectionPerms.filter((p) => p !== permission);
        if (permission === 'view') sectionPerms = sectionPerms.filter((p) => p !== 'edit');
      }
      newPermissions[roleId]![sectionId] = sectionPerms;
      return newPermissions;
    });
  };

  const applyPreset = (presetId: PermissionPresetId) => {
    if (!selectedRoleId) return;
    markDirty();
    setPermissions((prev) => ({
      ...prev,
      [selectedRoleId]: buildPresetPermissions(presetId),
    }));
  };

  const handleSaveAll = async () => {
    if (!onSave) {
      setSaveMessage('Enregistrement local uniquement (connexion admin requise pour persister).');
      setIsDirty(false);
      return;
    }
    setIsSaving(true);
    setSaveMessage('');
    try {
      await onSave(permissions, permissionRoles);
      setIsDirty(false);
      setSaveMessage('Configuration enregistrée.');
    } catch (error) {
      console.error(error);
      setSaveMessage('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRole = (role: PermissionRole) => {
    setEditingRoleId(role.id);
    setCurrentRoleName(role.name);
    setIsRoleModalOpen(true);
  };

  const handleAddNewRole = () => {
    setEditingRoleId(null);
    setCurrentRoleName('');
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = () => {
    if (!currentRoleName.trim()) return;
    markDirty();
    if (editingRoleId) {
      setPermissionRoles((prev) =>
        prev.map((r) => (r.id === editingRoleId ? { ...r, name: currentRoleName.trim() } : r))
      );
    } else {
      const newRoleId = generateId();
      setPermissionRoles((prev) => [
        ...prev,
        { id: newRoleId, name: currentRoleName.trim(), isDeletable: true },
      ]);
      setPermissions((prev) => ({ ...prev, [newRoleId]: {} }));
      setSelectedRoleId(newRoleId);
    }
    setIsRoleModalOpen(false);
  };

  const handleDeleteRole = () => {
    if (!roleToDelete) return;
    markDirty();
    setPermissionRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
    setPermissions((prev) => {
      const next = { ...prev };
      delete next[roleToDelete.id];
      return next;
    });
    if (selectedRoleId === roleToDelete.id) {
      setSelectedRoleId(editableRoles.find((r) => r.id !== roleToDelete.id)?.id || TeamRole.MEMBER);
    }
    setRoleToDelete(null);
  };

  const isRoleInUse = (roleId: string) =>
    users.some((u) => u.permissionRole === roleId);

  const toggleSectionAll = (sectionId: AppSection, mode: 'view' | 'edit' | 'none') => {
    if (!selectedRoleId) return;
    markDirty();
    setPermissions((prev) => {
      const next = structuredClone(prev);
      if (!next[selectedRoleId]) next[selectedRoleId] = {};
      if (mode === 'none') {
        delete next[selectedRoleId]![sectionId];
      } else if (mode === 'view') {
        next[selectedRoleId]![sectionId] = ['view'];
      } else {
        next[selectedRoleId]![sectionId] = ['view', 'edit'];
      }
      return next;
    });
  };

  const actionBar = (
        <div className="flex items-center gap-2 flex-wrap">
          {isDirty && (
            <span className="text-xs text-amber-600 font-medium">{t('permissionsUnsaved')}</span>
          )}
          <ActionButton onClick={handleSaveAll} disabled={isSaving || !isDirty}>
            {isSaving ? t('permissionsSaving') : t('permissionsSave')}
          </ActionButton>
          <ActionButton onClick={handleAddNewRole} variant="secondary" icon={<PlusCircleIcon className="w-5 h-5" />}>
            {t('permissionsAddRole')}
          </ActionButton>
        </div>
  );

  const content = (
    <>
      {embedded && <div className="mb-4 flex justify-end">{actionBar}</div>}
      <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-medium">{t('permissionsHelpTitle')}</p>
        <p className="mt-1 text-blue-800">{t('permissionsHelpDesc')}</p>
      </div>

      {saveMessage && (
        <p className="mb-4 text-sm text-center text-gray-600">{saveMessage}</p>
      )}

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">{t('permissionsSelectRole')}</p>
        <div className="flex flex-wrap gap-2">
          {editableRoles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedRoleId === role.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {role.name}
            </button>
          ))}
        </div>
      </div>

      {selectedRole && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">{selectedRole.name}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => handleEditRole(selectedRole)} variant="secondary" size="sm" icon={<PencilIcon className="w-4 h-4" />}>
                Renommer
              </ActionButton>
              {selectedRole.isDeletable && (
                <ActionButton
                  onClick={() => setRoleToDelete(selectedRole)}
                  variant="danger"
                  size="sm"
                  icon={<TrashIcon className="w-4 h-4" />}
                  disabled={isRoleInUse(selectedRole.id)}
                  title={isRoleInUse(selectedRole.id) ? t('permissionsRoleInUse') : undefined}
                >
                  Supprimer
                </ActionButton>
              )}
            </div>
          </div>

          <div className="p-4 border-b">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {t('permissionsQuickPresets')}
            </p>
            <div className="flex flex-wrap gap-2">
              {PERMISSION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="text-left px-3 py-2 rounded-md border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  title={preset.description}
                >
                  <span className="block text-sm font-medium text-gray-800">{preset.label}</span>
                  <span className="block text-xs text-gray-500">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAdvanced ? '▾ Masquer le détail par section' : '▸ Affiner section par section'}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-6">
                {groupedSections.map(({ groupName, sections }) => (
                  <div key={groupName}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{groupName}</h4>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="px-3 py-2 text-left">Section</th>
                            <th className="px-3 py-2 text-center w-20">Lecture</th>
                            <th className="px-3 py-2 text-center w-24">Modification</th>
                            <th className="px-3 py-2 text-center w-28">Raccourci</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sections.map((section) => {
                            const perms = permissionsForRole[section.id as AppSection] || [];
                            const canView = perms.includes('view');
                            const canEdit = perms.includes('edit');
                            return (
                              <tr key={section.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-800">
                                  {section.labels[language] || section.labels.fr}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={canView}
                                    onChange={(e) =>
                                      handlePermissionChange(selectedRoleId, section.id as AppSection, 'view', e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={canEdit}
                                    onChange={(e) =>
                                      handlePermissionChange(selectedRoleId, section.id as AppSection, 'edit', e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex justify-center gap-1">
                                    <button type="button" className="text-xs text-gray-500 hover:text-blue-600" onClick={() => toggleSectionAll(section.id as AppSection, 'view')}>L</button>
                                    <button type="button" className="text-xs text-gray-500 hover:text-indigo-600" onClick={() => toggleSectionAll(section.id as AppSection, 'edit')}>E</button>
                                    <button type="button" className="text-xs text-gray-500 hover:text-red-600" onClick={() => toggleSectionAll(section.id as AppSection, 'none')}>×</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={editingRoleId ? 'Renommer le rôle' : 'Nouveau rôle'}>
        <div>
          <label htmlFor="roleName" className="block text-sm font-medium text-gray-700">Nom du rôle</label>
          <input
            type="text"
            id="roleName"
            value={currentRoleName}
            onChange={(e) => setCurrentRoleName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
            placeholder="Ex. Mécano, Soigneur..."
          />
          <div className="mt-4 flex justify-end gap-2">
            <ActionButton variant="secondary" onClick={() => setIsRoleModalOpen(false)}>Annuler</ActionButton>
            <ActionButton onClick={handleSaveRole}>Valider</ActionButton>
          </div>
        </div>
      </Modal>

      {roleToDelete && (
        <ConfirmationModal
          isOpen={!!roleToDelete}
          onClose={() => setRoleToDelete(null)}
          onConfirm={handleDeleteRole}
          title={`Supprimer le rôle "${roleToDelete.name}"`}
          message="Les utilisateurs assignés à ce rôle devront être réassignés manuellement."
        />
      )}
    </>
  );

  if (embedded) return content;

  return (
    <SectionWrapper title={t('permissionsTitle')} actionButton={actionBar}>
      {content}
    </SectionWrapper>
  );
};

export default PermissionsSection;
