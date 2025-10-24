

import React, { useState, useMemo } from 'react';
import { Rider, RaceEvent, RiderEventSelection, RiderEventStatus, RiderEventPreference, User, AppSection, PermissionLevel } from '../../types';
import { RIDER_EVENT_STATUS_COLORS, RIDER_EVENT_PREFERENCE_COLORS } from '../../constants';
import { isFutureEvent, getAvailableYears, filterEventsByYear, formatEventDate, formatEventDateRange, isPlanningYear } from '../../utils/dateUtils';
import { getCurrentSeasonYear, getPlanningYears, getSeasonLabel, getSeasonTransitionStatus } from '../../utils/seasonUtils';
import SeasonTransitionIndicator from '../SeasonTransitionIndicator';

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
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'table'>('monthly');
    const [showAllEvents, setShowAllEvents] = useState(true);
    const [editingGlobalPrefs, setEditingGlobalPrefs] = useState(false);
    const [globalWishes, setGlobalWishes] = useState((formData as Rider).globalWishes || '');
    const [seasonObjectives, setSeasonObjectives] = useState((formData as Rider).seasonObjectives || '');
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [sortColumn, setSortColumn] = useState<'name' | 'date' | 'location' | 'eventType' | 'status' | 'preference'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // Tri chronologique par défaut
    const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

    // Vérification des permissions
    const canViewFinancialInfo = effectivePermissions?.financial?.includes('view') || false;
    const canViewDebriefing = currentUser?.userRole === 'COUREUR' ? 
        (currentUser.id === riderId) : 
        (effectivePermissions?.performance?.includes('view') || false);

    // Check if riderId exists. If not (e.g., adding new rider), show a message.
    if (!riderId) {
        return <p className="italic text-slate-400">Le calendrier sera disponible une fois le coureur sauvegardé.</p>;
    }

    // Filtrer les événements futurs uniquement (incluant 2026 et années suivantes)
    const futureEvents = raceEvents.filter(event => isFutureEvent(event.date));

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
            const eventDate = new Date(event.date);
            const monthKey = eventDate.toLocaleDateString('fr-FR', { 
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

    // Grouper les événements par année pour la vue annuelle
    const eventsByYear = useMemo(() => {
        const grouped: { [year: number]: { [month: number]: typeof allTeamEvents } } = {};
        allTeamEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const year = eventDate.getFullYear();
            const month = eventDate.getMonth();
            
            if (!grouped[year]) {
                grouped[year] = {};
            }
            if (!grouped[year][month]) {
                grouped[year][month] = [];
            }
            grouped[year][month].push(event);
        });
        return grouped;
    }, [allTeamEvents]);

    // Fonction de tri pour les événements
    const sortEvents = (events: typeof allTeamEvents, column: string, direction: 'asc' | 'desc') => {
        return [...events].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (column) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'date':
                    aValue = new Date(a.date).getTime();
                    bValue = new Date(b.date).getTime();
                    break;
                case 'location':
                    aValue = a.location.toLowerCase();
                    bValue = b.location.toLowerCase();
                    break;
                case 'eventType':
                    aValue = a.eventType.toLowerCase();
                    bValue = b.eventType.toLowerCase();
                    break;
                case 'status':
                    aValue = a.status.toLowerCase();
                    bValue = b.status.toLowerCase();
                    break;
                case 'preference':
                    aValue = a.riderPreference.toLowerCase();
                    bValue = b.riderPreference.toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    // Filtrer les événements par année
    const getFilteredEvents = () => filterEventsByYear(allTeamEvents, yearFilter, event => event.date);

    // Événements triés pour la vue tableau
    const sortedEvents = useMemo(() => {
        const filteredEvents = getFilteredEvents();
        return sortEvents(filteredEvents, sortColumn, sortDirection);
    }, [allTeamEvents, sortColumn, sortDirection, yearFilter]);

    // Gestionnaire de clic pour trier
    const handleSort = (column: typeof sortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Obtenir toutes les années disponibles dans les événements
    const getAvailableYearsList = () => {
        const eventYears = getAvailableYears(allTeamEvents, event => event.date);
        const planningYears = getPlanningYears();
        
        // Combiner les années d'événements et de planification, en supprimant les doublons
        const allYears = [...new Set([...eventYears, ...planningYears])];
        return allYears.sort((a, b) => b - a); // Tri décroissant
    };

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

    const renderMonthlyView = () => {
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
                                        {formatEventDateRange(event, { 
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
                                    {formatEventDateRange(event, { 
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

    const renderYearlyView = () => {
        const months = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        
        const yearEvents = eventsByYear[currentYear] || {};
        
        return (
            <div className="max-h-screen overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {months.map((monthName, monthIndex) => {
                        const monthEvents = yearEvents[monthIndex] || [];
                        return (
                            <div key={monthIndex} className="bg-slate-800 p-4 rounded-lg">
                                <h4 className="text-lg font-semibold text-slate-200 mb-3">{monthName} {currentYear}</h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {monthEvents.length > 0 ? (
                                        monthEvents.map(event => (
                                            <div key={event.id} className={`p-2 rounded border text-sm ${
                                                event.isSelected 
                                                    ? 'bg-slate-700 border-slate-600' 
                                                    : 'bg-slate-600 border-slate-500 opacity-75'
                                            }`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-medium text-slate-200 text-xs truncate">{event.name}</span>
                                                    <span className={`px-1 py-0.5 text-xs rounded-full ${
                                                        event.isSelected 
                                                            ? RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-slate-500'
                                                            : 'bg-slate-500 text-slate-300'
                                                    }`}>
                                                        {event.isSelected ? event.status : 'Non sélectionné'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400">
                                                    {formatEventDateRange(event, { 
                                                        day: 'numeric', 
                                                        month: 'short'
                                                    })} - {event.location}
                                                </p>
                                                {event.isSelected && (
                                                    <div className="mt-1">
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                            RIDER_EVENT_PREFERENCE_COLORS[event.riderPreference] || 'bg-slate-500'
                                                        }`}>
                                                            {event.riderPreference}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-sm italic">Aucun événement</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTableView = () => {
        const getSortIcon = (column: typeof sortColumn) => {
            if (sortColumn !== column) {
                return (
                    <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                );
            }
            return sortDirection === 'asc' ? (
                <svg className="w-4 h-4 ml-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
            ) : (
                <svg className="w-4 h-4 ml-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
            );
        };

        return (
            <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="bg-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-700">
                            <tr>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600 select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center">
                                        Événement
                                        {getSortIcon('name')}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600 select-none"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center">
                                        Date
                                        {getSortIcon('date')}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600 select-none"
                                    onClick={() => handleSort('location')}
                                >
                                    <div className="flex items-center">
                                        Lieu
                                        {getSortIcon('location')}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600 select-none"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center">
                                        Statut
                                        {getSortIcon('status')}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600 select-none"
                                    onClick={() => handleSort('preference')}
                                >
                                    <div className="flex items-center">
                                        Préférence
                                        {getSortIcon('preference')}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {sortedEvents.map(event => (
                                <tr key={event.id} className={`${
                                    event.isSelected ? 'bg-slate-700' : 'bg-slate-600 opacity-75'
                                }`}>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-slate-200">{event.name}</div>
                                        <div className="text-xs text-slate-400">{event.eventType}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300">
                                        {formatEventDateRange(event, { 
                                            weekday: 'short',
                                            day: 'numeric', 
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300">{event.location}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            event.isSelected 
                                                ? RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-slate-500'
                                                : 'bg-slate-500 text-slate-300'
                                        }`}>
                                            {event.isSelected ? event.status : 'Non sélectionné'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {event.isSelected ? (
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
                                        ) : (
                                            <span className="text-slate-500 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {event.isSelected && event.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES && (
                                            <button
                                                onClick={() => startEditing(event.id, event.riderObjectives)}
                                                className="text-blue-400 hover:text-blue-300 text-xs"
                                            >
                                                {event.riderObjectives ? 'Modifier' : 'Ajouter'} objectifs
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200 mb-2">Calendrier Prévisionnel d'Équipe</h3>
                                <p className="text-sm text-slate-400">
                                    Consultez tous les événements de l'équipe et exprimez vos préférences pour ceux où vous êtes sélectionné.
                                </p>
                            </div>
                            <SeasonTransitionIndicator 
                                seasonYear={getCurrentSeasonYear()} 
                                showDetails={true}
                                className="ml-4"
                            />
                        </div>
                        {yearFilter === 2026 && (
                            <div className="mt-2 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                                <div className="flex items-center">
                                    <span className="text-blue-400 mr-2">📅</span>
                                    <p className="text-sm text-blue-200">
                                        <strong>Planification 2026 :</strong> Vous pouvez maintenant consulter et planifier vos événements pour l'année 2026. 
                                        Exprimez vos souhaits et objectifs pour optimiser votre calendrier prévisionnel.
                                    </p>
                                </div>
                            </div>
                        )}
                        {viewMode === 'table' && (
                            <p className="text-sm text-slate-500 mt-1">
                                {sortedEvents.length} événement{sortedEvents.length > 1 ? 's' : ''}
                                {yearFilter !== 'all' && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-blue-900 text-blue-200 rounded-full">
                                        📅 {yearFilter}
                                    </span>
                                )}
                            </p>
                        )}
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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setYearFilter(2026)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${
                                    yearFilter === 2026 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                }`}
                            >
                                📅 Planification 2026
                            </button>
                            <button
                                onClick={() => setYearFilter('all')}
                                className={`px-3 py-1 text-xs rounded transition-colors ${
                                    yearFilter === 'all' 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                }`}
                            >
                                Toutes les années
                            </button>
                        </div>
                        {viewMode === 'table' && (
                            <div className="flex items-center gap-2">
                                <label htmlFor="year-filter" className="text-sm text-slate-300">Année :</label>
                                <select
                                    id="year-filter"
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                    className="px-3 py-1 text-sm bg-slate-600 text-slate-200 border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">Toutes les années</option>
                                    {getAvailableYearsList().map(year => {
                                        const seasonStatus = getSeasonTransitionStatus(year);
                                        const isPlanning = isPlanningYear(year);
                                        const isCurrentSeason = year === getCurrentSeasonYear();
                                        
                                        return (
                                            <option key={year} value={year}>
                                                {getSeasonLabel(year)} {isPlanning ? '📅' : ''} {isCurrentSeason ? '⭐' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                {isPlanningYear(yearFilter as number) && (
                                    <span className="px-2 py-1 text-xs bg-blue-900 text-blue-200 rounded-full">
                                        📅 Planification 2026
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {viewMode === 'yearly' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentYear(currentYear - 1)}
                                        className="px-2 py-1 bg-slate-600 text-slate-300 text-sm rounded hover:bg-slate-500"
                                    >
                                        ←
                                    </button>
                                    <span className="text-slate-300 font-medium min-w-[80px] text-center">{currentYear}</span>
                                    <button
                                        onClick={() => setCurrentYear(currentYear + 1)}
                                        className="px-2 py-1 bg-slate-600 text-slate-300 text-sm rounded hover:bg-slate-500"
                                    >
                                        →
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setViewMode('monthly')}
                                    className={`px-3 py-1 text-sm rounded ${
                                        viewMode === 'monthly'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                    }`}
                                >
                                    Mensuel
                                </button>
                                <button
                                    onClick={() => setViewMode('yearly')}
                                    className={`px-3 py-1 text-sm rounded ${
                                        viewMode === 'yearly'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                    }`}
                                >
                                    Annuel
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`px-3 py-1 text-sm rounded ${
                                        viewMode === 'table'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                    }`}
                                >
                                    Tableau
                                </button>
                            </div>
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
                    viewMode === 'monthly' ? renderMonthlyView() : 
                    viewMode === 'yearly' ? renderYearlyView() : 
                    renderTableView()
                )}
            </div>
        </div>
    );
};

export default CalendarTab;