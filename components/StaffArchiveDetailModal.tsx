import React from 'react';
import { StaffMember, StaffArchive } from '../types';
import { XMarkIcon, UsersIcon, CalendarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { getStaffRoleDisplayLabel, getStaffRoleKey } from '../utils/staffRoleUtils';

interface StaffArchiveDetailModalProps {
  archive: StaffArchive | null;
  isOpen: boolean;
  onClose: () => void;
}

const StaffArchiveDetailModal: React.FC<StaffArchiveDetailModalProps> = ({
  archive,
  isOpen,
  onClose
}) => {
  if (!isOpen || !archive) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'MANAGER': 'bg-purple-100 text-purple-800',
      'DS': 'bg-blue-100 text-blue-800',
      'ASSISTANT': 'bg-green-100 text-green-800',
      'MECANO': 'bg-orange-100 text-orange-800',
      'COMMUNICATION': 'bg-pink-100 text-pink-800',
      'MEDECIN': 'bg-red-100 text-red-800',
      'KINE': 'bg-yellow-100 text-yellow-800',
      'RESP_PERF': 'bg-indigo-100 text-indigo-800',
      'ENTRAINEUR': 'bg-teal-100 text-teal-800',
      'DATA_ANALYST': 'bg-cyan-100 text-cyan-800',
      'PREPA_PHYSIQUE': 'bg-lime-100 text-lime-800',
      'AUTRE': 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors['AUTRE'];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'BENEVOLE': 'bg-green-100 text-green-800',
      'VACATAIRE': 'bg-yellow-100 text-yellow-800',
      'SALARIE': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'BENEVOLE': 'Bénévole',
      'VACATAIRE': 'Vacataire',
      'SALARIE': 'Salarié(e)'
    };
    return labels[status] || 'Non défini';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <UserGroupIcon className="w-6 h-6 text-gray-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Effectif du Staff - Saison {archive.season}
              </h2>
              <p className="text-sm text-gray-600">
                Archivé le {formatDate(archive.archivedAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Statistiques générales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <UsersIcon className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Total Staff</p>
                  <p className="text-2xl font-bold text-blue-900">{archive.totalStaff}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Staff Actif</p>
                  <p className="text-2xl font-bold text-green-900">{archive.activeStaff}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <CalendarIcon className="w-8 h-8 text-gray-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Staff Inactif</p>
                  <p className="text-2xl font-bold text-gray-900">{archive.inactiveStaff}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des membres du staff */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Membres du Staff</h3>
              <p className="text-sm text-gray-600">
                Détail de tous les membres du staff pour la saison {archive.season}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Téléphone
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actif
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {archive.staff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            {member.birthDate && (
                              <div className="text-sm text-gray-500">
                                {new Date(member.birthDate).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(getStaffRoleKey(member.role) || 'AUTRE')}`}>
                          {getStaffRoleDisplayLabel(member.role) || 'Autre'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status || 'BENEVOLE')}`}>
                          {getStatusLabel(member.status || 'BENEVOLE')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {member.phone || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {member.email}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.isActive !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.isActive !== false ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffArchiveDetailModal;
