import React, { useState } from 'react';
import ActionButton from '../ActionButton';
import ConfirmationModal from '../ConfirmationModal';
import GdprSettingsPanel from '../GdprSettingsPanel';
import { updateUserPassword, deleteUserAccount } from '../../services/firebaseService';
import { useTranslations } from '../../hooks/useTranslations';
import { User } from '../../types';
import KeyIcon from '../icons/KeyIcon';
import TrashIcon from '../icons/TrashIcon';
import EyeIcon from '../icons/EyeIcon';
import EyeSlashIcon from '../icons/EyeSlashIcon';

interface SettingsTabProps {
  currentUser?: User;
  isOwnAccount?: boolean;
  formData?: unknown;
  handleInputChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  formFieldsEnabled?: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  currentUser,
  isOwnAccount = true,
}) => {
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

  if (!isOwnAccount || !currentUser) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-600">
        <p>{t('gdprSettingsOwnAccountOnly')}</p>
      </div>
    );
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('signupPasswordsMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('signupPasswordTooShort'));
      return;
    }

    setIsChangingPassword(true);

    try {
      await updateUserPassword(currentPassword, newPassword);
      setSuccess(t('gdprPasswordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('gdprPasswordError'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError('');
    setSuccess('');

    if (!deletePassword) {
      setError(t('gdprDeletePasswordRequired'));
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteUserAccount(deletePassword);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('gdprDeleteError'));
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
      <GdprSettingsPanel currentUser={currentUser} />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <KeyIcon className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">{t('gdprPasswordTitle')}</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t('gdprCurrentPassword')}
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
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
              {t('gdprNewPassword')}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
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
              {t('signupConfirmPasswordPlaceholder')}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
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
            {isChangingPassword ? t('gdprPasswordUpdating') : t('gdprPasswordUpdateButton')}
          </ActionButton>
        </form>
      </div>

      <div className="rounded-lg border border-red-800/50 bg-red-950/40 p-6">
        <div className="flex items-center mb-6">
          <TrashIcon className="w-5 h-5 text-red-300 mr-2" />
          <h3 className="text-lg font-semibold text-red-100">{t('gdprDeleteTitle')}</h3>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-red-700/50 bg-red-950/60 p-4">
            <h4 className="font-medium text-red-100 mb-2">{t('gdprDeleteWarningTitle')}</h4>
            <p className="text-sm text-red-200">{t('gdprDeleteWarningText')}</p>
            <ul className="text-sm text-red-200 mt-2 list-disc list-inside space-y-1">
              <li>{t('gdprDeleteItem1')}</li>
              <li>{t('gdprDeleteItem2')}</li>
              <li>{t('gdprDeleteItem3')}</li>
              <li>{t('gdprDeleteItem4')}</li>
            </ul>
          </div>

          <ActionButton
            onClick={openDeleteModal}
            variant="danger"
            className="w-full"
            icon={<TrashIcon className="w-4 h-4" />}
          >
            {t('gdprDeleteButton')}
          </ActionButton>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-700/50 bg-red-950/50 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-700/50 bg-emerald-950/50 p-4">
          <p className="text-sm text-emerald-200">{success}</p>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteAccount}
        title={t('gdprDeleteConfirmTitle')}
        message={
          <>
            <p>{t('gdprDeleteConfirmText')}</p>
            <div className="mt-4 text-left">
              <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('gdprDeletePasswordLabel')}
              </label>
              <div className="relative">
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  id="deletePassword"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 pr-10"
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
          </>
        }
      />
    </div>
  );
};

export default SettingsTab;
