import React, { useState, useEffect, useMemo } from 'react';
import { AppPermissions, TeamRole, AppSection, PermissionLevel, User } from '../types';
import Modal from './Modal';
import ActionButton from './ActionButton';
import * as firebaseService from '../services/firebaseService';
import {
  computePermissionDeltas,
  getRoleLabel,
  groupSectionsForPermissions,
  resolveRolePermissions,
} from '../utils/permissionUtils';

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  basePermissions: AppPermissions;
  permissionRoles: Array<{ id: string; name: string }>;
  onSave: (userId: string, customDeltas: Partial<Record<AppSection, PermissionLevel[]>>) => void;
}

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  isOpen,
  onClose,
  user,
  basePermissions,
  permissionRoles,
  onSave,
}) => {
  const [effectivePermissions, setEffectivePermissions] = useState<Partial<Record<AppSection, PermissionLevel[]>>>({});

  const roleBasePermissions = useMemo(
    () => resolveRolePermissions(user.permissionRole || TeamRole.VIEWER, basePermissions),
    [user.permissionRole, basePermissions]
  );

  useEffect(() => {
    if (user && isOpen) {
      setEffectivePermissions(
        firebaseService.getEffectivePermissions(user, basePermissions, [])
      );
    }
  }, [user, basePermissions, isOpen]);

  const handlePermissionChange = (sectionId: AppSection, permission: PermissionLevel, isChecked: boolean) => {
    setEffectivePermissions((current) => {
      const newPermissions = structuredClone(current || {});
      if (!newPermissions[sectionId]) newPermissions[sectionId] = [];
      let sectionPerms = [...(newPermissions[sectionId] as PermissionLevel[])];
      if (isChecked) {
        if (!sectionPerms.includes(permission)) sectionPerms.push(permission);
        if (permission === 'edit' && !sectionPerms.includes('view')) sectionPerms.push('view');
      } else {
        sectionPerms = sectionPerms.filter((p) => p !== permission);
        if (permission === 'view') sectionPerms = sectionPerms.filter((p) => p !== 'edit');
      }
      newPermissions[sectionId] = sectionPerms;
      return newPermissions;
    });
  };

  const handleResetToRole = () => {
    setEffectivePermissions({ ...roleBasePermissions });
  };

  const handleSave = () => {
    const deltas = computePermissionDeltas(roleBasePermissions, effectivePermissions);
    onSave(user.id, deltas);
    onClose();
  };

  const groupedSections = useMemo(() => groupSectionsForPermissions('fr'), []);
  const customCount = useMemo(
    () => Object.keys(computePermissionDeltas(roleBasePermissions, effectivePermissions)).length,
    [roleBasePermissions, effectivePermissions]
  );

  if (user.permissionRole === TeamRole.ADMIN) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`Exceptions — ${user.firstName} ${user.lastName}`}>
        <p className="text-sm text-gray-600">Les administrateurs ont un accès complet. Aucune exception nécessaire.</p>
        <div className="flex justify-end mt-4">
          <ActionButton variant="secondary" onClick={onClose}>Fermer</ActionButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Exceptions — ${user.firstName} ${user.lastName}`}>
      <div className="text-sm text-gray-600 mb-4 space-y-1">
        <p>
          Niveau d&apos;accès : <strong>{getRoleLabel(user.permissionRole, permissionRoles as any)}</strong>
        </p>
        <p className="text-xs text-gray-500">
          Modifiez uniquement ce qui diffère du rôle. Les lignes surlignées sont des exceptions ({customCount}).
        </p>
      </div>

      <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-4">
        {groupedSections.map(({ groupName, sections }) => (
          <div key={groupName}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{groupName}</h4>
            <table className="min-w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-3 py-1.5 text-left">Section</th>
                  <th className="px-3 py-1.5 text-center w-16">Lecture</th>
                  <th className="px-3 py-1.5 text-center w-16">Édition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sections.map((section) => {
                  const perms = effectivePermissions[section.id as AppSection] || [];
                  const basePerms = roleBasePermissions[section.id as AppSection] || [];
                  const canView = perms.includes('view');
                  const canEdit = perms.includes('edit');
                  const isCustom =
                    canView !== basePerms.includes('view') || canEdit !== basePerms.includes('edit');
                  return (
                    <tr key={section.id} className={isCustom ? 'bg-amber-50' : ''}>
                      <td className="px-3 py-1.5 font-medium text-gray-800">{section.labels.fr}</td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={canView}
                          onChange={(e) => handlePermissionChange(section.id as AppSection, 'view', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={canEdit}
                          onChange={(e) => handlePermissionChange(section.id as AppSection, 'edit', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t">
        <ActionButton variant="secondary" onClick={handleResetToRole}>
          Réinitialiser au rôle
        </ActionButton>
        <div className="flex gap-2">
          <ActionButton variant="secondary" onClick={onClose}>Annuler</ActionButton>
          <ActionButton onClick={handleSave}>Enregistrer les exceptions</ActionButton>
        </div>
      </div>
    </Modal>
  );
};

export default UserPermissionsModal;
