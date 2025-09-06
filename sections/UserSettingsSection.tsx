import React from 'react';
import SectionWrapper from '../components/SectionWrapper';
import SettingsTab from '../components/riderDetailTabs/SettingsTab';
import { User, Rider, StaffMember } from '../types';

interface UserSettingsSectionProps {
  currentUser: User;
  riderProfile?: Rider;
  staffProfile?: StaffMember;
}

const UserSettingsSection: React.FC<UserSettingsSectionProps> = ({
  currentUser,
  riderProfile,
  staffProfile
}) => {
  return (
    <SectionWrapper title="Paramètres du compte">
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Gestion de votre compte</h3>
          <p className="text-sm text-blue-700">
            Gérez vos paramètres de sécurité et votre compte personnel. 
            Ces paramètres sont privés et ne sont visibles que par vous.
          </p>
        </div>

        <SettingsTab
          formData={riderProfile || staffProfile}
          handleInputChange={() => {}} // Pas nécessaire pour les paramètres
          formFieldsEnabled={true}
        />
      </div>
    </SectionWrapper>
  );
};

export default UserSettingsSection;
