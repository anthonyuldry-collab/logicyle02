import React from 'react';
import SectionWrapper from '../components/SectionWrapper';
import ExpenseReceiptsPanel from '../components/ExpenseReceiptsPanel';
import {
  AppSection,
  EventBudgetItem,
  EventTransportLeg,
  ExpenseReceipt,
  PermissionLevel,
  RaceEvent,
  StaffMember,
  User,
} from '../types';
import { useTranslations } from '../hooks/useTranslations';

interface ExpenseReceiptsSectionProps {
  receipts: ExpenseReceipt[];
  raceEvents: RaceEvent[];
  transportLegs: EventTransportLeg[];
  currentUser: User;
  staff: StaffMember[];
  teamId: string;
  teamName: string;
  storageScope?: 'team' | 'user';
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  onSaveReceipt: (receipt: ExpenseReceipt) => Promise<void>;
  onSaveBudgetItem?: (item: EventBudgetItem) => Promise<void>;
  defaultEventId?: string;
  defaultTransportLegId?: string;
  autoOpenScanner?: boolean;
  onScannerOpened?: () => void;
}

const ExpenseReceiptsSection: React.FC<ExpenseReceiptsSectionProps> = (props) => {
  const { t } = useTranslations();
  return (
    <SectionWrapper title={t('titleExpenseReceipts')}>
      <ExpenseReceiptsPanel {...props} />
    </SectionWrapper>
  );
};

export default ExpenseReceiptsSection;
