import React, { useState } from 'react';
import { StaffMember, RaceEvent, StaffRole, StaffStatus, ContractType, EventType, WorkExperience, EducationOrCertification, SpokenLanguage, LanguageProficiency, Address, AvailabilityPeriod, AvailabilityStatus, PerformanceEntry, WeeklyAvailability } from '../types';
import { EVENT_TYPE_COLORS, ALL_COUNTRIES } from '../constants';
import Modal from './Modal';
import ActionButton from './ActionButton';
import UserCircleIcon from './icons/UserCircleIcon';
import StarIcon from './icons/StarIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import EyeIcon from './icons/EyeIcon';

interface StaffViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: StaffMember | null;
  allRaceEvents: RaceEvent[];
  performanceEntries: PerformanceEntry[];
  daysAssigned: number;
}

const StaffViewModal: React.FC<StaffViewModalProps> = ({ 
  isOpen, 
  onClose, 
  staffMember, 
  allRaceEvents,
  performanceEntries,
  daysAssigned,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'career' | 'skills' | 'calendar' | 'availability' | 'admin'>('general');

  if (!staffMember) return null;

  const tabButtonStyle = (tab: string) => 
    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === tab 
        ? 'bg-blue-600 text-white' 
        : 'text-slate-300 hover:text-white hover:bg-slate-700'
    }`;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getAvailabilityStatusText = (status: AvailabilityStatus) => {
    switch (status) {
      case AvailabilityStatus.DISPONIBLE: return 'Disponible';
      case AvailabilityStatus.NON_DISPONIBLE: return 'Non disponible';
      case AvailabilityStatus.PARTIEL: return 'Partiellement disponible';
      default: return status;
    }
  };

  const getLanguageProficiencyText = (level: LanguageProficiency) => {
    switch (level) {
      case LanguageProficiency.BASIC: return 'Basique';
      case LanguageProficiency.INTERMEDIATE: return 'Intermédiaire';
      case LanguageProficiency.ADVANCED: return 'Avancé';
      case LanguageProficiency.FLUENT: return 'Courant';
      case LanguageProficiency.NATIVE: return 'Natif';
      default: return level;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${staffMember.firstName} ${staffMember.lastName}`}>
      <div className="bg-slate-800 text-white -m-6 p-4 rounded-lg">
        <div className="flex border-b border-slate-600 mb-4 overflow-x-auto">
          <button type="button" onClick={() => setActiveTab('general')} className={tabButtonStyle('general')}>Général</button>
          <button type="button" onClick={() => setActiveTab('career')} className={tabButtonStyle('career')}>Parcours</button>
          <button type="button" onClick={() => setActiveTab('skills')} className={tabButtonStyle('skills')}>Compétences</button>
          <button type="button" onClick={() => setActiveTab('calendar')} className={tabButtonStyle('calendar')}>Calendrier</button>
          <button type="button" onClick={() => setActiveTab('availability')} className={tabButtonStyle('availability')}>Disponibilités</button>
          <button type="button" onClick={() => setActiveTab('admin')} className={tabButtonStyle('admin')}>Admin</button>
        </div>

        <div className="max-h-[calc(85vh - 180px)] overflow-y-auto p-1 pr-3">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                <div className="flex flex-col items-center">
                  {staffMember.photoUrl ? (
                    <img src={staffMember.photoUrl} alt={`${staffMember.firstName}`} className="w-28 h-28 rounded-full object-cover mb-2 border-2 border-slate-500" />
                  ) : (
                    <UserCircleIcon className="w-28 h-28 text-slate-500" />
                  )}
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-700 p-3 rounded-md">
                    <div className="text-sm text-slate-400 mb-1">Prénom</div>
                    <div className="text-slate-200 font-medium">{staffMember.firstName}</div>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-md">
                    <div className="text-sm text-slate-400 mb-1">Nom</div>
                    <div className="text-slate-200 font-medium">{staffMember.lastName}</div>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-md">
                    <div className="text-sm text-slate-400 mb-1">Email</div>
                    <div className="text-slate-200 font-medium">{staffMember.email}</div>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-md">
                    <div className="text-sm text-slate-400 mb-1">Téléphone</div>
                    <div className="text-slate-200 font-medium">{staffMember.phone || '-'}</div>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-md">
                    <div className="text-sm text-slate-400 mb-1">Date de Naissance</div>
                    <div className="text-slate-200 font-medium">{formatDate(staffMember.birthDate || '')}</div>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-md">
                    <div className="text-sm text-slate-400 mb-1">Nationalité</div>
                    <div className="text-slate-200 font-medium">
                      {ALL_COUNTRIES.find(c => c.code === staffMember.nationality)?.name || staffMember.nationality || '-'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="bg-slate-700 p-4 rounded-md space-y-4">
                  <h4 className="font-semibold text-slate-200">Rôle & Contrat</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Fonction</div>
                      <div className="text-slate-200 font-medium">{staffMember.role}</div>
                      {staffMember.role === StaffRole.AUTRE && staffMember.customRole && (
                        <div className="text-xs text-slate-400 mt-1">Précisé: {staffMember.customRole}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Statut</div>
                      <div className="text-slate-200 font-medium">{staffMember.status}</div>
                    </div>
                  </div>
                  {staffMember.status === StaffStatus.VACATAIRE && (
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Taux Journalier</div>
                      <div className="text-slate-200 font-medium">{staffMember.dailyRate ? `${staffMember.dailyRate}€` : '-'}</div>
                    </div>
                  )}
                  {staffMember.status === StaffStatus.SALARIE && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Type Contrat</div>
                        <div className="text-slate-200 font-medium">{staffMember.contractType || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Salaire Mensuel Brut</div>
                        <div className="text-slate-200 font-medium">{staffMember.salary ? `${staffMember.salary}€` : '-'}</div>
                      </div>
                      {staffMember.contractType === ContractType.CDD && (
                        <div>
                          <div className="text-sm text-slate-400 mb-1">Fin de Contrat</div>
                          <div className="text-slate-200 font-medium">{formatDate(staffMember.contractEndDate || '')}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {staffMember.status === StaffStatus.VACATAIRE && (
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Profil visible pour missions externes</div>
                      <div className="text-slate-200 font-medium">{staffMember.openToExternalMissions ? 'Oui' : 'Non'}</div>
                    </div>
                  )}
                </div>
                {staffMember.address && (
                  <div className="bg-slate-700 p-4 rounded-md">
                    <h4 className="font-semibold text-slate-200 mb-3">Adresse</h4>
                    <div className="space-y-2">
                      {staffMember.address.streetName && (
                        <div className="text-slate-200">{staffMember.address.streetName}</div>
                      )}
                      <div className="text-slate-200">
                        {[staffMember.address.postalCode, staffMember.address.city].filter(Boolean).join(' ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'career' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-slate-200 mb-3">Expériences Professionnelles</h4>
                {staffMember.workHistory && staffMember.workHistory.length > 0 ? (
                  <div className="space-y-3">
                    {staffMember.workHistory.map((exp, index) => (
                      <div key={exp.id} className="bg-slate-700 p-4 rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-slate-200">{exp.position}</div>
                          <div className="text-sm text-slate-400">
                            {exp.startDate && formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : 'Présent'}
                          </div>
                        </div>
                        <div className="text-slate-300 mb-2">{exp.company}</div>
                        {exp.description && (
                          <div className="text-sm text-slate-400">{exp.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Aucune expérience professionnelle renseignée.</div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 mb-3">Éducation & Certifications</h4>
                {staffMember.education && staffMember.education.length > 0 ? (
                  <div className="space-y-3">
                    {staffMember.education.map((edu, index) => (
                      <div key={edu.id} className="bg-slate-700 p-4 rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-slate-200">{edu.degree}</div>
                          <div className="text-sm text-slate-400">
                            {edu.startDate && formatDate(edu.startDate)} - {edu.endDate ? formatDate(edu.endDate) : 'Présent'}
                          </div>
                        </div>
                        <div className="text-slate-300 mb-2">{edu.institution}</div>
                        {edu.description && (
                          <div className="text-sm text-slate-400">{edu.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Aucune formation renseignée.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-slate-200 mb-3">Compétences Techniques</h4>
                {staffMember.skills && staffMember.skills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {staffMember.skills.map((skill, index) => (
                      <div key={index} className="bg-slate-700 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200">{skill.name}</span>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon 
                                key={i} 
                                className={`w-4 h-4 ${i < skill.level ? 'text-yellow-400' : 'text-slate-600'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        {skill.description && (
                          <div className="text-sm text-slate-400 mt-1">{skill.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Aucune compétence technique renseignée.</div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 mb-3">Langues Parlées</h4>
                {staffMember.languages && staffMember.languages.length > 0 ? (
                  <div className="space-y-3">
                    {staffMember.languages.map((lang, index) => (
                      <div key={index} className="bg-slate-700 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-200">{lang.language}</span>
                          <span className="text-slate-400 text-sm">{getLanguageProficiencyText(lang.proficiency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Aucune langue renseignée.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="bg-slate-700 p-4 rounded-md">
                <h4 className="font-semibold text-slate-200 mb-3 flex items-center">
                  <CalendarDaysIcon className="w-5 h-5 mr-2" />
                  Jours de Mission: {daysAssigned}
                </h4>
                {staffMember.assignedEvents && staffMember.assignedEvents.length > 0 ? (
                  <div className="space-y-3">
                    {staffMember.assignedEvents.slice(0, 5).map((eventId) => {
                      const event = allRaceEvents.find(e => e.id === eventId);
                      if (!event) return null;
                      return (
                        <div key={eventId} className="bg-slate-600 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-slate-200">{event.name}</div>
                              <div className="text-sm text-slate-400">
                                {event.endDate && event.endDate !== event.date 
                                  ? `Du ${formatDate(event.date)} au ${formatDate(event.endDate)}`
                                  : formatDate(event.date)
                                }
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              event.type === EventType.COURSE ? 'bg-blue-100 text-blue-800' :
                              event.type === EventType.ENTRAINEMENT ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {event.type}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {staffMember.assignedEvents.length > 5 && (
                      <div className="text-sm text-slate-400 text-center">
                        +{staffMember.assignedEvents.length - 5} autres événements...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Aucun événement assigné.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-slate-200 mb-3">Disponibilité Hebdomadaire</h4>
                {staffMember.weeklyAvailability ? (
                  <div className="bg-slate-700 p-4 rounded-md overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="py-2 px-1 text-left text-slate-400 font-medium">Horaire</th>
                          <th className="py-2 px-1 text-center text-slate-400 font-medium">Lun</th>
                          <th className="py-2 px-1 text-center text-slate-400 font-medium">Mar</th>
                          <th className="py-2 px-1 text-center text-slate-400 font-medium">Mer</th>
                          <th className="py-2 px-1 text-center text-slate-400 font-medium">Jeu</th>
                          <th className="py-2 px-1 text-center text-slate-400 font-medium">Ven</th>
                          <th className="py-2 px-1 text-center text-slate-400 font-medium">Sam</th>
                          <th className="py-2 px-1 text-center text-slate-400 font-medium">Dim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Matin', 'Après-midi', 'Soir'].map(slot => {
                          const slotKey = slot === 'Matin' ? 'morning' : slot === 'Après-midi' ? 'afternoon' : 'evening';
                          return (
                            <tr key={slot} className="border-t border-slate-600">
                              <td className="py-2 px-1 font-medium text-slate-300 text-left">{slot}</td>
                              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                                const isAvailable = staffMember.weeklyAvailability?.[day]?.[slotKey] || false;
                                return (
                                  <td key={day} className="py-2 px-1 text-center">
                                    <div className={`w-4 h-4 mx-auto rounded ${isAvailable ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Aucune disponibilité hebdomadaire renseignée.</div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 mb-3">Périodes d'Indisponibilité</h4>
                {staffMember.availability && staffMember.availability.filter(p => p.status === AvailabilityStatus.NON_DISPONIBLE).length > 0 ? (
                  <div className="space-y-3">
                    {staffMember.availability
                      .filter(p => p.status === AvailabilityStatus.NON_DISPONIBLE)
                      .map(period => (
                        <div key={period.id} className="bg-slate-700 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-slate-200">
                                Du {formatDate(period.startDate)} au {formatDate(period.endDate)}
                              </div>
                              {period.notes && (
                                <div className="text-sm text-slate-400 mt-1">{period.notes}</div>
                              )}
                            </div>
                            <div className="text-xs text-red-400 font-medium">Non disponible</div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Aucune période d'indisponibilité renseignée.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-6">
              <h4 className="font-semibold text-slate-200 mb-3">Zone Admin (Manager)</h4>
              <div className="bg-slate-700 p-4 rounded-md space-y-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">UCI ID</div>
                  <div className="text-slate-200 font-medium">{staffMember.uciId || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">N° de Licence</div>
                  <div className="text-slate-200 font-medium">{staffMember.licenseNumber || '-'}</div>
                </div>
                {staffMember.licenseImageBase64 && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Image de la Licence</div>
                    <img 
                      src={`data:${staffMember.licenseImageMimeType};base64,${staffMember.licenseImageBase64}`} 
                      alt="licence" 
                      className="max-h-32 rounded border border-slate-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-700">
          <ActionButton variant="secondary" onClick={onClose}>Fermer</ActionButton>
        </div>
      </div>
    </Modal>
  );
};

export default StaffViewModal;
