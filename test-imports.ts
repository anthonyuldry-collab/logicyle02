// Test des imports StaffRole et StaffStatus
import { StaffRole, StaffStatus } from './types';

console.log('✅ StaffRole importé avec succès:', StaffRole);
console.log('✅ StaffStatus importé avec succès:', StaffStatus);

// Test des valeurs
console.log('StaffRole.ASSISTANT:', StaffRole.ASSISTANT);
console.log('StaffRole.DS:', StaffRole.DS);
console.log('StaffRole.AUTRE:', StaffRole.AUTRE);

console.log('StaffStatus.VACATAIRE:', StaffStatus.VACATAIRE);
console.log('StaffStatus.SALARIE:', StaffStatus.SALARIE);
console.log('StaffStatus.BENEVOLE:', StaffStatus.BENEVOLE);

// Test de création d'objets
const testStaffMember = {
    id: 'test-1',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: StaffRole.ASSISTANT,
    status: StaffStatus.VACATAIRE
};

console.log('✅ Objet StaffMember créé avec succès:', testStaffMember);

// Test Object.values
console.log('Object.values(StaffRole):', Object.values(StaffRole));
console.log('Object.values(StaffStatus):', Object.values(StaffStatus));
