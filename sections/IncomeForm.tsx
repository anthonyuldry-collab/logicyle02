import React, { useState } from 'react';
import { IncomeItem, IncomeCategory } from '../types';

interface IncomeFormProps {
    item?: IncomeItem | null;
    onSave: (item: IncomeItem) => void;
    onCancel: () => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Omit<IncomeItem, 'id'>>({
        description: item?.description || '',
        amount: item?.amount || 0,
        date: item?.date || new Date().toISOString().split('T')[0],
        category: item?.category || IncomeCategory.SPONSORING,
        notes: item?.notes || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const incomeItem: IncomeItem = {
            id: item?.id || Date.now().toString(),
            ...formData
        };
        onSave(incomeItem);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Montant (€)</label>
                <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as IncomeCategory }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    {Object.values(IncomeCategory).map(category => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
                    Annuler
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                    {item ? 'Modifier' : 'Ajouter'}
                </button>
            </div>
        </form>
    );
};

export default IncomeForm;
