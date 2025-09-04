import React, { useState } from 'react';
import { EventAccommodation, AccommodationStatus } from '../types';
import ActionButton from './ActionButton';
import PlusCircleIcon from './icons/PlusCircleIcon';

interface AccommodationDebugProps {
  eventId: string;
  eventAccommodations: EventAccommodation[];
  setEventAccommodations: React.Dispatch<React.SetStateAction<EventAccommodation[]>>;
}

const AccommodationDebug: React.FC<AccommodationDebugProps> = ({ 
  eventId, 
  eventAccommodations, 
  setEventAccommodations 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccommodation, setNewAccommodation] = useState<Omit<EventAccommodation, 'id'>>({
    eventId,
    hotelName: '',
    address: '',
    checkInDate: '',
    checkOutDate: '',
    roomType: '',
    numberOfRooms: 1,
    estimatedCost: 0,
    actualCost: undefined,
    status: AccommodationStatus.RESERVE,
    notes: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
  });

  const handleSave = () => {
    const accommodation: EventAccommodation = {
      ...newAccommodation,
      id: Date.now().toString(),
    };
    
    console.log('🏨 Tentative de sauvegarde de l\'hôtel:', accommodation);
    
    setEventAccommodations(prev => {
      console.log('📝 Anciens hôtels:', prev);
      const updated = [...prev, accommodation];
      console.log('📝 Nouveaux hôtels:', updated);
      return updated;
    });
    
    setIsModalOpen(false);
    setNewAccommodation({
      eventId,
      hotelName: '',
      address: '',
      checkInDate: '',
      checkOutDate: '',
      roomType: '',
      numberOfRooms: 1,
      estimatedCost: 0,
      actualCost: undefined,
      status: AccommodationStatus.RESERVE,
      notes: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let processedValue: any;
    if (type === 'checkbox') {
        processedValue = checked;
    } else if (type === 'number') {
        if (value === '') {
            processedValue = undefined;
        } else {
            const num = parseFloat(value);
            processedValue = isNaN(num) ? undefined : num;
        }
    } else {
        processedValue = value;
    }
    
    setNewAccommodation(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">
        🏨 Debug Hébergement - Événement: {eventId}
      </h3>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-blue-700">
          <strong>Hôtels existants:</strong> {eventAccommodations.filter(acc => acc.eventId === eventId).length}
        </p>
        <p className="text-sm text-blue-700">
          <strong>Total hôtels:</strong> {eventAccommodations.length}
        </p>
        <p className="text-sm text-blue-700">
          <strong>Setter disponible:</strong> {setEventAccommodations ? '✅ Oui' : '❌ Non'}
        </p>
      </div>

      <ActionButton 
        onClick={() => setIsModalOpen(true)}
        icon={<PlusCircleIcon className="w-4 h-4" />}
        size="sm"
      >
        Tester Ajout Hôtel
      </ActionButton>

      {/* Modal de test */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Test Ajout Hôtel</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom de l'hôtel</label>
                <input
                  type="text"
                  name="hotelName"
                  value={newAccommodation.hotelName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Nom de l'hôtel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Adresse</label>
                <input
                  type="text"
                  name="address"
                  value={newAccommodation.address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Adresse"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type de chambre</label>
                <input
                  type="text"
                  name="roomType"
                  value={newAccommodation.roomType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Type de chambre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Coût estimé</label>
                <input
                  type="number"
                  name="estimatedCost"
                  value={newAccommodation.estimatedCost}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0"
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

export default AccommodationDebug;
