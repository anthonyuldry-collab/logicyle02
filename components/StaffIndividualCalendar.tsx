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
}

export default function StaffIndividualCalendar({
  staffMember,
  raceEvents,
  staffEventSelections,
  onClose
}: StaffIndividualCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Générer le calendrier pour le mois actuel
  const calendarDays = useMemo(() => {
    return generateStaffCalendar(staffMember, raceEvents, staffEventSelections, currentMonth);
  }, [staffMember, raceEvents, staffEventSelections, currentMonth]);

  // Obtenir les statistiques du calendrier
  const stats = useMemo(() => {
    return getStaffCalendarStats(calendarDays);
  }, [calendarDays]);

  // Navigation entre les mois
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
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

        {/* Contrôles de navigation */}
        <div className="bg-white p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-semibold text-gray-800">
                {getMonthName(currentMonth)}
              </h3>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {/* Calendrier */}
        <div className="p-6 overflow-auto max-h-96">
          <div className="grid grid-cols-7 gap-1">
            {/* En-têtes des jours de la semaine */}
            {weekDays.map(day => (
              <div key={day} className="p-3 text-center font-semibold text-gray-600 bg-gray-100">
                {day}
              </div>
            ))}

            {/* Jours du calendrier */}
            {calendarDays.map((day, index) => (
              <CalendarDay
                key={index}
                day={day}
                staffMember={staffMember}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CalendarDayProps {
  day: StaffCalendarDay;
  staffMember: StaffMember;
}

function CalendarDay({ day, staffMember }: CalendarDayProps) {
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
          <div
            key={event.id}
            className={`text-xs p-1 rounded border-l-2 ${
              event.status === StaffEventStatus.SELECTIONNE ? 'bg-green-50 border-green-400' :
              event.status === StaffEventStatus.PRE_SELECTION ? 'bg-yellow-50 border-yellow-400' :
              'bg-gray-50 border-gray-300'
            }`}
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
          </div>
        ))}
      </div>
    </div>
  );
}
