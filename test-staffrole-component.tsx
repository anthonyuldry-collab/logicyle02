import React from 'react';
import { StaffRole } from './types';

// Composant de test simple pour StaffRole
const TestStaffRoleComponent: React.FC = () => {
  console.log('🔍 TestStaffRoleComponent - StaffRole enum:', StaffRole);
  console.log('🔍 TestStaffRoleComponent - Object.values(StaffRole):', Object.values(StaffRole));
  
  return (
    <div className="bg-blue-100 p-4 rounded-lg border border-blue-300">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Test StaffRole</h3>
      <div className="space-y-2 text-sm">
        <p><strong>StaffRole enum:</strong> {JSON.stringify(StaffRole)}</p>
        <p><strong>StaffRole.ASSISTANT:</strong> {StaffRole.ASSISTANT}</p>
        <p><strong>StaffRole.DS:</strong> {StaffRole.DS}</p>
        <p><strong>StaffRole.MANAGER:</strong> {StaffRole.MANAGER}</p>
        <p><strong>Object.values(StaffRole):</strong> {JSON.stringify(Object.values(StaffRole))}</p>
      </div>
      
      <div className="mt-4">
        <h4 className="font-semibold text-blue-700 mb-2">Test de création d'objets:</h4>
        <div className="space-y-1 text-xs">
          {Object.values(StaffRole).map(role => (
            <div key={role} className="bg-white p-2 rounded border">
              <strong>{role}:</strong> {typeof role} - {role}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestStaffRoleComponent;
