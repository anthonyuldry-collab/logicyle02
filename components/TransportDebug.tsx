import React, { useState } from 'react';
import { EventTransportLeg, TransportDirection, TransportMode } from '../types';
import ActionButton from './ActionButton';
import PlusCircleIcon from './icons/PlusCircleIcon';

interface TransportDebugProps {
  eventId: string;
  eventTransportLegs: EventTransportLeg[];
  setEventTransportLegs: React.Dispatch<React.SetStateAction<EventTransportLeg[]>>;
}

const TransportDebug: React.FC<TransportDebugProps> = ({ 
  eventId, 
  eventTransportLegs, 
  setEventTransportLegs 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLeg, setNewLeg] = useState<Omit<EventTransportLeg, 'id'>>({
    eventId,
    direction: TransportDirection.ALLER,
    mode: TransportMode.MINIBUS,
    departureDate: '',
    departureTime: '',
    departureLocation: '',
    arrivalDate: '',
    arrivalTime: '',
    arrivalLocation: '',
    details: '',
    personName: '',
    isAuroreFlight: false,
    occupants: [],
    assignedVehicleId: undefined,
    driverId: undefined,
    intermediateStops: [],
  });

  const handleSave = () => {
    const leg: EventTransportLeg = {
      ...newLeg,
      id: Date.now().toString(),
    };
    
    console.log('🚀 Tentative de sauvegarde du trajet:', leg);
    
    setEventTransportLegs(prev => {
      console.log('📝 Anciens trajets:', prev);
      const updated = [...prev, leg];
      console.log('📝 Nouveaux trajets:', updated);
      return updated;
    });
    
    setIsModalOpen(false);
    setNewLeg({
      eventId,
      direction: TransportDirection.ALLER,
      mode: TransportMode.MINIBUS,
      departureDate: '',
      departureTime: '',
      departureLocation: '',
      arrivalDate: '',
      arrivalTime: '',
      arrivalLocation: '',
      details: '',
      personName: '',
      isAuroreFlight: false,
      occupants: [],
      assignedVehicleId: undefined,
      driverId: undefined,
      intermediateStops: [],
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewLeg(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
        🔧 Debug Transport - Événement: {eventId}
      </h3>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-yellow-700">
          <strong>Trajets existants:</strong> {eventTransportLegs.filter(leg => leg.eventId === eventId).length}
        </p>
        <p className="text-sm text-yellow-700">
          <strong>Total trajets:</strong> {eventTransportLegs.length}
        </p>
        <p className="text-sm text-yellow-700">
          <strong>Setter disponible:</strong> {setEventTransportLegs ? '✅ Oui' : '❌ Non'}
        </p>
      </div>

      <ActionButton 
        onClick={() => setIsModalOpen(true)}
        icon={<PlusCircleIcon className="w-4 h-4" />}
        size="sm"
      >
        Tester Ajout Trajet
      </ActionButton>

      {/* Modal de test */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Test Ajout Trajet</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Direction</label>
                <select
                  name="direction"
                  value={newLeg.direction}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={TransportDirection.ALLER}>Aller</option>
                  <option value={TransportDirection.RETOUR}>Retour</option>
                  <option value={TransportDirection.JOUR_J}>Jour J</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mode</label>
                <select
                  name="mode"
                  value={newLeg.mode}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={TransportMode.MINIBUS}>Minibus</option>
                  <option value={TransportMode.VOITURE_PERSO}>Voiture Personnelle</option>
                  <option value={TransportMode.TRAIN}>Train</option>
                  <option value={TransportMode.VOL}>Vol</option>
                  <option value={TransportMode.AUTRE}>Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lieu de départ</label>
                <input
                  type="text"
                  name="departureLocation"
                  value={newLeg.departureLocation}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Lieu de départ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lieu d'arrivée</label>
                <input
                  type="text"
                  name="arrivalLocation"
                  value={newLeg.arrivalLocation}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Lieu d'arrivée"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                Tester Sauvegarde
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportDebug;
