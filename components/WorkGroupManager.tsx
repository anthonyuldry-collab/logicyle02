import React, { useState } from 'react';
import { Rider } from '../types';
import { 
  UserGroupIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UsersIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { getStaffRoleDisplayLabel } from '../utils/staffRoleUtils';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
}

interface WorkGroup {
  id: string;
  name: string;
  description: string;
  riders: Rider[];
  staffReferent?: StaffMember;
  themes: string[];
  workAreas: string[];
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'planned';
  color: string;
}

interface WorkGroupManagerProps {
  riders: Rider[];
  staffMembers?: StaffMember[];
  onGroupCreate?: (group: WorkGroup) => void;
  onGroupUpdate?: (group: WorkGroup) => void;
  onGroupDelete?: (groupId: string) => void;
}

const WorkGroupManager: React.FC<WorkGroupManagerProps> = ({
  riders,
  staffMembers = [],
  onGroupCreate,
  onGroupUpdate,
  onGroupDelete
}) => {
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkGroup | null>(null);
  const [selectedRiders, setSelectedRiders] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    workAreas: [] as string[],
    staffReferentId: ''
  });

  const workAreaOptions = ['Physique', 'Technique', 'Mental', 'Environnement', 'Tactique'];
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    planned: 'bg-yellow-100 text-yellow-800'
  };

  const handleCreateGroup = () => {
    if (selectedRiders.size === 0 || !formData.name.trim()) return;

    const selectedRidersList = riders.filter(r => selectedRiders.has(r.id));
    const staffReferent = staffMembers.find(s => s.id === formData.staffReferentId);
    
    const newGroup: WorkGroup = {
      id: `group-${Date.now()}`,
      name: formData.name,
      description: '',
      riders: selectedRidersList,
      staffReferent: staffReferent || undefined,
      themes: [],
      workAreas: formData.workAreas,
      startDate: new Date().toISOString().split('T')[0],
      endDate: undefined,
      status: 'active',
      color: `hsl(${groups.length * 60}, 70%, 50%)`
    };

    setGroups([...groups, newGroup]);
    onGroupCreate?.(newGroup);
    setShowCreateModal(false);
    resetForm();
  };

  const handleUpdateGroup = () => {
    if (!editingGroup) return;

    const staffReferent = staffMembers.find(s => s.id === formData.staffReferentId);
    const updatedGroup = {
      ...editingGroup,
      name: formData.name,
      workAreas: formData.workAreas,
      staffReferent: staffReferent || undefined,
      riders: riders.filter(r => selectedRiders.has(r.id))
    };

    setGroups(groups.map(g => g.id === editingGroup.id ? updatedGroup : g));
    onGroupUpdate?.(updatedGroup);
    setEditingGroup(null);
    resetForm();
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    onGroupDelete?.(groupId);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      workAreas: [],
      staffReferentId: ''
    });
    setSelectedRiders(new Set());
  };

  const openEditModal = (group: WorkGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      workAreas: group.workAreas,
      staffReferentId: group.staffReferent?.id || ''
    });
    setSelectedRiders(new Set(group.riders.map(r => r.id)));
    setShowCreateModal(true);
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'Grimpeur': return 'bg-red-100 text-red-800';
      case 'Sprinteur': return 'bg-green-100 text-green-800';
      case 'Rouleur': return 'bg-blue-100 text-blue-800';
      case 'Puncheur': return 'bg-yellow-100 text-yellow-800';
      case 'Complet': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestion des Groupes de Travail</h2>
            <p className="text-gray-600">Créez et gérez des groupes d'athlètes basés sur leurs projets performance</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Nouveau groupe
          </button>
        </div>
      </div>

      {/* Statistiques simplifiées */}
      {groups.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {groups.length} groupe{groups.length > 1 ? 's' : ''} • {groups.reduce((acc, g) => acc + g.riders.length, 0)} athlète{groups.reduce((acc, g) => acc + g.riders.length, 0) > 1 ? 's' : ''}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors['active']}`}>
              {groups.filter(g => g.status === 'active').length} actif{groups.filter(g => g.status === 'active').length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Liste des groupes */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg border border-gray-200">
            {/* En-tête du groupe */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  ></div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[group.status]}`}>
                    {group.status === 'active' ? 'Actif' : group.status === 'completed' ? 'Terminé' : 'Planifié'}
                  </span>
                  <button
                    onClick={() => openEditModal(group)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Contenu du groupe - version simplifiée */}
            <div className="p-4 space-y-3">
              {/* Informations essentielles en une ligne */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <UsersIcon className="w-4 h-4 mr-1" />
                  {group.riders.length} athlète{group.riders.length > 1 ? 's' : ''}
                </span>
                {group.staffReferent && (
                  <span className="flex items-center">
                    <TagIcon className="w-4 h-4 mr-1" />
                    {group.staffReferent.firstName} {group.staffReferent.lastName}
                  </span>
                )}
                {group.workAreas.length > 0 && (
                  <div className="flex items-center gap-2">
                    {group.workAreas.slice(0, 2).map((area) => (
                      <span
                        key={area}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
                        {area}
                      </span>
                    ))}
                    {group.workAreas.length > 2 && (
                      <span className="text-xs text-gray-500">+{group.workAreas.length - 2}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Athlètes - version compacte */}
              <div>
                <div className="flex flex-wrap gap-2">
                  {group.riders.map((rider) => (
                    <div key={rider.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <span className="text-sm font-medium text-gray-900">
                        {rider.firstName} {rider.lastName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getProfileColor(rider.qualitativeProfile as string)}`}>
                        {rider.qualitativeProfile}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <UserGroupIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">Aucun groupe de travail créé</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Créer le premier groupe
          </button>
        </div>
      )}

      {/* Modal de création/édition */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingGroup ? 'Modifier le groupe' : 'Créer un nouveau groupe'}
            </h3>

            <div className="space-y-4">
              {/* Nom du groupe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du groupe *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Groupe Endurance"
                />
              </div>

              {/* Domaines de travail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domaines de travail (optionnel)
                </label>
                <div className="flex flex-wrap gap-2">
                  {workAreaOptions.map((area) => (
                    <label key={area} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.workAreas.includes(area)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, workAreas: [...formData.workAreas, area] });
                          } else {
                            setFormData({ ...formData, workAreas: formData.workAreas.filter(a => a !== area) });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{area}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Staff référent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff référent (optionnel)
                </label>
                <select
                  value={formData.staffReferentId}
                  onChange={(e) => setFormData({ ...formData, staffReferentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Aucun</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.firstName} {staff.lastName} - {getStaffRoleDisplayLabel(staff.role)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélection des athlètes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Athlètes * ({selectedRiders.size} sélectionné{selectedRiders.size > 1 ? 's' : ''})
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {riders.map((rider) => (
                    <label key={rider.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRiders.has(rider.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedRiders);
                          if (e.target.checked) {
                            newSelected.add(rider.id);
                          } else {
                            newSelected.delete(rider.id);
                          }
                          setSelectedRiders(newSelected);
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {rider.firstName} {rider.lastName}
                        </span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getProfileColor(rider.qualitativeProfile as string)}`}>
                          {rider.qualitativeProfile}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingGroup(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                disabled={selectedRiders.size === 0 || !formData.name.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingGroup ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkGroupManager;
