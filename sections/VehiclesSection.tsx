

import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, StaffMember, EventTransportLeg, RaceEvent, AppSection, MaintenanceRecord, VehicleType, EventType } from '../types';
import { EVENT_TYPE_COLORS } from '../constants'; 
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import TruckIcon from '../components/icons/TruckIcon';
import ListBulletIcon from '../components/icons/ListBulletIcon'; 
import ChevronLeftIcon from '../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import { useTranslations } from '../hooks/useTranslations';
import { getStaffRoleDisplayLabel } from '../utils/staffRoleUtils';
import FleetMapPanel from '../components/FleetMapPanel';
import FleetHistoryPanel from '../components/FleetHistoryPanel';
import FleetWebhookConfigPanel from '../components/FleetWebhookConfigPanel';
import DriverGpsSetupGuide from '../components/DriverGpsSetupGuide';
import { buildFleetStatuses } from '../utils/fleetGpsUtils';
import {
  applyDriverGpsToVehicle,
  countFleetDriverGpsReady,
  evaluateVehicleDriverGpsSetup,
} from '../utils/driverGpsSetupUtils';
import { VehiclePosition } from '../types';
import * as firebaseService from '../services/firebaseService';


interface VehiclesSectionProps {
  vehicles: Vehicle[];
  onSave: (vehicle: Vehicle) => void;
  onDelete: (vehicleId: string) => void;
  effectivePermissions?: any;
  staff: StaffMember[];
  eventTransportLegs: EventTransportLeg[];
  raceEvents: RaceEvent[];
  navigateTo: (section: AppSection, eventId?: string) => void;
  vehiclePositions?: VehiclePosition[];
  teamId?: string;
  teamName?: string;
  gpsWebhookKey?: string;
  onGpsWebhookKeyUpdated?: (key: string) => void;
  initialTab?: VehicleTab;
  onVehiclePositionsUpdate?: (positions: VehiclePosition[]) => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const initialVehicleFormState: Omit<Vehicle, 'id'> = { 
  name: '', 
  licensePlate: '', 
  driverId: undefined,
  notes: '',
  vehicleType: VehicleType.VOITURE, 
  seats: undefined,
  estimatedDailyCost: undefined,
  purchaseDate: undefined,
  nextMaintenanceDate: undefined,
  maintenanceNotes: undefined,
  maintenanceHistory: [],
  currentMileage: undefined,
  gpsDeviceId: undefined,
  gpsTrackingEnabled: false,
  gpsSource: 'manual',
};

const lightInputBaseClasses = "bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500";
const lightInputClass = `mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm ${lightInputBaseClasses}`;
const lightSelectClass = `mt-1 block w-full pl-3 pr-10 py-2 border rounded-md shadow-sm sm:text-sm ${lightInputBaseClasses}`;

const datesOverlap = (startAStr: string | undefined, endAStr: string | undefined, startBStr: string | undefined, endBStr: string | undefined): boolean => {
  if (!startAStr || !startBStr) return false;

  const sA = new Date(startAStr + "T00:00:00Z");
  const eA = endAStr ? new Date(endAStr + "T23:59:59Z") : new Date(startAStr + "T23:59:59Z"); 
  const sB = new Date(startBStr + "T00:00:00Z");
  const eB = endBStr ? new Date(endBStr + "T23:59:59Z") : new Date(startBStr + "T23:59:59Z");
  
  return sA <= eB && eA >= sB;
};

const getVehicleStatusForDay = (
    vehicle: Vehicle, 
    date: Date, 
    allLegs: EventTransportLeg[],
    allEvents: RaceEvent[]
): { status: 'Disponible' | 'Assigné' | 'Maintenance', details?: string, eventType?: EventType } => {
    const dateStr = date.toISOString().split('T')[0];

    // Check for maintenance first
    if (vehicle.nextMaintenanceDate === dateStr) {
        return { status: 'Maintenance', details: vehicle.maintenanceNotes || 'Entretien prévu' };
    }

    // Check for assignment
    const assignedLeg = allLegs.find(leg => {
        if (leg.assignedVehicleId === vehicle.id) {
            if (!leg.departureDate) return false;
            return datesOverlap(dateStr, dateStr, leg.departureDate, leg.arrivalDate || leg.departureDate);
        }
        return false;
    });

    if (assignedLeg) {
        const event = allEvents.find(e => e.id === assignedLeg.eventId);
        return { status: 'Assigné', details: event ? event.name : 'Événement Inconnu', eventType: event?.eventType };
    }

    return { status: 'Disponible' };
};

type VehicleTab = 'list' | 'assignmentCalendar' | 'gps';

const VehiclesSection: React.FC<VehiclesSectionProps> = ({ 
    vehicles: vehiclesProp, 
    onSave, 
    onDelete, 
    effectivePermissions,
    staff,
    eventTransportLegs,
    raceEvents,
    navigateTo,
    vehiclePositions = [],
    teamId,
    teamName = 'team',
    gpsWebhookKey,
    onGpsWebhookKeyUpdated,
    initialTab,
    onVehiclePositionsUpdate,
}) => {
  const vehicles = vehiclesProp ?? [];
  const { t, language } = useTranslations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Omit<Vehicle, 'id'> | Vehicle>(initialVehicleFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [activeVehicleTab, setActiveVehicleTab] = useState<VehicleTab>(initialTab || 'list');
  const [calendarDisplayDate, setCalendarDisplayDate] = useState(new Date());
  const [selectedGpsVehicleId, setSelectedGpsVehicleId] = useState<string | undefined>();
  const [gpsAdvancedOpen, setGpsAdvancedOpen] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualSpeed, setManualSpeed] = useState('');
  const [manualGpsVehicleId, setManualGpsVehicleId] = useState('');
  const [manualGpsSaving, setManualGpsSaving] = useState(false);
  const [manualGpsMessage, setManualGpsMessage] = useState<string | null>(null);

  const fleetStatuses = useMemo(
    () => buildFleetStatuses(vehicles, vehiclePositions, eventTransportLegs, raceEvents, staff),
    [vehicles, vehiclePositions, eventTransportLegs, raceEvents, staff]
  );

  const fleetSummary = useMemo(() => {
    const today = new Date();
    let available = 0;
    let assigned = 0;
    let maintenance = 0;
    let gpsOnline = 0;
    for (const v of vehicles) {
      const st = getVehicleStatusForDay(v, today, eventTransportLegs, raceEvents);
      if (st.status === 'Disponible') available += 1;
      else if (st.status === 'Assigné') assigned += 1;
      else maintenance += 1;
      if (fleetStatuses.find((s) => s.vehicle.id === v.id)?.isOnline) gpsOnline += 1;
    }
    return { total: vehicles.length, available, assigned, maintenance, gpsOnline };
  }, [vehicles, eventTransportLegs, raceEvents, fleetStatuses]);

  useEffect(() => {
    if (initialTab) setActiveVehicleTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!teamId || !onVehiclePositionsUpdate) return;
    return firebaseService.subscribeVehiclePositions(teamId, onVehiclePositionsUpdate);
  }, [teamId, onVehiclePositionsUpdate]);

  const fleetGpsSummary = useMemo(
    () => countFleetDriverGpsReady(vehicles, staff),
    [vehicles, staff],
  );

  const selectedGpsSetup = useMemo(() => {
    const vehicle =
      vehicles.find((v) => v.id === selectedGpsVehicleId) ||
      vehicles.find((v) => v.driverId);
    if (!vehicle) return null;
    return evaluateVehicleDriverGpsSetup(vehicle, staff);
  }, [vehicles, staff, selectedGpsVehicleId]);

  if (vehiclesProp == null) {
    return (
      <SectionWrapper title={t('vehiclesTitle')}>
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <p className="text-sm text-gray-500">{t('loading')}</p>
        </div>
      </SectionWrapper>
    );
  }

  const handleManualGpsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vehicleId = manualGpsVehicleId || selectedGpsVehicleId;
    if (!teamId || !vehicleId) return;
    const latitude = parseFloat(manualLat.replace(',', '.'));
    const longitude = parseFloat(manualLng.replace(',', '.'));
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;
    const speedKmh = manualSpeed ? parseFloat(manualSpeed.replace(',', '.')) : undefined;
    setManualGpsSaving(true);
    setManualGpsMessage(null);
    try {
      await firebaseService.recordManualVehiclePosition(
        teamId,
        vehicleId,
        latitude,
        longitude,
        Number.isNaN(speedKmh!) ? undefined : speedKmh,
      );
      setManualGpsMessage(t('fleetGpsManualSaved'));
      setManualLat('');
      setManualLng('');
      setManualSpeed('');
    } catch {
      setManualGpsMessage(t('fleetGpsManualError'));
    } finally {
      setManualGpsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    if (name === 'seats' || name === 'estimatedDailyCost' || name === 'currentMileage') {
      processedValue = value === '' ? undefined : parseFloat(value);
    } else if (name === 'gpsTrackingEnabled') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'driverId') {
      processedValue = value === '' ? undefined : value;
      if (processedValue) {
        setCurrentVehicle((prev) =>
          applyDriverGpsToVehicle({ ...(prev as Vehicle), id: (prev as Vehicle).id || 'draft' }, processedValue),
        );
        return;
      }
    } else if (type === 'date' && value === '') {
      processedValue = undefined;
    }

    setCurrentVehicle(prev => ({ 
        ...prev, 
        [name]: processedValue
    }));
  };
  
  const handleMaintenanceRecordChange = (index: number, field: keyof MaintenanceRecord, value: string | number) => {
    const updatedHistory = [...((currentVehicle as Vehicle).maintenanceHistory || [])];
    if (updatedHistory[index]) {
        (updatedHistory[index] as any)[field] = (field === 'cost' || field === 'mileage') && typeof value === 'string' ? (value === '' ? undefined : parseFloat(value)) : value;
        setCurrentVehicle(prev => ({ ...prev, maintenanceHistory: updatedHistory }));
    }
  };

  const addMaintenanceRecord = () => {
    const newRecord: MaintenanceRecord = { id: generateId(), date: new Date().toISOString().split('T')[0], description: '' };
    setCurrentVehicle(prev => ({ ...prev, maintenanceHistory: [...((prev as Vehicle).maintenanceHistory || []), newRecord] }));
  };

  const removeMaintenanceRecord = (idToRemove: string) => {
    if(window.confirm(t('vehicleConfirmDeleteMaintenance'))){
        setCurrentVehicle(prev => ({ ...prev, maintenanceHistory: ((prev as Vehicle).maintenanceHistory || []).filter(rec => rec.id !== idToRemove) }));
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && 'id' in currentVehicle) {
        await onSave(currentVehicle as Vehicle);
      } else {
        let newVehicle = { ...currentVehicle, id: generateId() } as Vehicle;
        if (newVehicle.driverId && newVehicle.gpsSource !== 'driver_app') {
          newVehicle = applyDriverGpsToVehicle(newVehicle, newVehicle.driverId);
        }
        await onSave(newVehicle);
      }
      setIsModalOpen(false);
      setCurrentVehicle(initialVehicleFormState);
      setIsEditing(false);
    } catch (error) {
      console.warn('⚠️ Erreur lors de la sauvegarde du véhicule:', error);
      alert(t('vehiclesSaveError'));
    }
  };

  const openAddModal = () => {
    setCurrentVehicle(initialVehicleFormState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (vehicleId: string) => {
    if (window.confirm(t('vehicleConfirmDelete'))) {
      try {
        await onDelete(vehicleId);
      } catch (error) {
              console.warn('⚠️ Erreur lors de la suppression du véhicule:', error);
      alert('⚠️ Erreur lors de la suppression. Veuillez réessayer.');
      }
    }
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return t('vehiclesNoDriver');
    const driver = staff.find(s => s.id === driverId);
    return driver ? `${driver.firstName} ${driver.lastName}` : t('vehiclesUnknownDriver');
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString + "T12:00:00Z").toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return 'Date invalide' }
  };

  const renderFleetKpis = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {[
        { label: t('vehiclesKpiTotal'), value: fleetSummary.total, tone: 'text-gray-900' },
        { label: t('vehiclesKpiAvailable'), value: fleetSummary.available, tone: 'text-emerald-600' },
        { label: t('vehiclesKpiAssigned'), value: fleetSummary.assigned, tone: 'text-orange-600' },
        { label: t('vehiclesKpiGpsOnline'), value: fleetSummary.gpsOnline, tone: 'text-indigo-600' },
      ].map((kpi) => (
        <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">{kpi.label}</p>
          <p className={`text-2xl font-bold ${kpi.tone}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );

  const statusBadgeClass = (status: 'Disponible' | 'Assigné' | 'Maintenance') => {
    if (status === 'Disponible') return 'bg-green-100 text-green-800';
    if (status === 'Assigné') return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const statusLabel = (status: 'Disponible' | 'Assigné' | 'Maintenance') => {
    if (status === 'Disponible') return t('vehiclesStatusAvailable');
    if (status === 'Assigné') return t('vehiclesStatusAssigned');
    return t('vehiclesStatusMaintenance');
  };

  const renderVehicleListTab = () => (
    vehicles.length === 0 ? (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
        <TruckIcon className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-600">{t('vehiclesEmpty')}</p>
        <ActionButton className="mt-4" onClick={openAddModal} icon={<PlusCircleIcon className="w-5 h-5" />}>
          {t('vehiclesAdd')}
        </ActionButton>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => {
          const todayStatus = getVehicleStatusForDay(vehicle, new Date(), eventTransportLegs, raceEvents);
          const gpsStatus = fleetStatuses.find((s) => s.vehicle.id === vehicle.id);
          return (
            <div key={vehicle.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{vehicle.name}</h3>
                  <p className="text-xs text-gray-500">{vehicle.licensePlate} · {vehicle.vehicleType}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusBadgeClass(todayStatus.status)}`}>
                  {statusLabel(todayStatus.status)}
                </span>
              </div>
              {todayStatus.status === 'Assigné' && todayStatus.details && (
                <p className="mt-2 text-xs text-orange-700 truncate">{todayStatus.details}</p>
              )}
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p>{t('vehiclesDriver')}: {getDriverName(vehicle.driverId)}</p>
                {vehicle.nextMaintenanceDate && (
                  <p>{t('vehiclesNextMaintenance')}: {formatDate(vehicle.nextMaintenanceDate)}</p>
                )}
                <p>
                  GPS:{' '}
                  {vehicle.gpsTrackingEnabled ? (
                    <span className={gpsStatus?.isOnline ? 'text-green-700 font-medium' : 'text-gray-500'}>
                      {gpsStatus?.isOnline ? t('fleetGpsOnline') : t('fleetGpsOffline')}
                    </span>
                  ) : (
                    <span className="text-gray-400">{t('fleetGpsDisabled')}</span>
                  )}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton
                  size="sm"
                  variant="secondary"
                  onClick={() => { setSelectedGpsVehicleId(vehicle.id); setActiveVehicleTab('gps'); }}
                >
                  {t('fleetGpsViewMap')}
                </ActionButton>
                <ActionButton size="sm" variant="secondary" onClick={() => openEditModal(vehicle)} icon={<PencilIcon className="w-4 h-4" />}>
                  {t('vehiclesEdit')}
                </ActionButton>
                <ActionButton size="sm" variant="danger" onClick={() => handleDelete(vehicle.id)} icon={<TrashIcon className="w-4 h-4" />}>
                  {t('vehiclesDelete')}
                </ActionButton>
              </div>
            </div>
          );
        })}
      </div>
    )
  );

  const renderVehicleAssignmentCalendarTab = () => {
    const month = calendarDisplayDate.getMonth();
    const year = calendarDisplayDate.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <ActionButton onClick={() => setCalendarDisplayDate(new Date(year, month - 1, 1))} variant="secondary" icon={<ChevronLeftIcon className="w-4 h-4" />} size="sm">Mois Préc.</ActionButton>
          <h3 className="text-xl font-semibold text-gray-800">
            {calendarDisplayDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h3>
          <ActionButton onClick={() => setCalendarDisplayDate(new Date(year, month + 1, 1))} variant="secondary" icon={<ChevronRightIcon className="w-4 h-4" />} size="sm">Mois Suiv.</ActionButton>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 border-b pb-2 mb-1">
          {daysOfWeek.map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-start-${i}`} className="h-28 bg-gray-50 rounded-md border"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
            const dayNumber = dayIndex + 1;
            const currentDate = new Date(year, month, dayNumber);
            const isToday = new Date().toDateString() === currentDate.toDateString();
            
            const dateStr = currentDate.toISOString().split('T')[0];
            const itemsForDay = vehicles.flatMap((vehicle) => {
                const statusInfo = getVehicleStatusForDay(vehicle, currentDate, eventTransportLegs, raceEvents);
                if (statusInfo.status === 'Disponible') return [];
                const leg = eventTransportLegs.find(
                  (l) =>
                    l.assignedVehicleId === vehicle.id
                    && l.departureDate
                    && datesOverlap(dateStr, dateStr, l.departureDate, l.arrivalDate || l.departureDate),
                );
                return [{
                  vehicleId: vehicle.id,
                  vehicleName: vehicle.name,
                  eventId: leg?.eventId,
                  ...statusInfo,
                }];
            });

            return (
              <div key={dayNumber} className={`h-28 border rounded-md p-1 overflow-y-auto text-xs relative ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                <span className={`font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{dayNumber}</span>
                <div className="mt-1 space-y-1">
                  {itemsForDay.map((item) => {
                    const bgColor = item.status === 'Maintenance' 
                      ? 'bg-yellow-400 text-black' 
                      : (item.eventType ? EVENT_TYPE_COLORS[item.eventType] : 'bg-orange-400 text-white');
                    
                    return (
                      <div
                        key={`${item.vehicleId}-${item.status}`}
                        title={`${item.vehicleName}: ${item.details}`}
                        className={`p-1 rounded text-[10px] leading-tight truncate cursor-pointer hover:opacity-80 ${bgColor}`}
                        onClick={() => item.status === 'Assigné' && item.eventId && navigateTo('eventDetail', item.eventId)}
                      >
                        <span className="font-medium">{item.vehicleName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
           {Array.from({ length: (7 - (adjustedFirstDay + daysInMonth) % 7) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} className="h-28 bg-gray-50 rounded-md border"></div>
          ))}
        </div>
         <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-600 mb-2 text-center">Légende</h4>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full mr-1.5 bg-yellow-400"></span><span className="text-gray-500">Maintenance</span></div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full mr-1.5 bg-orange-400"></span><span className="text-gray-500">Assigné (Course)</span></div>
            </div>
        </div>
      </div>
    );
  };


  const tabButtonStyle = (tabName: VehicleTab) => 
    `px-3 py-2 font-medium text-sm rounded-t-md whitespace-nowrap transition-colors duration-150 focus:outline-none ${
      activeVehicleTab === tabName 
        ? 'bg-white text-gray-800 border-b-2 border-blue-500 shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <SectionWrapper 
      title={t('vehiclesTitle')}
      actionButton={ activeVehicleTab === 'list' ? (
        <ActionButton onClick={openAddModal} icon={<PlusCircleIcon className="w-5 h-5"/>}>
          {t('vehiclesAdd')}
        </ActionButton>
      ) : null}
    >
        {renderFleetKpis()}
        <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
            <button onClick={() => setActiveVehicleTab('list')} className={tabButtonStyle('list')}>
                <TruckIcon className="w-4 h-4 mr-2 inline-block"/>{t('vehiclesTabList')}
            </button>
            <button onClick={() => setActiveVehicleTab('assignmentCalendar')} className={tabButtonStyle('assignmentCalendar')}>
                <ListBulletIcon className="w-4 h-4 mr-2 inline-block"/>{t('vehiclesTabCalendar')}
            </button>
            <button onClick={() => setActiveVehicleTab('gps')} className={tabButtonStyle('gps')}>
                <TruckIcon className="w-4 h-4 mr-2 inline-block"/>{t('fleetGpsTitle')}
            </button>
            </nav>
        </div>

        {activeVehicleTab === 'list' && renderVehicleListTab()}
        {activeVehicleTab === 'assignmentCalendar' && renderVehicleAssignmentCalendarTab()}
        {activeVehicleTab === 'gps' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{t('fleetGpsDesc')}</p>
            {selectedGpsSetup && (
              <DriverGpsSetupGuide status={selectedGpsSetup} mode="manager" />
            )}
            {vehicles.length > 0 && (
              <p className="text-xs text-gray-500">
                {t('driverGpsFleetSummary')
                  .replace('{sharing}', String(fleetGpsSummary.sharingNow))
                  .replace('{total}', String(fleetGpsSummary.withDriver))}
              </p>
            )}
            <FleetMapPanel
              statuses={fleetStatuses.filter((s) => s.isOnline || s.position?.latitude != null)}
              selectedVehicleId={selectedGpsVehicleId}
              onSelectVehicle={setSelectedGpsVehicleId}
              language={language}
            />
            {selectedGpsVehicleId && (
              <p className="text-xs text-gray-500">
                {t('fleetGpsConfigureHint')}{' '}
                <button type="button" className="text-indigo-600 hover:underline" onClick={() => {
                  const v = vehicles.find((x) => x.id === selectedGpsVehicleId);
                  if (v) openEditModal(v);
                }}>
                  {t('fleetGpsConfigureLink')}
                </button>
              </p>
            )}
            <button
              type="button"
              onClick={() => setGpsAdvancedOpen((o) => !o)}
              className="w-full text-left rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('vehiclesGpsAdvanced')} {gpsAdvancedOpen ? '▾' : '▸'}
            </button>
            {gpsAdvancedOpen && (
              <div className="space-y-4 pl-1 border-l-2 border-indigo-100 ml-2">
                <FleetHistoryPanel
                  vehicles={vehicles}
                  positions={vehiclePositions}
                  teamName={teamName}
                  selectedVehicleId={selectedGpsVehicleId}
                  language={language}
                />
                {teamId && (
                  <FleetWebhookConfigPanel
                    teamId={teamId}
                    webhookKey={gpsWebhookKey}
                    onKeyUpdated={onGpsWebhookKeyUpdated}
                  />
                )}
                {teamId && vehicles.length > 0 && (
                  <form
                    onSubmit={handleManualGpsSubmit}
                    className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{t('fleetGpsManualTitle')}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{t('fleetGpsManualDesc')}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">{t('fleetGpsHistoryVehicle')}</label>
                        <select
                          className={lightSelectClass}
                          value={manualGpsVehicleId || selectedGpsVehicleId || ''}
                          onChange={(e) => setManualGpsVehicleId(e.target.value)}
                          required
                        >
                          <option value="">—</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">km/h</label>
                        <input type="text" inputMode="decimal" className={lightInputClass} value={manualSpeed} onChange={(e) => setManualSpeed(e.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Latitude</label>
                        <input type="text" inputMode="decimal" className={lightInputClass} value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="48.1173" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Longitude</label>
                        <input type="text" inputMode="decimal" className={lightInputClass} value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="-1.6778" required />
                      </div>
                    </div>
                    {manualGpsMessage && (
                      <p className={`text-xs ${manualGpsMessage === t('fleetGpsManualSaved') ? 'text-emerald-600' : 'text-red-600'}`}>
                        {manualGpsMessage}
                      </p>
                    )}
                    <ActionButton type="submit" disabled={manualGpsSaving}>
                      {t('fleetGpsManualSave')}
                    </ActionButton>
                  </form>
                )}
              </div>
            )}
          </div>
        )}


      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? t('vehiclesModalEdit') : t('vehiclesModalAdd')}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[85vh] overflow-y-auto pr-2">
          <fieldset className="border border-gray-300 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">Informations Principales</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                    <label htmlFor="nameModalVehicle" className="block text-sm font-medium text-gray-700">Nom / Descriptif</label>
                    <input type="text" name="name" id="nameModalVehicle" value={currentVehicle.name} onChange={handleInputChange} required placeholder="Ex: Minibus Bleu, Voiture DS" className={lightInputClass} />
                </div>
                <div>
                    <label htmlFor="licensePlateModal" className="block text-sm font-medium text-gray-700">Plaque d'immatriculation</label>
                    <input type="text" name="licensePlate" id="licensePlateModal" value={currentVehicle.licensePlate} onChange={handleInputChange} required className={lightInputClass} />
                </div>
                <div>
                    <label htmlFor="vehicleTypeModal" className="block text-sm font-medium text-gray-700">Type de Véhicule</label>
                    <select name="vehicleType" id="vehicleTypeModal" value={currentVehicle.vehicleType || VehicleType.AUTRE} onChange={handleInputChange} className={lightSelectClass}>
                    {(Object.values(VehicleType) as VehicleType[]).map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="seatsModal" className="block text-sm font-medium text-gray-700">Nombre de Places</label>
                    <input type="number" name="seats" id="seatsModal" value={currentVehicle.seats === undefined ? '' : currentVehicle.seats} onChange={handleInputChange} min="1" placeholder="Ex: 9" className={lightInputClass} />
                </div>
                 <div>
                    <label htmlFor="driverIdModal" className="block text-sm font-medium text-gray-700">Chauffeur Principal</label>
                    <select name="driverId" id="driverIdModal" value={currentVehicle.driverId || ''} onChange={handleInputChange} className={lightSelectClass}>
                    <option value="">Sélectionner un chauffeur...</option>
                    {staff && staff.map(s => <option key={s.id} value={s.id}>{`${s.firstName} ${s.lastName}`} ({getStaffRoleDisplayLabel(s.role)})</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="estimatedDailyCost" className="block text-sm font-medium text-gray-700">Coût Journalier Estimé (€)</label>
                    <input type="number" name="estimatedDailyCost" id="estimatedDailyCost" value={currentVehicle.estimatedDailyCost === undefined ? '' : currentVehicle.estimatedDailyCost} onChange={handleInputChange} min="0" step="0.01" placeholder="Ex: 50 (carburant, etc.)" className={lightInputClass} />
                </div>
                 <div>
                    <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">Date d'Achat</label>
                    <input type="date" name="purchaseDate" id="purchaseDate" value={(currentVehicle as Vehicle).purchaseDate || ''} onChange={handleInputChange} className={lightInputClass}/>
                </div>
            </div>
             <div className="mt-4">
                <label htmlFor="notesModalVehicle" className="block text-sm font-medium text-gray-700">Notes (capacité, type, etc.)</label>
                <textarea name="notes" id="notesModalVehicle" value={currentVehicle.notes || ''} onChange={handleInputChange} rows={2} className={lightInputClass} />
            </div>
          </fieldset>
            
           <fieldset className="border border-gray-300 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">Maintenance</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                    <label htmlFor="nextMaintenanceDate" className="block text-sm font-medium text-gray-700">Prochain Entretien Prévu</label>
                    <input type="date" name="nextMaintenanceDate" id="nextMaintenanceDate" value={(currentVehicle as Vehicle).nextMaintenanceDate || ''} onChange={handleInputChange} className={lightInputClass}/>
                </div>
            </div>
            <div className="mt-4">
                <label htmlFor="maintenanceNotes" className="block text-sm font-medium text-gray-700">Notes pour le prochain entretien</label>
                <textarea name="maintenanceNotes" id="maintenanceNotes" value={(currentVehicle as Vehicle).maintenanceNotes || ''} onChange={handleInputChange} rows={2} className={lightInputClass} />
            </div>
          </fieldset>

          <fieldset className="border border-gray-300 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">GPS / Télématique</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  id="gpsTrackingEnabled"
                  name="gpsTrackingEnabled"
                  checked={Boolean((currentVehicle as Vehicle).gpsTrackingEnabled)}
                  onChange={handleInputChange}
                  className="rounded border-gray-300"
                />
                <label htmlFor="gpsTrackingEnabled" className="text-sm text-gray-700">Activer le suivi GPS</label>
              </div>
              <div>
                <label htmlFor="gpsDeviceId" className="block text-sm font-medium text-gray-700">ID appareil (Traccar/Geotab)</label>
                <input type="text" name="gpsDeviceId" id="gpsDeviceId" value={(currentVehicle as Vehicle).gpsDeviceId || ''} onChange={handleInputChange} placeholder="IMEI ou deviceId" className={lightInputClass} />
              </div>
              <div>
                <label htmlFor="gpsSource" className="block text-sm font-medium text-gray-700">Source GPS</label>
                <select name="gpsSource" id="gpsSource" value={(currentVehicle as Vehicle).gpsSource || 'manual'} onChange={handleInputChange} className={lightSelectClass}>
                  <option value="driver_app">{t('fleetGpsSourceDriver')}</option>
                  <option value="manual">Manuel</option>
                  <option value="traccar">Traccar</option>
                  <option value="geotab">Geotab</option>
                </select>
              </div>
              <div>
                <label htmlFor="currentMileage" className="block text-sm font-medium text-gray-700">Kilométrage actuel</label>
                <input type="number" name="currentMileage" id="currentMileage" value={(currentVehicle as Vehicle).currentMileage ?? ''} onChange={handleInputChange} min="0" className={lightInputClass} />
              </div>
            </div>
            {teamId && (
              <p className="mt-3 text-xs text-gray-500">
                {t('fleetGpsWebhookHint').replace('{teamId}', teamId)}
              </p>
            )}
          </fieldset>

          <fieldset className="border border-gray-300 p-3 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">Historique de Maintenance</legend>
            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-2">
            {((currentVehicle as Vehicle).maintenanceHistory || []) && ((currentVehicle as Vehicle).maintenanceHistory || []).map((record, index) => (
                <div key={record.id} className="p-2 border border-gray-200 rounded-md grid grid-cols-12 gap-x-2 gap-y-1 items-center">
                    <div className="col-span-12 sm:col-span-3">
                        <label className="text-xs text-gray-600">Date</label>
                        <input type="date" value={record.date} onChange={(e) => handleMaintenanceRecordChange(index, 'date', e.target.value)} className={`${lightInputClass} text-xs py-1`}/>
                    </div>
                     <div className="col-span-12 sm:col-span-9">
                        <label className="text-xs text-gray-600">Description</label>
                        <input type="text" value={record.description} onChange={(e) => handleMaintenanceRecordChange(index, 'description', e.target.value)} placeholder="Description de l'intervention" className={`${lightInputClass} text-xs py-1`} />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                        <label className="text-xs text-gray-600">Coût (€)</label>
                        <input type="number" value={record.cost ?? ''} onChange={(e) => handleMaintenanceRecordChange(index, 'cost', e.target.value)} placeholder="Coût" className={`${lightInputClass} text-xs py-1`} />
                    </div>
                     <div className="col-span-6 sm:col-span-3">
                        <label className="text-xs text-gray-600">Kilométrage</label>
                        <input type="number" value={record.mileage ?? ''} onChange={(e) => handleMaintenanceRecordChange(index, 'mileage', e.target.value)} placeholder="Km" className={`${lightInputClass} text-xs py-1`} />
                    </div>
                     <div className="col-span-12 sm:col-span-5">
                        <label className="text-xs text-gray-600">Garage</label>
                        <input type="text" value={record.garage ?? ''} onChange={(e) => handleMaintenanceRecordChange(index, 'garage', e.target.value)} placeholder="Nom du garage" className={`${lightInputClass} text-xs py-1`} />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end items-end">
                        <ActionButton type="button" onClick={() => removeMaintenanceRecord(record.id)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4" />} className="!p-1.5"><span className="sr-only">Supprimer</span></ActionButton>
                    </div>
                </div>
            ))}
            </div>
            <ActionButton type="button" onClick={addMaintenanceRecord} variant="secondary" size="sm" icon={<PlusCircleIcon className="w-4 h-4" />} className="text-xs mt-3">
                Ajouter une intervention
            </ActionButton>
          </fieldset>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white py-3 -mx-4 px-4 -mb-4">
            <ActionButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</ActionButton>
            <ActionButton type="submit">{isEditing ? "Sauvegarder" : "Ajouter"}</ActionButton>
          </div>
        </form>
      </Modal>
    </SectionWrapper>
  );
};

export default VehiclesSection;