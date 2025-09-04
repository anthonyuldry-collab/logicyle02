

import React, { useState } from 'react';
import { Rider, RaceEvent, RiderEventSelection, RiderEventStatus, RiderEventPreference } from '../../types';
import { RIDER_EVENT_STATUS_COLORS, RIDER_EVENT_PREFERENCE_COLORS } from '../../constants';

interface CalendarTabProps {
    formData: Rider | Omit<Rider, 'id'>;
    raceEvents: RaceEvent[];
    riderEventSelections: RiderEventSelection[];
    onUpdateRiderPreference?: (eventId: string, riderId: string, preference: RiderEventPreference, objectives?: string) => void;
}

const CalendarTab: React.FC<CalendarTabProps> = ({
    formData,
    raceEvents,
    riderEventSelections,
    onUpdateRiderPreference
}) => {
    const riderId = (formData as Rider).id;
    const [editingEvent, setEditingEvent] = useState<string | null>(null);
    const [tempObjectives, setTempObjectives] = useState<string>('');

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

    const eventsForRider = futureEvents
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
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

    return (
        <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-200 mb-2">Mon Calendrier d'Équipe</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Exprimez vos préférences pour chaque événement à venir. Vos choix aideront l'équipe à mieux planifier les sélections.
                </p>
            </div>

            {eventsForRider.length === 0 ? (
                <div className="text-center py-8">
                    <p className="italic text-slate-400">Aucun événement à venir pour le moment.</p>
                    <p className="text-xs text-slate-500 mt-2">Les événements apparaîtront ici une fois que vous serez sélectionné.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {eventsForRider.map(event => (
                        <div key={event.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                            {/* En-tête de l'événement */}
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
                                <span className={`px-2 py-1 text-xs rounded-full ${RIDER_EVENT_STATUS_COLORS[event.status] || ''}`}>
                                    {event.status}
                                </span>
                            </div>

                            {/* Préférence actuelle */}
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

                            {/* Objectifs spécifiques */}
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

                            {/* Notes du staff */}
                            {event.notes && (
                                <div className="mt-3 pt-3 border-t border-slate-600">
                                    <p className="text-xs text-slate-500">
                                        <span className="font-medium">Notes du staff :</span> {event.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CalendarTab;