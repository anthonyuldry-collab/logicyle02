import React from 'react';
import { UserRole, StaffRole, StaffStatus } from '../types';

const TestEnums: React.FC = () => {
  const testUserRole = () => {
    console.log('🧪 TEST: UserRole enum');
    console.log('UserRole.STAFF:', UserRole.STAFF);
    console.log('UserRole.COUREUR:', UserRole.COUREUR);
    console.log('Type UserRole.STAFF:', typeof UserRole.STAFF);
    console.log('Type UserRole.COUREUR:', typeof UserRole.COUREUR);
    console.log('Comparaison STAFF:', "Staff" === UserRole.STAFF);
    console.log('Comparaison COUREUR:', "Coureur" === UserRole.COUREUR);
  };

  const testStaffEnums = () => {
    console.log('🧪 TEST: Staff enums');
    console.log('StaffRole.AUTRE:', StaffRole.AUTRE);
    console.log('StaffStatus.VACATAIRE:', StaffStatus.VACATAIRE);
    console.log('Type StaffRole.AUTRE:', typeof StaffRole.AUTRE);
    console.log('Type StaffStatus.VACATAIRE:', typeof StaffStatus.VACATAIRE);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">🧪 Test des Enums</h3>
      <div className="space-y-3">
        <button
          onClick={testUserRole}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Tester UserRole
        </button>
        <button
          onClick={testStaffEnums}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 ml-2"
        >
          Tester Staff Enums
        </button>
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p className="text-sm text-gray-700">
            <strong>Valeurs attendues :</strong><br/>
            UserRole.STAFF = "Staff"<br/>
            UserRole.COUREUR = "Coureur"<br/>
            StaffRole.AUTRE = "Autre"<br/>
            StaffStatus.VACATAIRE = "Vacataire"
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestEnums;
