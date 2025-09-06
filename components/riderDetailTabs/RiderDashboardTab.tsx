import React, { useState, useMemo } from 'react';
import { Rider, RaceEvent, RiderEventSelection, RiderEventStatus, RiderEventPreference, User, AppSection, PermissionLevel, TeamProduct } from '../../types';
import { RIDER_EVENT_STATUS_COLORS, RIDER_EVENT_PREFERENCE_COLORS } from '../../constants';
import ActionButton from '../ActionButton';
import UserCircleIcon from '../icons/UserCircleIcon';
import CalendarIcon from '../icons/CalendarIcon';
import ChartBarIcon from '../icons/ChartBarIcon';
import CogIcon from '../icons/CogIcon';
import HeartIcon from '../icons/HeartIcon';
import TrophyIcon from '../icons/TrophyIcon';
import WrenchScrewdriverIcon from '../icons/WrenchScrewdriverIcon';
import { getAgeCategory } from '../../utils/ageUtils';
import { getRiderCharacteristicSafe } from '../../utils/riderUtils';

interface RiderDashboardTabProps {
    formData: Rider | Omit<Rider, 'id'>;
    raceEvents: RaceEvent[];
    riderEventSelections: RiderEventSelection[];
    onUpdateRiderPreference?: (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => void;
    onUpdateGlobalPreferences?: (riderId: string, globalWishes: string, seasonObjectives: string) => void;
    currentUser?: User | null;
    effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
    teamProducts?: TeamProduct[];
}

const RiderDashboardTab: React.FC<RiderDashboardTabProps> = ({
    formData,
    raceEvents,
    riderEventSelections,
    onUpdateRiderPreference,
    onUpdateGlobalPreferences,
    currentUser,
    effectivePermissions,
    teamProducts = []
}) => {
    const riderId = (formData as Rider).id;
    const [activeSection, setActiveSection] = useState<'overview' | 'calendar' | 'performance' | 'nutrition' | 'equipment'>('overview');
    const [editingGlobalPrefs, setEditingGlobalPrefs] = useState(false);
    const [globalWishes, setGlobalWishes] = useState((formData as Rider).globalWishes || '');
    const [seasonObjectives, setSeasonObjectives] = useState((formData as Rider).seasonObjectives || '');

    // Vérification des permissions
    const canViewFinancialInfo = effectivePermissions?.financial?.includes('view') || false;
    const canViewDebriefing = currentUser?.userRole === 'COUREUR' ? 
        (currentUser.id === riderId) : 
        (effectivePermissions?.performance?.includes('view') || false);

    // Données calculées
    const { category: ageCategory } = getAgeCategory((formData as Rider).birthDate || '');
    
    const upcomingEvents = useMemo(() => {
        const futureEvents = raceEvents.filter(event => {
            const eventDate = new Date(event.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return eventDate >= today;
        });

        return futureEvents
            .filter(event => (event.selectedRiderIds || []).includes(riderId))
            .map(event => {
                const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
                return {
                    ...event,
                    status: selection?.status || RiderEventStatus.EN_ATTENTE,
                    riderPreference: selection?.riderPreference || RiderEventPreference.EN_ATTENTE,
                    riderObjectives: selection?.riderObjectives || '',
                    notes: selection?.notes || ''
                };
            })
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3); // Afficher seulement les 3 prochains événements
    }, [raceEvents, riderEventSelections, riderId]);

    const performanceStats = useMemo(() => {
        const stats = {
            generalPerformance: getRiderCharacteristicSafe(formData, 'generalPerformanceScore'),
            fatigueResistance: getRiderCharacteristicSafe(formData, 'fatigueResistanceScore'),
            sprint: getRiderCharacteristicSafe(formData, 'charSprint'),
            climbing: getRiderCharacteristicSafe(formData, 'charClimbing'),
            rouleur: getRiderCharacteristicSafe(formData, 'charRouleur'),
            puncher: getRiderCharacteristicSafe(formData, 'charPuncher'),
            anaerobic: getRiderCharacteristicSafe(formData, 'charAnaerobic')
        };
        return stats;
    }, [formData]);

    const nutritionSummary = useMemo(() => {
        const allergies = (formData as Rider).allergies || [];
        const performanceNutrition = (formData as Rider).performanceNutrition;
        return {
            allergiesCount: allergies.length,
            hasAllergies: allergies.length > 0,
            snackPreferences: (formData as Rider).snack1 || (formData as Rider).snack2 || (formData as Rider).snack3,
            assistantInstructions: (formData as Rider).assistantInstructions
        };
    }, [formData]);

    const equipmentSummary = useMemo(() => {
        const clothing = (formData as Rider).clothing || [];
        const roadBike = (formData as Rider).roadBikeSetup;
        const ttBike = (formData as Rider).ttBikeSetup;
        
        return {
            clothingItems: clothing.length,
            hasRoadBike: !!roadBike,
            hasTTBike: !!ttBike,
            totalValue: clothing.reduce((sum, item) => sum + (item.unitCost || 0) * (item.quantity || 1), 0)
        };
    }, [formData]);

    const handleGlobalPreferencesSave = () => {
        if (onUpdateGlobalPreferences) {
            onUpdateGlobalPreferences(riderId, globalWishes, seasonObjectives);
        }
        setEditingGlobalPrefs(false);
    };

    const renderOverviewSection = () => (
        <div className="space-y-6">
            {/* Profil rapide */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-lg text-white">
                <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                        {(formData as Rider).photoUrl ? (
                            <img 
                                src={(formData as Rider).photoUrl} 
                                alt={`${formData.firstName} ${formData.lastName}`} 
                                className="w-16 h-16 rounded-full object-cover border-2 border-white/20" 
                            />
                        ) : (
                            <UserCircleIcon className="w-16 h-16 text-white/80" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold">{formData.firstName} {formData.lastName}</h2>
                        <p className="text-blue-100">
                            {ageCategory} • {(formData as Rider).disciplines?.[0] || 'Route'} • 
                            {(formData as Rider).teamName || 'Équipe'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                                (formData as Rider).forme === 'EXCELLENTE' ? 'bg-green-500' :
                                (formData as Rider).forme === 'BONNE' ? 'bg-blue-500' :
                                (formData as Rider).forme === 'MOYENNE' ? 'bg-yellow-500' :
                                'bg-red-500'
                            }`}>
                                Forme: {(formData as Rider).forme || 'N/A'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                                (formData as Rider).moral === 'EXCELLENT' ? 'bg-green-500' :
                                (formData as Rider).moral === 'BON' ? 'bg-blue-500' :
                                (formData as Rider).moral === 'MOYEN' ? 'bg-yellow-500' :
                                'bg-red-500'
                            }`}>
                                Moral: {(formData as Rider).moral || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistiques de performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <ChartBarIcon className="w-8 h-8 text-blue-500" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Performance Générale</p>
                            <p className="text-2xl font-bold text-gray-900">{performanceStats.generalPerformance}/100</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <TrophyIcon className="w-8 h-8 text-yellow-500" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Résistance</p>
                            <p className="text-2xl font-bold text-gray-900">{performanceStats.fatigueResistance}/100</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <HeartIcon className="w-8 h-8 text-red-500" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Sprint</p>
                            <p className="text-2xl font-bold text-gray-900">{performanceStats.sprint}/100</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <WrenchScrewdriverIcon className="w-8 h-8 text-green-500" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Grimpeur</p>
                            <p className="text-2xl font-bold text-gray-900">{performanceStats.climbing}/100</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Prochains événements */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Prochains Événements</h3>
                    <button
                        onClick={() => setActiveSection('calendar')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Voir tout le calendrier
                    </button>
                </div>
                {upcomingEvents.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucun événement à venir</p>
                ) : (
                    <div className="space-y-3">
                        {upcomingEvents.map(event => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-gray-900">{event.name}</h4>
                                    <p className="text-sm text-gray-500">
                                        {new Date(event.date + "T12:00:00Z").toLocaleDateString('fr-FR', { 
                                            day: 'numeric', 
                                            month: 'short',
                                            year: 'numeric'
                                        })} - {event.location}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-gray-200'}`}>
                                    {event.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Souhaits et objectifs de saison */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Mes Objectifs de Saison</h3>
                    <button
                        onClick={() => setEditingGlobalPrefs(!editingGlobalPrefs)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        {editingGlobalPrefs ? 'Annuler' : 'Modifier'}
                    </button>
                </div>
                
                {editingGlobalPrefs ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mes souhaits pour la saison :
                            </label>
                            <textarea
                                value={globalWishes}
                                onChange={(e) => setGlobalWishes(e.target.value)}
                                placeholder="Exprimez vos souhaits généraux pour la saison..."
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mes objectifs de saison :
                            </label>
                            <textarea
                                value={seasonObjectives}
                                onChange={(e) => setSeasonObjectives(e.target.value)}
                                placeholder="Définissez vos objectifs principaux pour la saison"
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2">
                            <ActionButton onClick={handleGlobalPreferencesSave}>
                                Sauvegarder
                            </ActionButton>
                            <ActionButton 
                                onClick={() => {
                                    setEditingGlobalPrefs(false);
                                    setGlobalWishes((formData as Rider).globalWishes || '');
                                    setSeasonObjectives((formData as Rider).seasonObjectives || '');
                                }}
                                variant="secondary"
                            >
                                Annuler
                            </ActionButton>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <h4 className="text-sm font-medium text-gray-700">Souhaits de saison :</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                {globalWishes || "Aucun souhait défini"}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-700">Objectifs de saison :</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                {seasonObjectives || "Aucun objectif défini"}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCalendarSection = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendrier Prévisionnel</h3>
                <p className="text-gray-600 mb-4">
                    Consultez tous les événements de l'équipe et exprimez vos préférences.
                </p>
                
                {raceEvents.filter(event => {
                    const eventDate = new Date(event.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return eventDate >= today;
                }).length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucun événement à venir</p>
                ) : (
                    <div className="space-y-3">
                        {raceEvents
                            .filter(event => {
                                const eventDate = new Date(event.date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return eventDate >= today;
                            })
                            .map(event => {
                                const isSelected = (event.selectedRiderIds || []).includes(riderId);
                                const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
                                
                                return (
                                    <div key={event.id} className={`p-4 rounded-lg border ${
                                        isSelected 
                                            ? 'bg-blue-50 border-blue-200' 
                                            : 'bg-gray-50 border-gray-200'
                                    }`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{event.name}</h4>
                                                <p className="text-sm text-gray-600">
                                                    {new Date(event.date + "T12:00:00Z").toLocaleDateString('fr-FR', { 
                                                        weekday: 'long', 
                                                        day: 'numeric', 
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })} - {event.location}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                isSelected 
                                                    ? RIDER_EVENT_STATUS_COLORS[selection?.status || 'EN_ATTENTE'] || 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {isSelected ? (selection?.status || 'EN_ATTENTE') : 'Non sélectionné'}
                                            </span>
                                        </div>

                                        {isSelected && onUpdateRiderPreference && (
                                            <div className="mt-3">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Ma préférence pour cet événement :
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.values(RiderEventPreference).map(preference => (
                                                        <button
                                                            key={preference}
                                                            onClick={() => onUpdateRiderPreference(event.id, riderId, preference)}
                                                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                                                selection?.riderPreference === preference
                                                                    ? RIDER_EVENT_PREFERENCE_COLORS[preference]
                                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                            }`}
                                                        >
                                                            {preference}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>
        </div>
    );

    const renderPerformanceSection = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profil de Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium text-gray-700 mb-3">Caractéristiques Principales</h4>
                        <div className="space-y-2">
                            {[
                                { label: 'Sprint', value: performanceStats.sprint },
                                { label: 'Grimpeur', value: performanceStats.climbing },
                                { label: 'Rouleur', value: performanceStats.rouleur },
                                { label: 'Puncher', value: performanceStats.puncher },
                                { label: 'Anaérobie', value: performanceStats.anaerobic }
                            ].map(stat => (
                                <div key={stat.label} className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{stat.label}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-500 h-2 rounded-full" 
                                                style={{ width: `${stat.value}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 w-8">{stat.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-700 mb-3">Scores Globaux</h4>
                        <div className="space-y-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-600">Performance Générale</p>
                                <p className="text-3xl font-bold text-blue-600">{performanceStats.generalPerformance}/100</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-gray-600">Résistance à la Fatigue</p>
                                <p className="text-3xl font-bold text-green-600">{performanceStats.fatigueResistance}/100</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNutritionSection = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé Nutrition</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium text-gray-700 mb-3">Allergies et Restrictions</h4>
                        {nutritionSummary.hasAllergies ? (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-600">
                                    {nutritionSummary.allergiesCount} allergie(s) déclarée(s)
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {(formData as Rider).allergies?.map((allergy, index) => (
                                        <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                            {allergy.allergen}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Aucune allergie déclarée</p>
                        )}
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-700 mb-3">Préférences</h4>
                        {nutritionSummary.snackPreferences ? (
                            <p className="text-sm text-gray-600">
                                Collations préférées : {nutritionSummary.snackPreferences}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500">Aucune préférence définie</p>
                        )}
                        {nutritionSummary.assistantInstructions && (
                            <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700">Instructions pour assistants :</p>
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    {nutritionSummary.assistantInstructions}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEquipmentSection = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé Équipement</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Articles de Dotation</p>
                        <p className="text-2xl font-bold text-blue-600">{equipmentSummary.clothingItems}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Vélos Configurés</p>
                        <p className="text-2xl font-bold text-green-600">
                            {(equipmentSummary.hasRoadBike ? 1 : 0) + (equipmentSummary.hasTTBike ? 1 : 0)}/2
                        </p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Valeur Totale</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {equipmentSummary.totalValue.toFixed(0)}€
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const sections = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: UserCircleIcon },
        { id: 'calendar', label: 'Calendrier', icon: CalendarIcon },
        { id: 'performance', label: 'Performance', icon: ChartBarIcon },
        { id: 'nutrition', label: 'Nutrition', icon: HeartIcon },
        { id: 'equipment', label: 'Équipement', icon: WrenchScrewdriverIcon }
    ];

    return (
        <div className="space-y-6">
            {/* Navigation */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex flex-wrap gap-2">
                    {sections.map(section => {
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id as any)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeSection === section.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{section.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Contenu de la section active */}
            {activeSection === 'overview' && renderOverviewSection()}
            {activeSection === 'calendar' && renderCalendarSection()}
            {activeSection === 'performance' && renderPerformanceSection()}
            {activeSection === 'nutrition' && renderNutritionSection()}
            {activeSection === 'equipment' && renderEquipmentSection()}
        </div>
    );
};

export default RiderDashboardTab;
