import React, { useState, useMemo } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { StaffMember, RaceEvent, StaffEventSelection, StaffEventStatus, StaffEventPreference, StaffAvailability } from '../types';
import { 
  generateGroupMonitoring, 
  generateMonthlyMonitoring,
  generateYearlyMonitoring,
  getGroupMonitoringStats,
  formatCalendarDate,
  formatCalendarDateShort,
  getStatusColor,
  getAvailabilityColor,
  getPreferenceColor,
  GroupMonitoringData,
  MonthlyMonitoringData,
  YearlyMonitoringData
} from '../utils/staffCalendarUtils';
import { addDays, subDays, format, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';

interface StaffGroupMonitoringProps {
  staff: StaffMember[];
  raceEvents: RaceEvent[];
  staffEventSelections: StaffEventSelection[];
  onClose: () => void;
  onViewIndividualCalendar?: (staffMember: StaffMember) => void;
}

export default function StaffGroupMonitoring({
  staff,
  raceEvents,
  staffEventSelections,
  onClose,
  onViewIndividualCalendar
}: StaffGroupMonitoringProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year' | 'table'>('week');

  // Générer les données de monitoring selon la vue
  const monitoringData = useMemo(() => {
    let data;
    
    if (viewMode === 'year') {
      data = generateYearlyMonitoring(staff, raceEvents, staffEventSelections, currentDate.getFullYear());
    } else if (viewMode === 'month') {
      data = generateMonthlyMonitoring(staff, raceEvents, staffEventSelections, currentDate.getFullYear(), currentDate.getMonth() + 1);
    } else if (viewMode === 'table') {
      // Vue tableau : toutes les assignations futures
      const today = new Date();
      const futureDate = new Date(today.getFullYear() + 1, 11, 31); // Fin de l'année suivante
      data = generateGroupMonitoring(staff, raceEvents, staffEventSelections, today, futureDate);
    } else {
      // Vue semaine
      const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      data = generateGroupMonitoring(staff, raceEvents, staffEventSelections, startDate, endDate);
    }
    
    // Debug temporaire
    console.log('🔍 StaffGroupMonitoring Debug:', {
      viewMode,
      currentDate: currentDate.toISOString(),
      staffCount: staff.length,
      raceEventsCount: raceEvents.length,
      staffEventSelectionsCount: staffEventSelections.length,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      eventsWithData: Array.isArray(data) ? data.filter(d => d.events && d.events.length > 0).length : 'N/A'
    });
    
    // Filtrer pour ne montrer que les jours avec des événements (avec ou sans staff assigné)
    if (viewMode !== 'table' && Array.isArray(data)) {
      const filteredData = data.filter(dayData => dayData.events && dayData.events.length > 0);
      console.log('🔍 Filtered data:', filteredData.length, 'days with events');
      return filteredData;
    }
    
    return data;
  }, [staff, raceEvents, staffEventSelections, currentDate, viewMode]);

  // Données pour la vue tableau (toujours un tableau)
  const tableData = useMemo(() => {
    if (viewMode === 'table') {
      return monitoringData as GroupMonitoringData[];
    }
    return [];
  }, [monitoringData, viewMode]);

  // Obtenir les statistiques
  const stats = useMemo(() => {
    return getGroupMonitoringStats(monitoringData);
  }, [monitoringData]);

  // Navigation
  const goToPrevious = () => {
    if (viewMode === 'table') return; // Pas de navigation pour la vue tableau
    setCurrentDate(prev => {
      if (viewMode === 'week') {
        return subDays(prev, 7);
      } else if (viewMode === 'month') {
        return subMonths(prev, 1);
      } else {
        return subMonths(prev, 12);
      }
    });
  };

  const goToNext = () => {
    if (viewMode === 'table') return; // Pas de navigation pour la vue tableau
    setCurrentDate(prev => {
      if (viewMode === 'week') {
        return addDays(prev, 7);
      } else if (viewMode === 'month') {
        return addMonths(prev, 1);
      } else {
        return addMonths(prev, 12);
      }
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <UserGroupIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Monitoring de Groupe</h2>
                <p className="text-purple-100">Qui va où et quand</p>
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
              <div className="text-2xl font-bold text-purple-600">{stats.totalAssignments}</div>
              <div className="text-sm text-gray-600">Assignations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.selectedAssignments}</div>
              <div className="text-sm text-gray-600">Sélectionnées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.preSelectedAssignments}</div>
              <div className="text-sm text-gray-600">Pré-sélectionnées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.availableStaff}</div>
              <div className="text-sm text-gray-600">Staff disponible</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.unavailableStaff}</div>
              <div className="text-sm text-gray-600">Staff indisponible</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.eventsCoverage}</div>
              <div className="text-sm text-gray-600">Jours couverts</div>
            </div>
          </div>
        </div>

        {/* Contrôles */}
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
                {viewMode === 'week' ? 'Semaine' : 
                 viewMode === 'month' ? 'Mois' : 
                 viewMode === 'year' ? 'Année' : 
                 'Tableau'} {
                  viewMode === 'table' ? 'des Assignations' :
                  viewMode === 'year' ? currentDate.getFullYear() : 
                  formatCalendarDateShort(currentDate)
                }
              </h3>
              <button
                onClick={goToNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'week' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                  }`}
                >
                  📅 Semaine
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'month' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                  }`}
                >
                  📊 Mois
                </button>
                <button
                  onClick={() => setViewMode('year')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'year' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                  }`}
                >
                  🗓️ Année
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'table' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                  }`}
                >
                  📋 Tableau
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Aujourd'hui
              </button>
            </div>
          </div>
        </div>

        {/* Contenu selon la vue */}
        <div className="p-6 overflow-auto max-h-96">
          {viewMode === 'table' ? (
            <TableView
              monitoringData={tableData}
              staff={staff}
              onViewIndividualCalendar={onViewIndividualCalendar}
            />
          ) : (
            <div className="space-y-4">
              {Array.isArray(monitoringData) && monitoringData.length > 0 ? (
                monitoringData.map(dayData => (
                  <MonitoringDay
                    key={dayData.date.toISOString()}
                    dayData={dayData}
                    staff={staff}
                    onViewIndividualCalendar={onViewIndividualCalendar}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <UserGroupIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
                  <p className="text-sm mb-4">Aucun événement ou assignation trouvé pour la période sélectionnée.</p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>• Vérifiez que des événements existent pour cette période</p>
                    <p>• Assurez-vous que les événements sont dans le futur</p>
                    <p>• Mode actuel: {viewMode}</p>
                    <p>• Date: {currentDate.toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TableViewProps {
  monitoringData: GroupMonitoringData[];
  staff: StaffMember[];
  onViewIndividualCalendar?: (staffMember: StaffMember) => void;
}

function TableView({ monitoringData, staff, onViewIndividualCalendar }: TableViewProps) {
  // Flatten all assignments from all days
  const allAssignments = monitoringData.flatMap(dayData => 
    dayData.staffAssignments.map(assignment => ({
      ...assignment,
      date: dayData.date
    }))
  );

  // Flatten all events from all days
  const allEvents = monitoringData.flatMap(dayData => 
    dayData.events.map(event => ({
      ...event,
      date: dayData.date,
      staffCount: dayData.staffAssignments.filter(a => a.eventId === event.eventId).length
    }))
  );

  // Sort assignments by date, then by staff name
  const sortedAssignments = allAssignments.sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.staffName.localeCompare(b.staffName);
  });

  // Sort events by date, then by event name
  const sortedEvents = allEvents.sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.eventName.localeCompare(b.eventName);
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staff
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Événement
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Disponibilité
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Préférence
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAssignments.map((assignment, index) => {
              const staffMember = staff.find(s => s.id === assignment.staffId);
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assignment.date.toLocaleDateString('fr-FR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {assignment.staffName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.staffName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {assignment.staffRole}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assignment.eventName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {assignment.status && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {assignment.availability && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(assignment.availability)}`}>
                        {assignment.availability.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {assignment.preference && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPreferenceColor(assignment.preference)}`}>
                        {assignment.preference.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {onViewIndividualCalendar && staffMember && (
                      <button
                        onClick={() => onViewIndividualCalendar(staffMember)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="Voir le calendrier individuel"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {sortedAssignments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <CalendarDaysIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Aucune assignation trouvée</p>
          <p className="text-sm">Commencez par planifier des événements pour votre staff</p>
        </div>
      )}
    </div>
  );
}

interface MonitoringDayProps {
  dayData: GroupMonitoringData;
  staff: StaffMember[];
  onViewIndividualCalendar?: (staffMember: StaffMember) => void;
}

function MonitoringDay({ dayData, staff, onViewIndividualCalendar }: MonitoringDayProps) {
  const today = new Date();
  const isToday = dayData.date.toDateString() === today.toDateString();

  return (
    <div className={`border rounded-lg p-4 ${
      isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      {/* En-tête du jour */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <CalendarDaysIcon className="w-5 h-5 text-gray-500" />
          <h4 className="text-lg font-semibold text-gray-800">
            {dayData.date.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })}
          </h4>
          {isToday && (
            <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
              Aujourd'hui
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {dayData.events.length} événement(s) • {dayData.staffAssignments.length} assignation(s)
        </div>
      </div>

      {/* Événements du jour */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Événements</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dayData.events.map((event, index) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{event.eventName}</p>
                  {event.eventLocation && (
                    <p className="text-xs text-gray-500 mt-1">📍 {event.eventLocation}</p>
                  )}
                  {event.eventType && (
                    <p className="text-xs text-gray-500">🏁 {event.eventType}</p>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {dayData.staffAssignments.filter(a => a.eventId === event.eventId).length} staff
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignations du jour */}
      {dayData.staffAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dayData.staffAssignments.map((assignment, index) => {
            const staffMember = staff.find(s => s.id === assignment.staffId);
            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-800">{assignment.staffName}</span>
                    <span className="text-xs text-gray-500">({assignment.staffRole})</span>
                  </div>
                  {onViewIndividualCalendar && staffMember && (
                    <button
                      onClick={() => onViewIndividualCalendar(staffMember)}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title="Voir le calendrier individuel"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-gray-700">{assignment.eventName}</div>
                  
                  <div className="flex flex-wrap gap-1">
                    {assignment.status && (
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    )}
                    {assignment.availability && (
                      <span className={`px-2 py-1 text-xs rounded-full border ${getAvailabilityColor(assignment.availability)}`}>
                        {assignment.availability.replace('_', ' ')}
                      </span>
                    )}
                    {assignment.preference && (
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPreferenceColor(assignment.preference)}`}>
                        {assignment.preference.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-sm">Aucune assignation de staff pour les événements de ce jour</p>
        </div>
      )}
    </div>
  );
}
