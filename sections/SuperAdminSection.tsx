import React, { useState, useMemo } from 'react';
import { Rider, StaffMember, User } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import ConfirmationModal from '../components/ConfirmationModal';
import { TrashIcon, UserGroupIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { deleteData } from '../services/firebaseService';

interface SuperAdminSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  onDeleteRider: (rider: Rider) => void;
  onDeleteStaff: (staff: StaffMember) => void;
  appState: any;
}

const SuperAdminSection: React.FC<SuperAdminSectionProps> = ({
  riders,
  staff,
  currentUser,
  onDeleteRider,
  onDeleteStaff,
  appState
}) => {
  const [selectedRiders, setSelectedRiders] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'riders' | 'staff' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Vérifier si l'utilisateur est super admin (basé sur l'email)
  const isSuperAdmin = currentUser?.email === 'ds.lanesterwomen@gmail.com' || 
                      currentUser?.email === 'anthony.uldry@example.com' ||
                      currentUser?.email?.includes('admin');

  if (!isSuperAdmin) {
    return (
      <SectionWrapper title="🔒 Super Administrateur">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Accès refusé</h3>
          <p className="text-red-600">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
        </div>
      </SectionWrapper>
    );
  }

  // Trouver les profils en double par email
  const duplicateRiders = useMemo(() => {
    const emailGroups = new Map<string, Rider[]>();
    
    riders.forEach(rider => {
      if (rider.email) {
        if (!emailGroups.has(rider.email)) {
          emailGroups.set(rider.email, []);
        }
        emailGroups.get(rider.email)!.push(rider);
      }
    });
    
    return Array.from(emailGroups.entries())
      .filter(([email, profiles]) => profiles.length > 1)
      .map(([email, profiles]) => ({ email, profiles }));
  }, [riders]);

  const duplicateStaff = useMemo(() => {
    const emailGroups = new Map<string, StaffMember[]>();
    
    staff.forEach(member => {
      if (member.email) {
        if (!emailGroups.has(member.email)) {
          emailGroups.set(member.email, []);
        }
        emailGroups.get(member.email)!.push(member);
      }
    });
    
    return Array.from(emailGroups.entries())
      .filter(([email, profiles]) => profiles.length > 1)
      .map(([email, profiles]) => ({ email, profiles }));
  }, [staff]);

  // Filtrer les profils selon la recherche
  const filteredRiders = riders.filter(rider => 
    `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rider.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStaff = staff.filter(member => 
    `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectRider = (riderId: string) => {
    setSelectedRiders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(riderId)) {
        newSet.delete(riderId);
      } else {
        newSet.add(riderId);
      }
      return newSet;
    });
  };

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  const handleSelectAllRiders = () => {
    if (selectedRiders.size === filteredRiders.length) {
      setSelectedRiders(new Set());
    } else {
      setSelectedRiders(new Set(filteredRiders.map(r => r.id)));
    }
  };

  const handleSelectAllStaff = () => {
    if (selectedStaff.size === filteredStaff.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(filteredStaff.map(s => s.id)));
    }
  };

  const handleDeleteSelected = (type: 'riders' | 'staff') => {
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!appState.activeTeamId) {
      alert('Aucun teamId actif. Impossible de supprimer.');
      return;
    }

    console.log('🗑️ Super Admin - Début de la suppression:', { 
      deleteType, 
      selectedRiders: selectedRiders.size, 
      selectedStaff: selectedStaff.size,
      activeTeamId: appState.activeTeamId 
    });

    try {
      if (deleteType === 'riders') {
        for (const riderId of selectedRiders) {
          const rider = riders.find(r => r.id === riderId);
          if (rider) {
            console.log('🗑️ Suppression du coureur:', rider.firstName, rider.lastName, 'ID:', riderId);
            // Supprimer de Firebase
            await deleteData(appState.activeTeamId, 'riders', riderId);
            console.log('✅ Suppression Firebase réussie pour:', rider.firstName, rider.lastName);
            // Supprimer de l'état local
            onDeleteRider(rider);
            console.log('✅ Suppression locale réussie pour:', rider.firstName, rider.lastName);
          }
        }
        setSelectedRiders(new Set());
      } else if (deleteType === 'staff') {
        for (const staffId of selectedStaff) {
          const member = staff.find(s => s.id === staffId);
          if (member) {
            console.log('🗑️ Suppression du staff:', member.firstName, member.lastName, 'ID:', staffId);
            // Supprimer de Firebase
            await deleteData(appState.activeTeamId, 'staff', staffId);
            console.log('✅ Suppression Firebase réussie pour:', member.firstName, member.lastName);
            // Supprimer de l'état local
            onDeleteStaff(member);
            console.log('✅ Suppression locale réussie pour:', member.firstName, member.lastName);
          }
        }
        setSelectedStaff(new Set());
      }
      
      alert(`✅ ${selectedRiders.size + selectedStaff.size} profil(s) supprimé(s) avec succès !`);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      alert('❌ Erreur lors de la suppression. Vérifiez la console pour plus de détails.');
    }
    
    setShowDeleteModal(false);
    setDeleteType(null);
  };

  const handleMergeDuplicates = async (email: string, profiles: Rider[] | StaffMember[]) => {
    if (!appState.activeTeamId) {
      alert('Aucun teamId actif. Impossible de fusionner.');
      return;
    }

    // Garder le profil le plus complet (celui avec le plus de propriétés non vides)
    const sortedProfiles = profiles.sort((a, b) => {
      const aCompleteness = Object.values(a).filter(v => v !== undefined && v !== null && v !== '').length;
      const bCompleteness = Object.values(b).filter(v => v !== undefined && v !== null && v !== '').length;
      return bCompleteness - aCompleteness;
    });

    const primaryProfile = sortedProfiles[0];
    const duplicateProfiles = sortedProfiles.slice(1);

    try {
      // Supprimer les profils en double
      for (const duplicate of duplicateProfiles) {
        await deleteData(appState.activeTeamId, 'riders', duplicate.id);
        onDeleteRider(duplicate as Rider);
      }
      
      alert(`✅ Profils fusionnés pour ${email}. ${duplicateProfiles.length} doublon(s) supprimé(s).`);
    } catch (error) {
      console.error('Erreur lors de la fusion:', error);
      alert('❌ Erreur lors de la fusion. Vérifiez la console pour plus de détails.');
    }
  };

  return (
    <SectionWrapper 
      title="🔧 Super Administrateur" 
      actionButton={
        <div className="flex space-x-2">
          <ActionButton 
            onClick={() => setShowDuplicates(!showDuplicates)}
            variant="secondary"
            icon={<UserGroupIcon className="w-5 h-5"/>}
          >
            {showDuplicates ? 'Masquer Doublons' : 'Afficher Doublons'}
          </ActionButton>
          <ActionButton 
            onClick={() => {
              console.log('🧪 Test de suppression - Coureurs disponibles:', riders.length);
              console.log('🧪 Test de suppression - Staff disponible:', staff.length);
              console.log('🧪 Test de suppression - TeamId actif:', appState.activeTeamId);
            }}
            variant="secondary"
            icon={<ExclamationTriangleIcon className="w-5 h-5"/>}
          >
            Test Debug
          </ActionButton>
          <ActionButton 
            onClick={() => handleDeleteSelected('riders')}
            variant="danger"
            disabled={selectedRiders.size === 0}
            icon={<TrashIcon className="w-5 h-5"/>}
          >
            Supprimer Coureurs ({selectedRiders.size})
          </ActionButton>
          <ActionButton 
            onClick={() => handleDeleteSelected('staff')}
            variant="danger"
            disabled={selectedStaff.size === 0}
            icon={<TrashIcon className="w-5 h-5"/>}
          >
            Supprimer Staff ({selectedStaff.size})
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800">Coureurs</h3>
            <p className="text-2xl font-bold text-blue-600">{riders.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-800">Staff</h3>
            <p className="text-2xl font-bold text-green-600">{staff.length}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="font-medium text-orange-800">Doublons</h3>
            <p className="text-2xl font-bold text-orange-600">{duplicateRiders.length + duplicateStaff.length}</p>
          </div>
        </div>

        {/* Recherche */}
        <div className="bg-white p-4 rounded-lg border">
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Doublons */}
        {showDuplicates && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">🔍 Profils en Double</h3>
            
            {duplicateRiders.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-3">Coureurs en Double</h4>
                {duplicateRiders.map(({ email, profiles }) => (
                  <div key={email} className="mb-3 p-3 bg-white rounded border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">{email}</span>
                      <ActionButton
                        onClick={() => handleMergeDuplicates(email, profiles)}
                        variant="warning"
                        size="sm"
                        icon={<ArrowPathIcon className="w-4 h-4"/>}
                      >
                        Fusionner
                      </ActionButton>
                    </div>
                    <div className="space-y-1">
                      {profiles.map(profile => (
                        <div key={profile.id} className="text-sm text-gray-600">
                          • {profile.firstName} {profile.lastName} (ID: {profile.id})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {duplicateStaff.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-3">Staff en Double</h4>
                {duplicateStaff.map(({ email, profiles }) => (
                  <div key={email} className="mb-3 p-3 bg-white rounded border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">{email}</span>
                      <ActionButton
                        onClick={() => handleMergeDuplicates(email, profiles)}
                        variant="warning"
                        size="sm"
                        icon={<ArrowPathIcon className="w-4 h-4"/>}
                      >
                        Fusionner
                      </ActionButton>
                    </div>
                    <div className="space-y-1">
                      {profiles.map(profile => (
                        <div key={profile.id} className="text-sm text-gray-600">
                          • {profile.firstName} {profile.lastName} (ID: {profile.id})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {duplicateRiders.length === 0 && duplicateStaff.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Aucun profil en double trouvé !</p>
              </div>
            )}
          </div>
        )}

        {/* Liste des Coureurs */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Coureurs ({filteredRiders.length})</h3>
              <ActionButton
                onClick={handleSelectAllRiders}
                variant="secondary"
                size="sm"
              >
                {selectedRiders.size === filteredRiders.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </ActionButton>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredRiders.map(rider => (
              <div key={rider.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedRiders.has(rider.id)}
                      onChange={() => handleSelectRider(rider.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {rider.firstName} {rider.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{rider.email}</div>
                      <div className="text-xs text-gray-400">ID: {rider.id}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {rider.birthDate ? new Date(rider.birthDate).toLocaleDateString('fr-FR') : 'Pas de date'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liste du Staff */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Staff ({filteredStaff.length})</h3>
              <ActionButton
                onClick={handleSelectAllStaff}
                variant="secondary"
                size="sm"
              >
                {selectedStaff.size === filteredStaff.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </ActionButton>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredStaff.map(member => (
              <div key={member.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStaff.has(member.id)}
                      onChange={() => handleSelectStaff(member.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                      <div className="text-xs text-gray-400">ID: {member.id}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {member.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer ${deleteType === 'riders' ? selectedRiders.size : selectedStaff.size} profil(s) ? Cette action est irréversible !`}
      />
    </SectionWrapper>
  );
};

export default SuperAdminSection;
