import React, { useState, useMemo } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { StaffMember, RaceEvent, StaffEventSelection, StaffEventStatus, StaffEventPreference, StaffAvailability } from '../types';
import { 
  generateStaffCalendar, 
  getStaffCalendarStats,
  formatCalendarDate,
  formatCalendarDateShort,
  getMonthName,
  getStatusColor,
  getAvailabilityColor,
  getPreferenceColor,
  StaffCalendarDay
} from '../utils/staffCalendarUtils';
import { addMonths, subMonths, isSameDay, format } from 'date-fns';

interface StaffIndividualCalendarProps {
  staffMember: StaffMember;
  raceEvents: RaceEvent[];
  staffEventSelections: StaffEventSelection[];
  onClose: () => void;
  onOpenEvent?: (eventId: string) => void;
}

export default function StaffIndividualCalendar({
  staffMember,
  raceEvents,
  staffEventSelections,
  onClose,
  onOpenEvent
}: StaffIndividualCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [hidePast, setHidePast] = useState<boolean>(true);

  // Générer le calendrier pour le mois actuel
  const calendarDays = useMemo(() => {
    return generateStaffCalendar(staffMember, raceEvents, staffEventSelections, currentMonth);
  }, [staffMember, raceEvents, staffEventSelections, currentMonth]);

  // Obtenir les statistiques du calendrier
  const stats = useMemo(() => {
    return getStaffCalendarStats(calendarDays);
  }, [calendarDays]);

  // Vue tableau annuelle: tous les événements de l'année sélectionnée
  const tableYear = useMemo(() => currentMonth.getFullYear(), [currentMonth]);
  const annualEvents = useMemo(() => {
    const today = new Date();
    const rows = (raceEvents || [])
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === tableYear;
      })
      .map(e => {
        const sel = (staffEventSelections || []).find(s => s.eventId === e.id && s.staffId === staffMember.id);
        return {
          id: e.id,
          date: new Date(e.date),
          name: e.name,
          location: (e as any).location,
          status: sel?.status || null,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return hidePast ? rows.filter(r => r.date >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) : rows;
  }, [raceEvents, staffEventSelections, staffMember.id, tableYear, hidePast]);

  // Navigation (mois en vue calendrier, année en vue tableau)
  const goToPrevious = () => {
    if (viewMode === 'calendar') {
      setCurrentMonth(prev => subMonths(prev, 1));
    } else {
      setCurrentMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'calendar') {
      setCurrentMonth(prev => addMonths(prev, 1));
    } else {
      setCurrentMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
    }
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Obtenir les jours de la semaine
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{staffMember.name}</h2>
                <p className="text-blue-100">{staffMember.role || 'AUTRE'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XCircleIcon className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="bg-gray-50 p-4 border-b">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalEvents}</div>
              <div className="text-sm text-gray-600">Événements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.selectedEvents}</div>
              <div className="text-sm text-gray-600">Sélectionnés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.preSelectedEvents}</div>
              <div className="text-sm text-gray-600">Pré-sélectionnés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.availableDays}</div>
              <div className="text-sm text-gray-600">Jours disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.unavailableDays}</div>
              <div className="text-sm text-gray-600">Jours indisponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.workDays}</div>
              <div className="text-sm text-gray-600">Jours de travail</div>
            </div>
          </div>
        </div>

        {/* Contrôles de navigation + switch de vue */}
        <div className="bg-white p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPrevious}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-semibold text-gray-800">
                {viewMode === 'calendar' ? getMonthName(currentMonth) : tableYear}
              </h3>
              <button
                onClick={goToNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 text-sm rounded-md ${viewMode === 'calendar' ? 'bg-white shadow border' : 'text-gray-600'}`}
                >
                  Calendrier
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-sm rounded-md ${viewMode === 'table' ? 'bg-white shadow border' : 'text-gray-600'}`}
                >
                  Tableau
                </button>
              </div>
              {viewMode === 'table' && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={hidePast} onChange={(e) => setHidePast(e.target.checked)} />
                  Masquer les événements passés
                </label>
              )}
              <button
                onClick={() => {
                  if (viewMode === 'calendar') {
                    goToToday();
                  } else {
                    const now = new Date();
                    setCurrentMonth(new Date(now.getFullYear(), 0, 1));
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Aujourd'hui
              </button>
            </div>
          </div>
        </div>

        {/* Corps: Calendrier ou Tableau */}
        {viewMode === 'calendar' ? (
          <div className="p-6 overflow-auto max-h-[65vh]">
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => (
                <div key={day} className="p-3 text-center font-semibold text-gray-600 bg-gray-100">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => (
                <CalendarDay key={index} day={day} staffMember={staffMember} />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-auto max-h-[65vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Événement</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lieu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {annualEvents.map((ev, idx) => {
                  const prev = annualEvents[idx - 1];
                  const showMonthHeader = !prev || prev.date.getMonth() !== ev.date.getMonth();
                  return (
                    <>
                      {showMonthHeader && (
                        <tr key={`m-${ev.date.getFullYear()}-${ev.date.getMonth()}`} className="bg-gray-100">
                          <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            {format(ev.date, 'MMMM yyyy')}
                          </td>
                        </tr>
                      )}
                      <tr key={ev.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onOpenEvent && onOpenEvent(ev.id)}>
                    <td className="px-4 py-3 text-sm text-gray-900">{format(ev.date, 'dd/MM')}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{ev.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{ev.location || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        ev.status === StaffEventStatus.SELECTIONNE ? 'bg-green-100 text-green-800' :
                        ev.status === StaffEventStatus.PRE_SELECTION ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ev.status === StaffEventStatus.SELECTIONNE ? 'Sélectionné' : ev.status === StaffEventStatus.PRE_SELECTION ? 'Pré-sélection' : 'Non sélectionné'}
                      </span>
                    </td>
                      </tr>
                    </>
                  );
                })}
                {annualEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">Aucun événement pour cette année</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface CalendarDayProps {
  day: StaffCalendarDay;
  staffMember: StaffMember;
  onOpenEvent?: (eventId: string) => void;
}

function CalendarDay({ day, staffMember, onOpenEvent }: CalendarDayProps) {
  const today = new Date();
  const isToday = isSameDay(day.date, today);

  return (
    <div className={`min-h-24 p-2 border border-gray-200 ${
      isToday ? 'bg-blue-50 border-blue-300' : 
      day.isPast ? 'bg-gray-50' : 'bg-white'
    }`}>
      {/* Numéro du jour */}
      <div className={`text-sm font-medium mb-1 ${
        isToday ? 'text-blue-600' : 
        day.isPast ? 'text-gray-400' : 'text-gray-700'
      }`}>
        {format(day.date, 'd')}
      </div>

      {/* Événements */}
      <div className="space-y-1">
        {day.events.map(event => (
          <button
            key={event.id}
            className={`w-full text-left text-xs p-1 rounded border-l-2 hover:bg-gray-100 transition ${
              event.status === StaffEventStatus.SELECTIONNE ? 'bg-green-50 border-green-400' :
              event.status === StaffEventStatus.PRE_SELECTION ? 'bg-yellow-50 border-yellow-400' :
              'bg-gray-50 border-gray-300'
            }`}
            onClick={() => onOpenEvent && onOpenEvent(event.id)}
          >
            <div className="font-medium truncate">{event.eventName}</div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <ClockIcon className="w-3 h-3" />
              <span>{formatCalendarDateShort(event.date)}</span>
            </div>
            {event.location && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <MapPinIcon className="w-3 h-3" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
