

import React, { useState, useMemo } from 'react';
import { Rider, RaceEvent, RiderEventSelection, RiderEventStatus, RiderEventPreference, User, AppSection, PermissionLevel } from '../../types';
import { RIDER_EVENT_STATUS_COLORS, RIDER_EVENT_PREFERENCE_COLORS } from '../../constants';

interface CalendarTabProps {
    formData: Rider | Omit<Rider, 'id'>;
    raceEvents: RaceEvent[];
    riderEventSelections: RiderEventSelection[];
    onUpdateRiderPreference?: (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => void;
    onUpdateGlobalPreferences?: (riderId: string, globalWishes: string, seasonObjectives: string) => void;
    currentUser?: User | null;
    effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
}

const CalendarTab: React.FC<CalendarTabProps> = ({
    formData,
    raceEvents,
    riderEventSelections,
    onUpdateRiderPreference,
    onUpdateGlobalPreferences,
    currentUser,
    effectivePermissions
}) => {
    const riderId = (formData as Rider).id;
    const [editingEvent, setEditingEvent] = useState<string | null>(null);
    const [tempObjectives, setTempObjectives] = useState<string>('');
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [showAllEvents, setShowAllEvents] = useState(true);
    const [editingGlobalPrefs, setEditingGlobalPrefs] = useState(false);
    const [globalWishes, setGlobalWishes] = useState((formData as Rider).globalWishes || '');
    const [seasonObjectives, setSeasonObjectives] = useState((formData as Rider).seasonObjectives || '');

    // Vérification des permissions
    const canViewFinancialInfo = effectivePermissions?.financial?.includes('view') || false;
    const canViewDebriefing = currentUser?.userRole === 'COUREUR' ? 
        (currentUser.id === riderId) : 
        (effectivePermissions?.performance?.includes('view') || false);

    // Check if riderId exists. If not (e.g., adding new rider), show a message.
    if (!riderId) {
        return <p className="italic text-slate-400">Le calendrier sera disponible une fois le coureur sauvegardé.</p>;
    }

    // Filtrer les événements futurs uniquement
    const futureEvents = raceEvents.filter(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    });

    // Événements où le coureur est sélectionné
    const eventsForRider = futureEvents
        .filter(event => (event.selectedRiderIds || []).includes(riderId))
        .map(event => {
            const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
            return {
                ...event,
                status: selection?.status || RiderEventStatus.EN_ATTENTE,
                riderPreference: selection?.riderPreference || RiderEventPreference.EN_ATTENTE,
                riderObjectives: selection?.riderObjectives || '',
                notes: selection?.notes || '',
                isSelected: true
            };
        })
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Tous les événements de l'équipe (si showAllEvents est activé)
    const allTeamEvents = useMemo(() => {
        if (!showAllEvents) return eventsForRider;
        
        return futureEvents.map(event => {
            const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
            const isSelected = (event.selectedRiderIds || []).includes(riderId);
            return {
                ...event,
                status: selection?.status || (isSelected ? RiderEventStatus.EN_ATTENTE : RiderEventStatus.NON_SELECTIONNE),
                riderPreference: selection?.riderPreference || RiderEventPreference.EN_ATTENTE,
                riderObjectives: selection?.riderObjectives || '',
                notes: selection?.notes || '',
                isSelected
            };
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [futureEvents, riderEventSelections, riderId, showAllEvents]);

    // Grouper les événements par mois pour la vue calendrier
    const eventsByMonth = useMemo(() => {
        const grouped: { [key: string]: typeof allTeamEvents } = {};
        allTeamEvents.forEach(event => {
            const monthKey = new Date(event.date).toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: 'long' 
            });
            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            grouped[monthKey].push(event);
        });
        return grouped;
    }, [allTeamEvents]);

    const handlePreferenceChange = (eventId: string, preference: RiderEventPreference) => {
        if (onUpdateRiderPreference) {
            onUpdateRiderPreference(eventId, riderId, preference, tempObjectives);
        }
        setEditingEvent(null);
        setTempObjectives('');
    };

    const startEditing = (eventId: string, currentObjectives: string) => {
        setEditingEvent(eventId);
        setTempObjectives(currentObjectives);
    };

    const handleGlobalPreferencesSave = () => {
        if (onUpdateGlobalPreferences) {
            onUpdateGlobalPreferences(riderId, globalWishes, seasonObjectives);
        }
        setEditingGlobalPrefs(false);
    };

    const renderCalendarView = () => {
        return (
            <div className="max-h-screen overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="space-y-6">
                    {Object.entries(eventsByMonth).map(([month, events]) => (
                    <div key={month} className="bg-slate-800 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-200 mb-4">{month}</h4>
                        <div className="max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {events.map(event => (
                                <div key={event.id} className={`p-3 rounded-lg border ${
                                    event.isSelected 
                                        ? 'bg-slate-700 border-slate-600' 
                                        : 'bg-slate-600 border-slate-500 opacity-75'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-medium text-slate-200 text-sm">{event.name}</h5>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            event.isSelected 
                                                ? RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-slate-500'
                                                : 'bg-slate-500 text-slate-300'
                                        }`}>
                                            {event.isSelected ? event.status : 'Non sélectionné'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2">
                                        {new Date(event.date + "T12:00:00Z").toLocaleDateString('fr-FR', { 
                                            day: 'numeric', 
                                            month: 'short',
                                            year: 'numeric'
                                        })} - {event.location}
                                    </p>
                                    {event.isSelected && (
                                        <div className="mt-2">
                                            <div className="flex flex-wrap gap-1">
                                                {Object.values(RiderEventPreference).map(preference => (
                                                    <button
                                                        key={preference}
                                                        onClick={() => handlePreferenceChange(event.id, preference)}
                                                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                                                            event.riderPreference === preference
                                                                ? RIDER_EVENT_PREFERENCE_COLORS[preference]
                                                                : 'bg-slate-500 text-slate-300 hover:bg-slate-400'
                                                        }`}
                                                    >
                                                        {preference}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        );
    };

    const renderListView = () => {
        return (
            <div className="max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="space-y-3">
                    {allTeamEvents.map(event => (
                    <div key={event.id} className={`p-4 rounded-lg border ${
                        event.isSelected 
                            ? 'bg-slate-700 border-slate-600' 
                            : 'bg-slate-600 border-slate-500 opacity-75'
                    }`}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-semibold text-slate-200">{event.name}</h4>
                                <p className="text-sm text-slate-400">
                                    {new Date(event.date + "T12:00:00Z").toLocaleDateString('fr-FR', { 
                                        weekday: 'long', 
                                        day: 'numeric', 
                                        month: 'long',
                                        year: 'numeric'
                                    })} - {event.location}
                                </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                                event.isSelected 
                                    ? RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-slate-500'
                                    : 'bg-slate-500 text-slate-300'
                            }`}>
                                {event.isSelected ? event.status : 'Non sélectionné'}
                            </span>
                        </div>

                        {event.isSelected && (
                            <>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Ma préférence pour cet événement :
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.values(RiderEventPreference).map(preference => (
                                            <button
                                                key={preference}
                                                onClick={() => handlePreferenceChange(event.id, preference)}
                                                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                                    event.riderPreference === preference
                                                        ? RIDER_EVENT_PREFERENCE_COLORS[preference]
                                                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                                }`}
                                            >
                                                {preference}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {event.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES && (
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Mes objectifs pour cet événement :
                                        </label>
                                        {editingEvent === event.id ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={tempObjectives}
                                                    onChange={(e) => setTempObjectives(e.target.value)}
                                                    placeholder="Décrivez vos objectifs spécifiques..."
                                                    className="w-full p-2 bg-slate-600 text-slate-200 rounded border border-slate-500 focus:border-blue-400 focus:outline-none"
                                                    rows={3}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handlePreferenceChange(event.id, RiderEventPreference.OBJECTIFS_SPECIFIQUES)}
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                    >
                                                        Sauvegarder
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingEvent(null);
                                                            setTempObjectives('');
                                                        }}
                                                        className="px-3 py-1 bg-slate-600 text-slate-300 text-xs rounded hover:bg-slate-500"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm text-slate-300 bg-slate-600 p-2 rounded">
                                                    {event.riderObjectives || "Aucun objectif défini"}
                                                </p>
                                                <button
                                                    onClick={() => startEditing(event.id, event.riderObjectives)}
                                                    className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    {event.riderObjectives ? 'Modifier' : 'Ajouter des objectifs'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {event.notes && canViewDebriefing && (
                                    <div className="mt-3 pt-3 border-t border-slate-600">
                                        <p className="text-xs text-slate-500">
                                            <span className="font-medium">Notes du staff :</span> {event.notes}
                                        </p>
                                    </div>
                                )}

                                {event.notes && !canViewDebriefing && (
                                    <div className="mt-3 pt-3 border-t border-slate-600">
                                        <p className="text-xs text-slate-500 italic">
                                            <span className="font-medium">Notes du staff :</span> Accès restreint
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Section des souhaits et objectifs globaux */}
            <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-200">Mes Souhaits et Objectifs de Saison</h3>
                    <button
                        onClick={() => setEditingGlobalPrefs(!editingGlobalPrefs)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                        {editingGlobalPrefs ? 'Annuler' : 'Modifier'}
                    </button>
                </div>
                
                {editingGlobalPrefs ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Mes souhaits pour la saison :
                            </label>
                            <textarea
                                value={globalWishes}
                                onChange={(e) => setGlobalWishes(e.target.value)}
                                placeholder="Exprimez vos souhaits généraux pour la saison (types de courses, objectifs, etc.)"
                                className="w-full p-3 bg-slate-600 text-slate-200 rounded border border-slate-500 focus:border-blue-400 focus:outline-none"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Mes objectifs de saison :
                            </label>
                            <textarea
                                value={seasonObjectives}
                                onChange={(e) => setSeasonObjectives(e.target.value)}
                                placeholder="Définissez vos objectifs principaux pour la saison"
                                className="w-full p-3 bg-slate-600 text-slate-200 rounded border border-slate-500 focus:border-blue-400 focus:outline-none"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleGlobalPreferencesSave}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                                Sauvegarder
                            </button>
                            <button
                                onClick={() => {
                                    setEditingGlobalPrefs(false);
                                    setGlobalWishes((formData as Rider).globalWishes || '');
                                    setSeasonObjectives((formData as Rider).seasonObjectives || '');
                                }}
                                className="px-4 py-2 bg-slate-600 text-slate-300 text-sm rounded hover:bg-slate-500"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-1">Souhaits de saison :</h4>
                            <p className="text-sm text-slate-400 bg-slate-700 p-3 rounded">
                                {globalWishes || "Aucun souhait défini"}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-1">Objectifs de saison :</h4>
                            <p className="text-sm text-slate-400 bg-slate-700 p-3 rounded">
                                {seasonObjectives || "Aucun objectif défini"}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Section du calendrier */}
            <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">Calendrier Prévisionnel d'Équipe</h3>
                        <p className="text-sm text-slate-400">
                            Consultez tous les événements de l'équipe et exprimez vos préférences pour ceux où vous êtes sélectionné.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="show-all-events"
                                checked={showAllEvents}
                                onChange={(e) => setShowAllEvents(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="show-all-events" className="text-sm text-slate-300">
                                Afficher tous les événements
                            </label>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`px-3 py-1 text-sm rounded ${
                                    viewMode === 'calendar'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                }`}
                            >
                                Calendrier
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1 text-sm rounded ${
                                    viewMode === 'list'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                }`}
                            >
                                Liste
                            </button>
                        </div>
                    </div>
                </div>

                {allTeamEvents.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="italic text-slate-400">Aucun événement à venir pour le moment.</p>
                        <p className="text-xs text-slate-500 mt-2">
                            {showAllEvents 
                                ? "Les événements de l'équipe apparaîtront ici une fois ajoutés."
                                : "Les événements apparaîtront ici une fois que vous serez sélectionné."
                            }
                        </p>
                    </div>
                ) : (
                    viewMode === 'calendar' ? renderCalendarView() : renderListView()
                )}
            </div>
        </div>
    );
};

export default CalendarTab;