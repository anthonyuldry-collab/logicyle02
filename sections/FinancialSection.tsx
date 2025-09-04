import React, { useState, useMemo } from 'react';
import { 
    IncomeItem, BudgetItemCategory, IncomeCategory, 
    EventBudgetItem, RaceEvent 
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import { useTranslations } from '../hooks/useTranslations';
import { 
    PlusCircleIcon, PencilIcon, TrashIcon, 
    TrendingUpIcon, TrendingDownIcon, CurrencyEuroIcon,
    UsersIcon
} from '../components/icons';
import IncomeForm from './IncomeForm';
import BudgetForm from './BudgetForm';

interface FinancialSectionProps {
  incomeItems: IncomeItem[];
  budgetItems: EventBudgetItem[];
  onSaveIncomeItem: (item: IncomeItem) => Promise<void>;
  onDeleteIncomeItem: (item: IncomeItem) => Promise<void>;
  onSaveBudgetItem: (item: EventBudgetItem) => Promise<void>;
  onDeleteBudgetItem: (item: EventBudgetItem) => Promise<void>;
  effectivePermissions: Record<string, string[]>;
  raceEvents?: RaceEvent[];
}

export const FinancialSection: React.FC<FinancialSectionProps> = ({ 
    incomeItems, 
    budgetItems, 
    onSaveIncomeItem, 
    onDeleteIncomeItem, 
    onSaveBudgetItem, 
    onDeleteBudgetItem, 
    effectivePermissions,
    raceEvents 
}) => {
    const { t } = useTranslations();
    const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'contracts' | 'sponsors'>('overview');
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [editingIncomeItem, setEditingIncomeItem] = useState<IncomeItem | null>(null);
    const [editingBudgetItem, setEditingBudgetItem] = useState<EventBudgetItem | null>(null);

    // Protection contre les données non initialisées
    if (!incomeItems || !budgetItems) {
        return (
            <SectionWrapper title="Pilotage Financier">
                <div className="text-center p-8 bg-gray-50 rounded-lg border">
                    <h3 className="text-xl font-semibold text-gray-700">Chargement...</h3>
                    <p className="mt-2 text-gray-500">Initialisation des données financières...</p>
                </div>
            </SectionWrapper>
        );
    }

    // Calculs sécurisés avec vérification des types
    const totalIncome = useMemo(() => {
        return incomeItems.reduce((sum, item) => {
            if (typeof item.amount === 'number' && !isNaN(item.amount)) {
                return sum + item.amount;
            }
            return sum;
        }, 0);
    }, [incomeItems]);

    const totalExpenses = useMemo(() => {
        return budgetItems.reduce((sum, item) => {
            const cost = item.actualCost ?? item.estimatedCost;
            if (typeof cost === 'number' && !isNaN(cost)) {
                return sum + cost;
            }
            return sum;
        }, 0);
    }, [budgetItems]);

    const balance = totalIncome - totalExpenses;

    // Calculs par catégorie avec vérification des types
    const incomeByCategory = useMemo(() => {
        const categories: Record<string, number> = {};
        incomeItems.forEach(item => {
            if (item.category && typeof item.amount === 'number' && !isNaN(item.amount)) {
                categories[item.category] = (categories[item.category] || 0) + item.amount;
            }
        });
        return categories;
    }, [incomeItems]);

    const expensesByCategory = useMemo(() => {
        const categories: Record<string, number> = {};
        budgetItems.forEach(item => {
            if (item.category) {
                const cost = item.actualCost ?? item.estimatedCost;
                if (typeof cost === 'number' && !isNaN(cost)) {
                    categories[item.category] = (categories[item.category] || 0) + cost;
                }
            }
        });
        return categories;
    }, [budgetItems]);

    // Gestion sécurisée des revenus
    const handleSaveIncomeItem = async (item: IncomeItem) => {
        try {
            if (!item.description || typeof item.amount !== 'number' || isNaN(item.amount)) {
                alert('Veuillez remplir tous les champs obligatoires avec des valeurs valides');
                return;
            }
            await onSaveIncomeItem(item);
            setIsIncomeModalOpen(false);
            setEditingIncomeItem(null);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du revenu:', error);
            alert('Erreur lors de la sauvegarde du revenu');
        }
    };

    const handleDeleteIncomeItem = async (itemId: string) => {
        try {
            const item = incomeItems.find(i => i.id === itemId);
            if (item && window.confirm(`Êtes-vous sûr de vouloir supprimer le revenu "${item.description}" ?`)) {
                await onDeleteIncomeItem(item);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du revenu:', error);
            alert('Erreur lors de la suppression du revenu');
        }
    };

    // Gestion sécurisée des dépenses
    const handleSaveBudgetItem = async (item: EventBudgetItem) => {
        try {
            if (!item.description || typeof item.estimatedCost !== 'number' || isNaN(item.estimatedCost)) {
                alert('Veuillez remplir tous les champs obligatoires avec des valeurs valides');
                return;
            }
            await onSaveBudgetItem(item);
            setIsBudgetModalOpen(false);
            setEditingBudgetItem(null);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la dépense:', error);
            alert('Erreur lors de la sauvegarde de la dépense');
        }
    };

    const handleDeleteBudgetItem = async (itemId: string) => {
        try {
            const item = budgetItems.find(i => i.id === itemId);
            if (item && window.confirm(`Êtes-vous sûr de vouloir supprimer la dépense "${item.description}" ?`)) {
                await onDeleteBudgetItem(item);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de la dépense:', error);
            alert('Erreur lors de la suppression de la dépense');
        }
    };

    // Fonction sécurisée pour obtenir le nom de l'événement
    const getEventName = (eventId: string): string => {
        if (!raceEvents) return 'Inconnu';
        const event = raceEvents.find(e => e.id === eventId);
        return event ? event.name : 'Inconnu';
    };

    // Fonction sécurisée pour formater les dates
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Date invalide';
            return date.toLocaleDateString('fr-FR');
        } catch {
            return 'Date invalide';
        }
    };

    return (
        <SectionWrapper title="Pilotage Financier">
            {/* Onglets de navigation */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'overview', label: 'Vue d\'ensemble' },
                        { id: 'income', label: 'Revenus' },
                        { id: 'expenses', label: 'Dépenses' },
                        { id: 'contracts', label: 'Contrats' },
                        { id: 'sponsors', label: 'Sponsors & Subventions' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenu des onglets */}
            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Cartes de résumé */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <TrendingUpIcon className="h-8 w-8 text-green-600" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-green-600 truncate">Total Revenus</dt>
                                            <dd className="text-3xl font-bold text-green-900">{totalIncome.toLocaleString('fr-FR')} €</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <TrendingDownIcon className="h-8 w-8 text-red-600" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-red-600 truncate">Total Dépenses</dt>
                                            <dd className="text-3xl font-bold text-red-900">{totalExpenses.toLocaleString('fr-FR')} €</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className={`border rounded-lg p-6 ${balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <CurrencyEuroIcon className={`h-8 w-8 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className={`text-sm font-medium ${balance >= 0 ? 'text-blue-600' : 'text-red-600'} truncate`}>Solde</dt>
                                            <dd className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                                                {balance.toLocaleString('fr-FR')} €
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Graphiques des revenus par catégorie */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition des Revenus par Catégorie</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(incomeByCategory).map(([category, amount]) => (
                                    <div key={category} className="text-center">
                                        <div className="text-2xl font-bold text-green-600">{amount.toLocaleString('fr-FR')} €</div>
                                        <div className="text-sm text-gray-500">{category}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Graphiques des dépenses par catégorie */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition des Dépenses par Catégorie</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(expensesByCategory).map(([category, amount]) => (
                                    <div key={category} className="text-center">
                                        <div className="text-2xl font-bold text-red-600">{amount.toLocaleString('fr-FR')} €</div>
                                        <div className="text-sm text-gray-500">{category}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'income' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Gestion des Revenus</h3>
                            <ActionButton onClick={() => setIsIncomeModalOpen(true)} icon={<PlusCircleIcon className="w-5 h-5" />}>
                                Ajouter un revenu
                            </ActionButton>
                        </div>
                        
                        {incomeItems.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg border">
                                <p className="text-gray-500">Aucun revenu enregistré pour le moment.</p>
                            </div>
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {incomeItems.map((item) => (
                                        <li key={item.id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                            <CurrencyEuroIcon className="h-6 w-6 text-green-600" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{item.description}</div>
                                                        <div className="text-sm text-gray-500">{item.category} • {formatDate(item.date)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-lg font-semibold text-green-600">{item.amount.toLocaleString('fr-FR')} €</span>
                                                    <button
                                                        onClick={() => {
                                                            setEditingIncomeItem(item);
                                                            setIsIncomeModalOpen(true);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600"
                                                        title="Modifier"
                                                    >
                                                        <PencilIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteIncomeItem(item.id)}
                                                        className="text-gray-400 hover:text-red-600"
                                                        title="Supprimer"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Gestion des Dépenses</h3>
                            <ActionButton onClick={() => setIsBudgetModalOpen(true)} icon={<PlusCircleIcon className="w-5 h-5" />}>
                                Ajouter une dépense
                            </ActionButton>
                        </div>
                        
                        {budgetItems.length === 0 ? (
                            <div className="text-center p-8 bg-gray-50 rounded-lg border">
                                <p className="text-gray-500">Aucune dépense enregistrée pour le moment.</p>
                            </div>
                        ) : (
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {budgetItems.map((item) => (
                                        <li key={item.id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                                            <TrendingDownIcon className="h-6 w-6 text-red-600" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{item.description}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {item.category} • {item.eventId ? `Événement: ${getEventName(item.eventId)}` : 'Général'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <div className="text-right">
                                                        <div className="text-lg font-semibold text-red-600">
                                                            {item.actualCost ? item.actualCost.toLocaleString('fr-FR') : item.estimatedCost.toLocaleString('fr-FR')} €
                                                        </div>
                                                        {item.actualCost && (
                                                            <div className="text-sm text-gray-500">
                                                                Estimé: {item.estimatedCost.toLocaleString('fr-FR')} €
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setEditingBudgetItem(item);
                                                            setIsBudgetModalOpen(true);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600"
                                                        title="Modifier"
                                                    >
                                                        <PencilIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBudgetItem(item.id)}
                                                        className="text-gray-400 hover:text-red-600"
                                                        title="Supprimer"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'contracts' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Gestion des Contrats</h3>
                        <p className="text-gray-500">Cette section permettra de gérer les contrats avec les sponsors, fournisseurs et partenaires.</p>
                        <div className="mt-4">
                            <ActionButton icon={<PlusCircleIcon className="w-5 h-5" />}>
                                Nouveau contrat
                            </ActionButton>
                        </div>
                    </div>
                )}

                {activeTab === 'sponsors' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Sponsors & Subventions</h3>
                        <p className="text-gray-500">Cette section permettra de gérer les partenariats sponsor et les demandes de subventions.</p>
                        <div className="mt-4">
                            <ActionButton icon={<PlusCircleIcon className="w-5 h-5" />}>
                                Nouveau sponsor
                            </ActionButton>
                    </div>
                </div>
                )}
            </div>

            {/* Modals */}
            <Modal 
                isOpen={isIncomeModalOpen} 
                onClose={() => {
                    setIsIncomeModalOpen(false);
                    setEditingIncomeItem(null);
                }} 
                title={editingIncomeItem ? "Modifier le revenu" : "Ajouter un revenu"}
            >
                <IncomeForm 
                    item={editingIncomeItem}
                    onSave={handleSaveIncomeItem}
                    onCancel={() => {
                        setIsIncomeModalOpen(false);
                        setEditingIncomeItem(null);
                    }}
                />
            </Modal>

            <Modal 
                isOpen={isBudgetModalOpen} 
                onClose={() => {
                    setIsBudgetModalOpen(false);
                    setEditingBudgetItem(null);
                }} 
                title={editingBudgetItem ? "Modifier la dépense" : "Ajouter une dépense"}
            >
                <BudgetForm 
                    item={editingBudgetItem}
                    raceEvents={raceEvents}
                    onSave={handleSaveBudgetItem}
                    onCancel={() => {
                        setIsBudgetModalOpen(false);
                        setEditingBudgetItem(null);
                    }}
                />
            </Modal>
        </SectionWrapper>
    );
};
