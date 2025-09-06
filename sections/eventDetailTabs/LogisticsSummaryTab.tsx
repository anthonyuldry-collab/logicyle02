import React, { useState, useMemo, useEffect } from 'react';
import { AppState, RaceEvent, TransportDirection, ChecklistItemStatus, TeamState, StaffRoleKey, EventTransportLeg, StaffRole, AppSection, PermissionLevel } from '../../types';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import UsersIcon from '../../components/icons/UsersIcon';
import UserGroupIcon from '../../components/icons/UserGroupIcon';
import TruckIcon from '../../components/icons/TruckIcon';
import BuildingOfficeIcon from '../../components/icons/BuildingOfficeIcon';
import ClockIcon from '../../components/icons/ClockIcon';
import { STAFF_ROLES_CONFIG } from '../../constants';

interface LogisticsSummaryTabProps {
  event: RaceEvent;
  appState: TeamState;
  updateEvent: (updatedEventData: Partial<RaceEvent>) => void;
  currentUser?: { userRole: string };
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
}

const SummaryCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
  <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
    <h4 className="text-md font-semibold text-gray-600 mb-2">{title}</h4>
    <div className="text-sm text-gray-800 space-y-1">{children}</div>
  </div>
);

// --- HELPER FUNCTIONS ---
const getStaffNames = (roleKey: StaffRoleKey, event: RaceEvent, appState: TeamState): string => {
    const ids = event[roleKey] || [];
    if (ids.length === 0) return 'N/A';
    return ids.map(id => {
        const staffMember = appState.staff.find(s => s.id === id);
        return staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Inconnu';
    }).join(', ');
};

const getStaffNamesForConvocation = (roleKey: StaffRoleKey, event: RaceEvent, appState: TeamState): string | null => {
    const ids = event[roleKey] || [];
    if (ids.length === 0) return null; // Retourne null au lieu de 'N/A' pour ne pas afficher la ligne
    return ids.map(id => {
        const staffMember = appState.staff.find(s => s.id === id);
        return staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Inconnu';
    }).join(', ');
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const generateIndividualConvocationText = (riderId: string, event: RaceEvent, appState: TeamState): string => {
    const rider = appState.riders.find(r => r.id === riderId);
    if (!rider) return "Erreur: Coureur non trouvé.";
    
    let text = `Objet: Convocation pour ${event.name}\n\n`;
    text += `Bonjour ${rider.firstName},\n\n`;
    text += `Tu es officiellement sélectionné(e) pour participer à l'événement suivant :\n`;
    text += `ÉVÉNEMENT : ${event.name}\n`;
    text += `DATE : Du ${formatDate(event.date)} au ${formatDate(event.endDate || event.date)}\n`;
    text += `LIEU : ${event.location}\n\n`;

    text += `ENCADREMENT\n--------------------\n`;
    text += `- Directeur(s) Sportif(s) : ${getStaffNames('directeurSportifId', event, appState)}\n`;
    text += `- Assistant(s) : ${getStaffNames('assistantId', event, appState)}\n`;
    text += `- Mécano(s) : ${getStaffNames('mecanoId', event, appState)}\n`;
    const kineNames = getStaffNamesForConvocation('kineId', event, appState);
    if (kineNames) {
        text += `- Kiné(s) : ${kineNames}\n`;
    }
    text += `\n`;
    
    const myTransportLegs = appState.eventTransportLegs.filter(leg => leg.eventId === event.id && (leg.occupants || []).some(occ => occ.id === rider.id));
    if (myTransportLegs.length > 0) {
        text += `TRANSPORT PERSONNEL\n--------------------\n`;
        myTransportLegs.forEach(leg => {
            text += `  • ${leg.direction} (${leg.mode})\n`;
            text += `    - Départ : ${formatDate(leg.departureDate)} à ${leg.departureTime} de ${leg.departureLocation}\n`;
            text += `    - Arrivée : ${formatDate(leg.arrivalDate)} à ${leg.arrivalTime} à ${leg.arrivalLocation}\n`;
            if (leg.assignedVehicleId && leg.driverId) {
                const vehicle = appState.vehicles.find(v => v.id === leg.assignedVehicleId);
                const driver = appState.staff.find(s => s.id === leg.driverId);
                if (vehicle && driver) text += `    - Véhicule : ${vehicle.name} (conduit par ${driver.firstName} ${driver.lastName})\n`;
            }
            if (leg.details) text += `    - Détails : ${leg.details}\n`;
        });
        text += `\n`;
    }

    const accommodation = appState.eventAccommodations.find(acc => acc.eventId === event.id && !acc.isStopover);
    if (accommodation) {
        text += `HÉBERGEMENT\n--------------------\n`;
        text += `- Hôtel : ${accommodation.hotelName}\n`;
        text += `- Adresse : ${accommodation.address}\n\n`;
    }


    text += `Merci de confirmer la bonne réception de cette convocation.\n\nSportivement,\nLe Staff`;
    return text;
};

const generateStaffConvocationText = (staffId: string, event: RaceEvent, appState: TeamState): string => {
    const staff = appState.staff.find(s => s.id === staffId);
    if (!staff) return "Erreur: Membre du staff non trouvé.";

    let roleInEvent = staff.role;
    for (const key in event) {
        if (key.endsWith('Id') && Array.isArray((event as any)[key]) && (event as any)[key].includes(staffId)) {
            const roleName = STAFF_ROLES_CONFIG.flatMap(g => g.roles).find(r => r.key === key)?.label.replace('(s)','');
            if(roleName) { roleInEvent = roleName as StaffRole; break; }
        }
    }

    let text = `Objet: Convocation Staff pour ${event.name}\n\n`;
    text += `Bonjour ${staff.firstName},\n\n`;
    text += `Voici ta convocation et tes missions pour l'événement suivant :\n`;
    text += `ÉVÉNEMENT : ${event.name}\n`;
    text += `RÔLE : ${roleInEvent}\n`;
    text += `DATE : Du ${formatDate(event.date)} au ${formatDate(event.endDate || event.date)}\n\n`;

    const drivingLegs = appState.eventTransportLegs.filter(leg => leg.eventId === event.id && leg.driverId === staff.id);
    if (drivingLegs.length > 0) {
        text += `VÉHICULES À CONDUIRE\n--------------------\n`;
        drivingLegs.forEach(leg => {
            const vehicle = appState.vehicles.find(v => v.id === leg.assignedVehicleId);
            text += `  • Véhicule : ${vehicle?.name || 'N/A'} (${leg.direction})\n`;
            text += `    - Trajet : De ${leg.departureLocation} à ${leg.arrivalLocation}\n`;
            text += `    - Horaire : Départ le ${formatDate(leg.departureDate)} à ${leg.departureTime}, Arrivée le ${formatDate(leg.arrivalDate)} à ${leg.arrivalTime}\n`;
            const occupants = (leg.occupants || []).map(o => { const p = o.type === 'rider' ? appState.riders.find(r=>r.id===o.id) : appState.staff.find(s=>s.id===o.id); return p ? `${p.firstName} ${p.lastName}` : '' }).join(', ');
            text += `    - Passagers : ${occupants || 'Aucun'}\n`;
        });
        text += `\n`;
    }
    
    const myTransportLegs = appState.eventTransportLegs.filter(leg => leg.eventId === event.id && (leg.occupants || []).some(occ => occ.id === staff.id) && leg.driverId !== staff.id);
    if (myTransportLegs.length > 0) {
        text += `MES TRAJETS (PASSAGER)\n--------------------\n`;
        myTransportLegs.forEach(leg => {
            text += `  • ${leg.direction} (${leg.mode})\n`;
            text += `    - Départ : ${formatDate(leg.departureDate)} à ${leg.departureTime} de ${leg.departureLocation}\n`;
            text += `    - Arrivée : ${formatDate(leg.arrivalDate)} à ${leg.arrivalTime} à ${leg.arrivalLocation}\n`;
        });
        text += `\n`;
    }
    
    // Common sections
    const accommodation = appState.eventAccommodations.find(acc => acc.eventId === event.id && !acc.isStopover);
    if (accommodation) { text += `HÉBERGEMENT\n--------------------\n- Hôtel : ${accommodation.hotelName}\n- Adresse : ${accommodation.address}\n\n`; }


    text += `Merci de confirmer ta présence.\n\nLe Manager`;
    return text;
};

const generateGeneralConvocationText = (event: RaceEvent, appState: TeamState): string => {
    let text = `Objet: Convocation Générale - ${event.name}\n\n`;
    text += `ÉVÉNEMENT : ${event.name}\n`;
    text += `DATE : Du ${formatDate(event.date)} au ${formatDate(event.endDate || event.date)}\n\n`;

    text += `PARTICIPANTS\n--------------------\n`;
    appState.riders.filter(r => (event.selectedRiderIds || []).includes(r.id)).forEach(r => {
        text += `- ${r.firstName} ${r.lastName}\n`;
    });
    text += `\n`;

    text += `ENCADREMENT\n--------------------\n`;
    text += `- Directeur(s) Sportif(s) : ${getStaffNames('directeurSportifId', event, appState)}\n`;
    text += `- Assistant(s) : ${getStaffNames('assistantId', event, appState)}\n`;
    text += `- Mécano(s) : ${getStaffNames('mecanoId', event, appState)}\n`;
    const kineNames = getStaffNamesForConvocation('kineId', event, appState);
    if (kineNames) {
        text += `- Kiné(s) : ${kineNames}\n`;
    }
    text += `\n`;
    
    // Filtrer les transports (exclure le jour J) et les grouper par direction
    const allTransportLegs = appState.eventTransportLegs.filter(leg => 
        leg.eventId === event.id && leg.direction !== 'Transport Jour J'
    );
    
    if (allTransportLegs.length > 0) {
        text += `PLAN DE TRANSPORT\n--------------------\n`;
        
        // Grouper d'abord tous les allers
        const allerLegs = allTransportLegs.filter(leg => leg.direction === 'Aller');
        if (allerLegs.length > 0) {
            text += `ALLER\n`;
            allerLegs.forEach(leg => {
                text += `  • ${leg.personName} (${leg.mode})\n`;
                const occupants = (leg.occupants || []).map(o => {
                    const p = o.type === 'rider' ? appState.riders.find(r=>r.id===o.id) : appState.staff.find(s=>s.id===o.id);
                    return p ? `${p.firstName[0]}.${p.lastName}` : '';
                }).join(', ');
                if(occupants) text += `    - Passagers: ${occupants}\n`;
                if (leg.assignedVehicleId && leg.driverId) {
                    const vehicle = appState.vehicles.find(v => v.id === leg.assignedVehicleId);
                    const driver = appState.staff.find(s => s.id === leg.driverId);
                    if (vehicle && driver) text += `    - Véhicule: ${vehicle.name} (conduit par ${driver.firstName} ${driver.lastName})\n`;
                }
            });
            text += `\n`;
        }
        
        // Puis tous les retours
        const retourLegs = allTransportLegs.filter(leg => leg.direction === 'Retour');
        if (retourLegs.length > 0) {
            text += `RETOUR\n`;
            retourLegs.forEach(leg => {
                text += `  • ${leg.personName} (${leg.mode})\n`;
                const occupants = (leg.occupants || []).map(o => {
                    const p = o.type === 'rider' ? appState.riders.find(r=>r.id===o.id) : appState.staff.find(s=>s.id===o.id);
                    return p ? `${p.firstName[0]}.${p.lastName}` : '';
                }).join(', ');
                if(occupants) text += `    - Passagers: ${occupants}\n`;
                if (leg.assignedVehicleId && leg.driverId) {
                    const vehicle = appState.vehicles.find(v => v.id === leg.assignedVehicleId);
                    const driver = appState.staff.find(s => s.id === leg.driverId);
                    if (vehicle && driver) text += `    - Véhicule: ${vehicle.name} (conduit par ${driver.firstName} ${driver.lastName})\n`;
                }
            });
            text += `\n`;
        }
    }

    const accommodation = appState.eventAccommodations.find(acc => acc.eventId === event.id && !acc.isStopover);
    if (accommodation) {
        text += `HÉBERGEMENT\n--------------------\n`;
        text += `- Hôtel : ${accommodation.hotelName}\n`;
        text += `- Adresse : ${accommodation.address}\n\n`;
    }
    
    return text;
};

// --- VISUAL PREVIEW COMPONENT ---

const ConvocationPreview: React.FC<{
    mode: 'athlete' | 'staff' | 'general';
    participantId: string | null;
    event: RaceEvent;
    appState: TeamState;
}> = ({ mode, participantId, event, appState }) => {
    
    const participant = mode === 'athlete' ? appState.riders.find(r => r.id === participantId) : (mode === 'staff' ? appState.staff.find(s => s.id === participantId) : null);
    const allRiders = appState.riders.filter(r => (event.selectedRiderIds || []).includes(r.id));
    const myTransportLegs = participant ? appState.eventTransportLegs.filter(leg => leg.eventId === event.id && leg.occupants.some(occ => occ.id === participant.id) && leg.driverId !== participant.id) : [];
    const drivingLegs = (mode === 'staff' && participant) ? appState.eventTransportLegs.filter(leg => leg.eventId === event.id && leg.driverId === participant.id) : [];
    const allTransportLegs = appState.eventTransportLegs.filter(leg => 
        leg.eventId === event.id && leg.direction !== 'Transport Jour J'
    );
    const accommodation = appState.eventAccommodations.find(acc => acc.eventId === event.id && !acc.isStopover);

    const Section: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
        <div className="mb-4">
            <h3 className="text-sm font-bold uppercase text-gray-500 border-b-2 border-gray-200 pb-1 mb-2 flex items-center">
                <Icon className="w-4 h-4 mr-2" />
                {title}
            </h3>
            <div className="text-sm text-gray-700">{children}</div>
        </div>
    );

    return (
        <div className="p-4 bg-gray-50 border rounded-lg max-h-[60vh] overflow-y-auto font-sans">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-1">{event.name}</h2>
            <p className="text-sm text-gray-500 text-center mb-4">{`Du ${formatDate(event.date)} au ${formatDate(event.endDate || event.date)}`}</p>

            {mode !== 'general' && participant && <p className="mb-4">Bonjour {participant.firstName}, voici les détails de ta convocation :</p>}

            {mode === 'general' && (
                <Section title="Participants" icon={UsersIcon}>
                    <ul className="list-disc list-inside columns-2">
                        {allRiders.map(r => <li key={r.id}>{r.firstName} {r.lastName}</li>)}
                    </ul>
                </Section>
            )}

            <Section title="Encadrement" icon={UserGroupIcon}>
                <p><strong>Directeur(s) Sportif(s):</strong> {getStaffNames('directeurSportifId', event, appState)}</p>
                <p><strong>Assistant(s):</strong> {getStaffNames('assistantId', event, appState)}</p>
                <p><strong>Mécano(s):</strong> {getStaffNames('mecanoId', event, appState)}</p>
                {getStaffNamesForConvocation('kineId', event, appState) && (
                    <p><strong>Kiné(s):</strong> {getStaffNamesForConvocation('kineId', event, appState)}</p>
                )}
            </Section>

            {drivingLegs.length > 0 && (
                <Section title="Véhicules à Conduire" icon={TruckIcon}>
                    <div className="space-y-3">{drivingLegs.map(leg => (
                         <div key={leg.id} className="p-2 border rounded bg-yellow-50">
                             <p className="font-semibold">{appState.vehicles.find(v=>v.id===leg.assignedVehicleId)?.name} ({leg.direction})</p>
                             <p className="text-xs text-gray-600"><strong>Occupants:</strong> {(leg.occupants || []).map(o => { const p = o.type === 'rider' ? appState.riders.find(r=>r.id===o.id) : appState.staff.find(s=>s.id===o.id); return p ? `${p.firstName[0]}.${p.lastName}` : '' }).join(', ')}</p>
                         </div>
                    ))}</div>
                </Section>
            )}

            <Section title={mode === 'staff' ? 'Mes Trajets Personnels' : 'Transport'} icon={TruckIcon}>
                {(mode === 'general' ? allTransportLegs : myTransportLegs).length > 0 ? (
                    <div className="space-y-3">
                        {mode === 'general' ? (
                            <>
                                {/* Grouper d'abord tous les allers */}
                                {allTransportLegs.filter(leg => leg.direction === 'Aller').length > 0 && (
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-gray-800 mb-2">ALLER</h4>
                                        {allTransportLegs.filter(leg => leg.direction === 'Aller').map(leg => (
                                            <div key={leg.id} className="p-2 border rounded bg-white mb-2">
                                                <p className="font-semibold">{leg.personName} ({leg.mode})</p>
                                                <p><strong>Départ:</strong> {leg.departureTime} de {leg.departureLocation}</p>
                                                <p><strong>Arrivée:</strong> {leg.arrivalTime} à {leg.arrivalLocation}</p>
                                                {leg.assignedVehicleId && leg.driverId && (
                                                    <p className="text-xs text-gray-600"><strong>Véhicule:</strong> {appState.vehicles.find(v=>v.id===leg.assignedVehicleId)?.name} (conduit par {appState.staff.find(s=>s.id===leg.driverId)?.firstName})</p>
                                                )}
                                                <p className="text-xs text-gray-600"><strong>Occupants:</strong> {(leg.occupants || []).map(o => { const p = o.type === 'rider' ? appState.riders.find(r=>r.id===o.id) : appState.staff.find(s=>s.id===o.id); return p ? `${p.firstName[0]}.${p.lastName}` : '' }).join(', ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Puis tous les retours */}
                                {allTransportLegs.filter(leg => leg.direction === 'Retour').length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-800 mb-2">RETOUR</h4>
                                        {allTransportLegs.filter(leg => leg.direction === 'Retour').map(leg => (
                                            <div key={leg.id} className="p-2 border rounded bg-white mb-2">
                                                <p className="font-semibold">{leg.personName} ({leg.mode})</p>
                                                <p><strong>Départ:</strong> {leg.departureTime} de {leg.departureLocation}</p>
                                                <p><strong>Arrivée:</strong> {leg.arrivalTime} à {leg.arrivalLocation}</p>
                                                {leg.assignedVehicleId && leg.driverId && (
                                                    <p className="text-xs text-gray-600"><strong>Véhicule:</strong> {appState.vehicles.find(v=>v.id===leg.assignedVehicleId)?.name} (conduit par {appState.staff.find(s=>s.id===leg.driverId)?.firstName})</p>
                                                )}
                                                <p className="text-xs text-gray-600"><strong>Occupants:</strong> {(leg.occupants || []).map(o => { const p = o.type === 'rider' ? appState.riders.find(r=>r.id===o.id) : appState.staff.find(s=>s.id===o.id); return p ? `${p.firstName[0]}.${p.lastName}` : '' }).join(', ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Affichage normal pour les autres modes */
                            myTransportLegs.map(leg => (
                                <div key={leg.id} className="p-2 border rounded bg-white">
                                    <p className="font-semibold">{leg.direction} ({leg.mode})</p>
                                    <p><strong>Départ:</strong> {formatDate(leg.departureDate)} à {leg.departureTime} de {leg.departureLocation}</p>
                                    <p><strong>Arrivée:</strong> {formatDate(leg.arrivalDate)} à {leg.arrivalTime} à {leg.arrivalLocation}</p>
                                    {leg.assignedVehicleId && leg.driverId && (
                                        <p className="text-xs text-gray-600"><strong>Véhicule:</strong> {appState.vehicles.find(v=>v.id===leg.assignedVehicleId)?.name} (conduit par {appState.staff.find(s=>s.id===leg.driverId)?.firstName})</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                ) : <p className="italic">Aucun transport planifié.</p>}
            </Section>

            {accommodation && (
                <Section title="Hébergement" icon={BuildingOfficeIcon}>
                    <p><strong>Hôtel:</strong> {accommodation.hotelName}</p>
                    <p><strong>Adresse:</strong> {accommodation.address}</p>
                </Section>
            )}

        </div>
    );
};


const LogisticsSummaryTab: React.FC<LogisticsSummaryTabProps> = ({ event, appState, updateEvent, currentUser, effectivePermissions }) => {
  const [notes, setNotes] = useState(event.logisticsSummaryNotes || '');
  const [isConvocationModalOpen, setIsConvocationModalOpen] = useState(false);
  
  const [convocationMode, setConvocationMode] = useState<'athlete' | 'staff' | 'general'>('athlete');
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const [copySuccess, setCopySuccess] = useState('');

  // Vérification des permissions pour l'accès aux informations financières
  const canViewFinancialInfo = effectivePermissions?.financial?.includes('view') || false;
  const isRider = currentUser?.userRole === 'Coureur';

  const selectedRidersForEvent = useMemo(() => {
    return appState.riders.filter(r => (event.selectedRiderIds || []).includes(r.id));
  }, [appState.riders, event.selectedRiderIds]);

  const selectedStaffForEvent = useMemo(() => {
    return appState.staff.filter(s => (event.selectedStaffIds || []).includes(s.id));
  }, [appState.staff, event.selectedStaffIds]);

  useEffect(() => {
    if (isConvocationModalOpen) {
        if (convocationMode === 'athlete' && !selectedRiderId && selectedRidersForEvent.length > 0) {
            setSelectedRiderId(selectedRidersForEvent[0].id);
        }
        if (convocationMode === 'staff' && !selectedStaffId && selectedStaffForEvent.length > 0) {
            setSelectedStaffId(selectedStaffForEvent[0].id);
        }
    }
  }, [isConvocationModalOpen, convocationMode, selectedRidersForEvent, selectedStaffForEvent, selectedRiderId, selectedStaffId]);


  const accommodationSummary = useMemo(() => {
    const acco = appState.eventAccommodations.find(a => a.eventId === event.id);
    if (!acco) return <p className="italic text-gray-500">Aucun hébergement défini.</p>;
    return (
      <>
        <p><strong>Hôtel:</strong> {acco.hotelName || 'N/A'}</p>
        <p><strong>Adresse:</strong> {acco.address || 'N/A'}</p>
        <p><strong>Statut:</strong> {acco.status}</p>
      </>
    );
  }, [appState.eventAccommodations, event.id]);

  const transportSummary = useMemo(() => {
    const legs = appState.eventTransportLegs.filter(t => t.eventId === event.id);
    const allerCount = legs.filter(l => l.direction === TransportDirection.ALLER).length;
    const retourCount = legs.filter(l => l.direction === TransportDirection.RETOUR).length;
    if (legs.length === 0) return <p className="italic text-gray-500">Aucun transport défini.</p>;
    return (
      <>
        <p><strong>Trajets Aller:</strong> {allerCount}</p>
        <p><strong>Trajets Retour:</strong> {retourCount}</p>
        <p><strong>Total Trajets:</strong> {legs.length}</p>
      </>
    );
  }, [appState.eventTransportLegs, event.id]);

  const budgetSummary = useMemo(() => {
    const items = appState.eventBudgetItems.filter(b => b.eventId === event.id);
    if (items.length === 0) return <p className="italic text-gray-500">Aucun budget défini.</p>;
    const estimated = items.reduce((sum, item) => sum + item.estimatedCost, 0);
    const actual = items.reduce((sum, item) => sum + (item.actualCost || 0), 0);
    const balance = estimated - actual;

    return (
      <>
        <p><strong>Coût Estimé:</strong> {estimated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
        <p><strong>Coût Réel:</strong> {actual.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
        <p className={`font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <strong>Solde:</strong> {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </p>
      </>
    );
  }, [appState.eventBudgetItems, event.id]);

  const checklistSummary = useMemo(() => {
    const items = appState.eventChecklistItems.filter(c => c.eventId === event.id);
    if (items.length === 0) return <p className="italic text-gray-500">Aucune checklist définie.</p>;
    const completed = items.filter(i => i.status === ChecklistItemStatus.FAIT).length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <>
        <p><strong>Tâches Complétées:</strong> {completed} / {total}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
        <p className="text-right font-bold">{percentage}%</p>
      </>
    );
  }, [appState.eventChecklistItems, event.id]);
  
  const handleSaveNotes = () => {
    updateEvent({ logisticsSummaryNotes: notes });
    alert('Notes de synthèse sauvegardées !');
  };

  const handleCopyToClipboard = () => {
    let textToCopy = '';
    if (convocationMode === 'athlete' && selectedRiderId) {
        textToCopy = generateIndividualConvocationText(selectedRiderId, event, appState);
    } else if (convocationMode === 'staff' && selectedStaffId) {
        textToCopy = generateStaffConvocationText(selectedStaffId, event, appState);
    } else if (convocationMode === 'general') {
        textToCopy = generateGeneralConvocationText(event, appState);
    }
    
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopySuccess('Copié !');
        setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
        setCopySuccess('Erreur de copie.');
    });
  };


  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 md:grid-cols-2 ${canViewFinancialInfo ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <SummaryCard title="Hébergement">{accommodationSummary}</SummaryCard>
        <SummaryCard title="Transport">{transportSummary}</SummaryCard>
        {canViewFinancialInfo && <SummaryCard title="Budget">{budgetSummary}</SummaryCard>}
        <SummaryCard title="Checklist">{checklistSummary}</SummaryCard>
      </div>
      <div>
        <h4 className="text-md font-semibold text-gray-600 mb-2">Notes de Synthèse Logistique</h4>
        <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ajoutez des notes générales sur la logistique de cet événement..."
        />
      </div>
       <div className="mt-6 pt-6 border-t">
            <h4 className="text-md font-semibold text-gray-600 mb-2">Actions</h4>
            <div className="flex space-x-2">
                <ActionButton onClick={handleSaveNotes}>Sauvegarder les Notes</ActionButton>
                <ActionButton onClick={() => setIsConvocationModalOpen(true)} variant="secondary">Générer Convocation</ActionButton>
            </div>
      </div>
      
      <Modal isOpen={isConvocationModalOpen} onClose={() => setIsConvocationModalOpen(false)} title="Générer une Convocation">
        <div className="bg-slate-800 text-white -m-6 p-4 rounded-lg">
            <div className="space-y-4">
                <div className="flex border-b border-slate-600">
                    <button onClick={() => setConvocationMode('athlete')} className={`w-1/3 py-2 text-sm font-medium text-center border-b-2 transition-colors ${convocationMode === 'athlete' ? 'border-blue-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Individuelle (Athlète)</button>
                    <button onClick={() => setConvocationMode('staff')} className={`w-1/3 py-2 text-sm font-medium text-center border-b-2 transition-colors ${convocationMode === 'staff' ? 'border-blue-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Individuelle (Staff)</button>
                    <button onClick={() => setConvocationMode('general')} className={`w-1/3 py-2 text-sm font-medium text-center border-b-2 transition-colors ${convocationMode === 'general' ? 'border-blue-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Générale (Équipe)</button>
                </div>
                
                {convocationMode === 'athlete' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Générer pour :</label>
                        <select value={selectedRiderId || ''} onChange={(e) => setSelectedRiderId(e.target.value)} className="input-field-sm w-full">
                            {selectedRidersForEvent.map(r => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
                        </select>
                    </div>
                )}
                {convocationMode === 'staff' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Générer pour :</label>
                        <select value={selectedStaffId || ''} onChange={(e) => setSelectedStaffId(e.target.value)} className="input-field-sm w-full">
                            {selectedStaffForEvent.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                        </select>
                    </div>
                )}
                
                <ConvocationPreview 
                    mode={convocationMode}
                    participantId={convocationMode === 'athlete' ? selectedRiderId : selectedStaffId}
                    event={event}
                    appState={appState}
                />

                <div className="flex justify-end items-center space-x-4">
                    {copySuccess && <span className="text-sm text-green-400 font-semibold">{copySuccess}</span>}
                    <ActionButton onClick={handleCopyToClipboard}>Copier le texte</ActionButton>
                </div>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default LogisticsSummaryTab;
