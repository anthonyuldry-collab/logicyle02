import React, { useState } from 'react';
import ActionButton from '../ActionButton';
import ConfirmationModal from '../ConfirmationModal';
import { updateUserPassword, deleteUserAccount } from '../../services/firebaseService';
import { useTranslations } from '../../hooks/useTranslations';
import KeyIcon from '../icons/KeyIcon';
import TrashIcon from '../icons/TrashIcon';
import EyeIcon from '../icons/EyeIcon';
import EyeSlashIcon from '../icons/EyeSlashIcon';

interface SettingsTabProps {
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  formFieldsEnabled: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ formData, handleInputChange, formFieldsEnabled }) => {
  const { t } = useTranslations();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsChangingPassword(true);

    try {
      await updateUserPassword(currentPassword, newPassword);
      setSuccess('Mot de passe mis à jour avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError('');
    setSuccess('');

    if (!deletePassword) {
      setError('Veuillez entrer votre mot de passe pour confirmer la suppression');
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteUserAccount(deletePassword);
      // La redirection sera gérée par l'App.tsx via onAuthStateChanged
    } catch (error: any) {
      setError(error.message);
      setIsDeletingAccount(false);
    }
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
    setDeletePassword('');
    setError('');
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setError('');
  };

  return (
    <div className="space-y-8">
      {/* Section Modification du mot de passe */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <KeyIcon className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Modification du mot de passe</h3>
        </div>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Entrez votre mot de passe actuel"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCurrentPassword ? (
                  <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <EyeIcon className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Entrez votre nouveau mot de passe"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNewPassword ? (
                  <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <EyeIcon className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Confirmez votre nouveau mot de passe"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <EyeIcon className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <ActionButton
            type="submit"
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="w-full"
          >
            {isChangingPassword ? 'Modification en cours...' : 'Modifier le mot de passe'}
          </ActionButton>
        </form>
      </div>

      {/* Section Suppression du compte */}
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <div className="flex items-center mb-6">
          <TrashIcon className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-red-900">Suppression du compte</h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-red-100 border border-red-300 rounded-md p-4">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Attention</h4>
            <p className="text-sm text-red-700">
              La suppression de votre compte est irréversible. Toutes vos données personnelles, 
              performances, et informations de profil seront définitivement supprimées.
            </p>
          </div>

          <ActionButton
            onClick={openDeleteModal}
            variant="danger"
            className="w-full"
            icon={<TrashIcon className="w-4 h-4" />}
          >
            Supprimer mon compte
          </ActionButton>
        </div>
      </div>

      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteAccount}
        title="Confirmer la suppression du compte"
        message="Cette action est irréversible. Toutes vos données seront définitivement supprimées."
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        variant="danger"
      >
        <div className="mt-4">
          <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe actuel (confirmation requise)
          </label>
          <div className="relative">
            <input
              type={showDeletePassword ? 'text' : 'password'}
              id="deletePassword"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 pr-10"
              placeholder="Entrez votre mot de passe pour confirmer"
              required
            />
            <button
              type="button"
              onClick={() => setShowDeletePassword(!showDeletePassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showDeletePassword ? (
                <EyeSlashIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <EyeIcon className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default SettingsTab;
