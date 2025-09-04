// Test simple pour vérifier l'import de StaffRole
import { StaffRole } from './types';

console.log('StaffRole enum:', StaffRole);
console.log('StaffRole.ASSISTANT:', StaffRole.ASSISTANT);
console.log('StaffRole.DS:', StaffRole.DS);
console.log('Object.values(StaffRole):', Object.values(StaffRole));

// Test de création d'un objet avec StaffRole
const testStaff = {
    id: '1',
    firstName: 'Test',
    lastName: 'User',
    role: StaffRole.ASSISTANT,
    status: 'ACTIVE' as any
};

console.log('Test staff object:', testStaff);
