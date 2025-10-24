import React from 'react';
import { Rider } from '../../types';

interface InterviewTabProps {
  formData: Rider | Omit<Rider, 'id'>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  formFieldsEnabled: boolean;
}

const InterviewTab: React.FC<InterviewTabProps> = ({
  formData,
  handleInputChange,
  formFieldsEnabled
}) => {
  return (
    <div className="space-y-6">
      {/* Motivation et Objectifs */}
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Motivation et Objectifs</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pourquoi fait-il du vélo ?
            </label>
            <textarea
              name="cyclingMotivation"
              value={formData.cyclingMotivation || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
              rows={4}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Décrivez la motivation du coureur pour le cyclisme..."
            />
          </div>
        </div>
      </div>

      {/* Objectifs Temporels */}
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Objectifs par Période</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Objectifs à court terme (saison suivante)
            </label>
            <textarea
              name="shortTermGoals"
              value={formData.shortTermGoals || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
              rows={3}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Objectifs pour la saison suivante..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Objectifs à moyen terme (2-3 ans)
            </label>
            <textarea
              name="mediumTermGoals"
              value={formData.mediumTermGoals || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
              rows={3}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Objectifs pour les 2-3 prochaines années..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Objectifs à long terme (5+ ans)
            </label>
            <textarea
              name="longTermGoals"
              value={formData.longTermGoals || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
              rows={3}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Objectifs à long terme (5+ ans)..."
            />
          </div>
        </div>
      </div>

      {/* Aspirations de Carrière */}
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Aspirations de Carrière</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Aspirations de carrière
            </label>
            <textarea
              name="careerAspirations"
              value={formData.careerAspirations || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
              rows={4}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Décrivez les aspirations de carrière du coureur..."
            />
          </div>
        </div>
      </div>

      {/* Valeurs et Personnalité */}
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Valeurs et Personnalité</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Valeurs personnelles
            </label>
            <textarea
              name="personalValues"
              value={formData.personalValues || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
              rows={4}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Quelles sont les valeurs importantes pour ce coureur ?"
            />
          </div>
        </div>
      </div>

      {/* Défis et Soutien */}
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Défis et Besoins de Soutien</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Défis rencontrés
            </label>
            <textarea
              name="challengesFaced"
              value={formData.challengesFaced || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
              rows={4}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Quels défis le coureur rencontre-t-il ?"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Besoins de soutien
            </label>
            <textarea
              name="supportNeeds"
              value={formData.supportNeeds || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
              rows={4}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="De quel type de soutien le coureur a-t-il besoin ?"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewTab;
