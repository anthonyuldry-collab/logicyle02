import React from 'react';
import ExpenseReceiptsPanel from '../../components/ExpenseReceiptsPanel';
import {
  AppSection,
  EventBudgetItem,
  EventTransportLeg,
  ExpenseReceipt,
  PermissionLevel,
  RaceEvent,
  StaffMember,
  User,
} from '../../types';

interface FinancialReceiptsTabProps {
  receipts: ExpenseReceipt[];
  raceEvents: RaceEvent[];
  transportLegs: EventTransportLeg[];
  currentUser: User;
  staff: StaffMember[];
  teamId: string;
  teamName: string;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  onSaveReceipt: (receipt: ExpenseReceipt) => Promise<void>;
  onSaveBudgetItem: (item: EventBudgetItem) => Promise<void>;
}

const FinancialReceiptsTab: React.FC<FinancialReceiptsTabProps> = (props) => (
  <ExpenseReceiptsPanel {...props} compact />
);

export default FinancialReceiptsTab;
