import React, { useMemo, useState } from 'react';
import { IncomeItem, IncomeCategory } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { isSponsorshipIncome } from '../utils/financialUtils';
import { resolveIncomeAccountingCode } from '../constants/accountingCodes';
import { suggestPartnershipCounterparts } from '../utils/partnershipDocumentUtils';

interface IncomeFormProps {
  item?: IncomeItem | null;
  defaultCategory?: IncomeCategory;
  onSave: (item: IncomeItem) => void;
  onCancel: () => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ item, defaultCategory, onSave, onCancel }) => {
  const { t, language } = useTranslations();
  const [formData, setFormData] = useState<Omit<IncomeItem, 'id'>>({
    description: item?.description || '',
    amount: item?.amount || 0,
    date: item?.date || new Date().toISOString().split('T')[0],
    category: item?.category || defaultCategory || IncomeCategory.SPONSORING,
    notes: item?.notes || '',
    sponsorshipContactName: item?.sponsorshipContactName || '',
    sponsorshipContactEmail: item?.sponsorshipContactEmail || '',
    sponsorshipContactPhone: item?.sponsorshipContactPhone || '',
    sponsorshipContractStart: item?.sponsorshipContractStart || '',
    sponsorshipContractEnd: item?.sponsorshipContractEnd || '',
    clientName: item?.clientName || item?.sponsorshipContactName || '',
    clientAddress: item?.clientAddress || '',
    clientVatNumber: item?.clientVatNumber || '',
    vatRate: item?.vatRate ?? 0,
    sponsorCompanyName: item?.sponsorCompanyName || '',
    sponsorSiret: item?.sponsorSiret || '',
    sponsorRepresentative: item?.sponsorRepresentative || '',
    sponsorLegalForm: item?.sponsorLegalForm || '',
    partnershipCounterparts: item?.partnershipCounterparts || '',
    donationForm: item?.donationForm || 'numéraire',
  });

  const accountingPreview = useMemo(
    () => resolveIncomeAccountingCode(formData.category, language),
    [formData.category, language]
  );

  const showSponsorshipFields = isSponsorshipIncome({ ...formData, id: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const incomeItem: IncomeItem = {
      id: item?.id || crypto.randomUUID(),
      ...formData,
      sponsorshipContactName: formData.sponsorshipContactName || undefined,
      sponsorshipContactEmail: formData.sponsorshipContactEmail || undefined,
      sponsorshipContactPhone: formData.sponsorshipContactPhone || undefined,
      sponsorshipContractStart: formData.sponsorshipContractStart || undefined,
      sponsorshipContractEnd: formData.sponsorshipContractEnd || undefined,
      clientName: formData.clientName || formData.sponsorshipContactName || undefined,
      clientAddress: formData.clientAddress || undefined,
      clientVatNumber: formData.clientVatNumber || undefined,
      vatRate: formData.vatRate,
      accountingCode: accountingPreview.code,
      accountingLabel: accountingPreview.label,
      accountingJournal: accountingPreview.journal,
      sponsorCompanyName: formData.sponsorCompanyName || undefined,
      sponsorSiret: formData.sponsorSiret || undefined,
      sponsorRepresentative: formData.sponsorRepresentative || undefined,
      sponsorLegalForm: formData.sponsorLegalForm || undefined,
      partnershipCounterparts: formData.partnershipCounterparts || undefined,
      donationForm: formData.donationForm || undefined,
    };
    onSave(incomeItem);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="income-description" className="block text-sm font-medium text-gray-700">
          {t('formDescription')}
        </label>
        <input
          id="income-description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="income-amount" className="block text-sm font-medium text-gray-700">
            {t('formAmount')}
          </label>
          <input
            id="income-amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label htmlFor="income-date" className="block text-sm font-medium text-gray-700">
            {t('formDate')}
          </label>
          <input
            id="income-date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="income-category" className="block text-sm font-medium text-gray-700">
          {t('formCategory')}
        </label>
        <select
          id="income-category"
          value={formData.category}
          onChange={(e) => {
            const category = e.target.value as IncomeCategory;
            setFormData((prev) => ({
              ...prev,
              category,
              partnershipCounterparts:
                prev.partnershipCounterparts || suggestPartnershipCounterparts(category),
            }));
          }}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.values(IncomeCategory).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-emerald-100 bg-emerald-50/60 p-3 text-sm">
        <p className="font-medium text-emerald-900">{t('invoiceAccountingPreview')}</p>
        <p className="mt-1 font-mono text-emerald-800">
          {accountingPreview.code} — {accountingPreview.label}
        </p>
        <p className="text-xs text-emerald-700">
          {t('invoiceJournal')} : {accountingPreview.journal}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
            {t('invoiceClient')}
          </label>
          <input
            id="client-name"
            type="text"
            value={formData.clientName || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="client-vat" className="block text-sm font-medium text-gray-700">
            {t('invoiceClientVat')}
          </label>
          <input
            id="client-vat"
            type="text"
            value={formData.clientVatNumber || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, clientVatNumber: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="client-address" className="block text-sm font-medium text-gray-700">
          {t('invoiceClientAddress')}
        </label>
        <textarea
          id="client-address"
          value={formData.clientAddress || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, clientAddress: e.target.value }))}
          rows={2}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {showSponsorshipFields && (
        <div className="space-y-4 rounded-md border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-sm font-medium text-blue-900">{t('formSponsorInfo')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sponsor-company" className="block text-sm font-medium text-gray-700">
                {t('partnershipCompanyName')}
              </label>
              <input
                id="sponsor-company"
                type="text"
                value={formData.sponsorCompanyName || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorCompanyName: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="sponsor-siret" className="block text-sm font-medium text-gray-700">
                SIRET
              </label>
              <input
                id="sponsor-siret"
                type="text"
                value={formData.sponsorSiret || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorSiret: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sponsor-representative" className="block text-sm font-medium text-gray-700">
                {t('partnershipRepresentative')}
              </label>
              <input
                id="sponsor-representative"
                type="text"
                value={formData.sponsorRepresentative || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorRepresentative: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="sponsor-legal-form" className="block text-sm font-medium text-gray-700">
                {t('partnershipLegalForm')}
              </label>
              <input
                id="sponsor-legal-form"
                type="text"
                value={formData.sponsorLegalForm || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorLegalForm: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="SAS, SARL, Association…"
              />
            </div>
          </div>
          <div>
            <label htmlFor="sponsor-contact-name" className="block text-sm font-medium text-gray-700">
              {t('formContact')}
            </label>
            <input
              id="sponsor-contact-name"
              type="text"
              value={formData.sponsorshipContactName || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, sponsorshipContactName: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sponsor-contact-email" className="block text-sm font-medium text-gray-700">
                {t('formEmail')}
              </label>
              <input
                id="sponsor-contact-email"
                type="email"
                value={formData.sponsorshipContactEmail || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorshipContactEmail: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sponsor-contact-phone" className="block text-sm font-medium text-gray-700">
                {t('formPhone')}
              </label>
              <input
                id="sponsor-contact-phone"
                type="tel"
                value={formData.sponsorshipContactPhone || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorshipContactPhone: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sponsor-contract-start" className="block text-sm font-medium text-gray-700">
                {t('formContractStart')}
              </label>
              <input
                id="sponsor-contract-start"
                type="date"
                value={formData.sponsorshipContractStart || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorshipContractStart: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sponsor-contract-end" className="block text-sm font-medium text-gray-700">
                {t('formContractEnd')}
              </label>
              <input
                id="sponsor-contract-end"
                type="date"
                value={formData.sponsorshipContractEnd || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, sponsorshipContractEnd: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {(formData.category === IncomeCategory.MECENAT || formData.category === IncomeCategory.DONS) && (
            <div>
              <label htmlFor="donation-form" className="block text-sm font-medium text-gray-700">
                {t('partnershipDonationForm')}
              </label>
              <select
                id="donation-form"
                value={formData.donationForm || 'numéraire'}
                onChange={(e) => setFormData((prev) => ({ ...prev, donationForm: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="numéraire">{t('partnershipDonationCash')}</option>
                <option value="nature">{t('partnershipDonationInKind')}</option>
                <option value="mise à disposition">{t('partnershipDonationLoan')}</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="partnership-counterparts" className="block text-sm font-medium text-gray-700">
              {t('partnershipCounterparts')}
            </label>
            <textarea
              id="partnership-counterparts"
              value={formData.partnershipCounterparts || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, partnershipCounterparts: e.target.value }))}
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder={t('partnershipCounterpartsPlaceholder')}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="income-notes" className="block text-sm font-medium text-gray-700">
          {t('formNotes')}
        </label>
        <textarea
          id="income-notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('formCancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
        >
          {item ? t('formEdit') : t('formAdd')}
        </button>
      </div>
    </form>
  );
};

export default IncomeForm;
