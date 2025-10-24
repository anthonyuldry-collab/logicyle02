import React from 'react';
import { Rider } from '../../types';

interface PerformanceProjectTabProps {
    formData: Rider | Omit<Rider, 'id'>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    formFieldsEnabled: boolean;
}

const PerformanceProjectTab: React.FC<PerformanceProjectTabProps> = ({
    formData,
    handleInputChange,
    formFieldsEnabled
}) => {
    return (
    <div className="space-y-6">
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Objectifs de Performance</h3>
        
        <div className="space-y-4">
                            <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Objectifs généraux de performance
            </label>
                                <textarea
              name="performanceGoals"
              value={formData.performanceGoals || ''}
              onChange={handleInputChange}
              disabled={!formFieldsEnabled}
                                    rows={4}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Décrivez les objectifs de performance du coureur..."
            />
          </div>
        </div>
      </div>

      {/* Facteurs de Performance */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Facteurs de Performance</h3>
        
        {/* Physique */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h4 className="text-md font-medium text-blue-400 mb-3">Physique</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Forces
              </label>
              <textarea
                name="physiquePerformanceProject.forces"
                value={formData.physiquePerformanceProject?.forces || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Points forts physiques..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À optimiser
              </label>
              <textarea
                name="physiquePerformanceProject.aOptimiser"
                value={formData.physiquePerformanceProject?.aOptimiser || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Aspects à optimiser..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À développer
              </label>
              <textarea
                name="physiquePerformanceProject.aDevelopper"
                value={formData.physiquePerformanceProject?.aDevelopper || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Compétences à développer..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Besoins d'actions
              </label>
              <textarea
                name="physiquePerformanceProject.besoinsActions"
                value={formData.physiquePerformanceProject?.besoinsActions || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Actions nécessaires..."
              />
            </div>
          </div>
        </div>

        {/* Technique */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h4 className="text-md font-medium text-green-400 mb-3">Technique</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Forces
              </label>
              <textarea
                name="techniquePerformanceProject.forces"
                value={formData.techniquePerformanceProject?.forces || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Points forts techniques..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À optimiser
              </label>
              <textarea
                name="techniquePerformanceProject.aOptimiser"
                value={formData.techniquePerformanceProject?.aOptimiser || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Aspects techniques à optimiser..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À développer
              </label>
              <textarea
                name="techniquePerformanceProject.aDevelopper"
                value={formData.techniquePerformanceProject?.aDevelopper || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Compétences techniques à développer..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Besoins d'actions
              </label>
              <textarea
                name="techniquePerformanceProject.besoinsActions"
                value={formData.techniquePerformanceProject?.besoinsActions || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Actions techniques nécessaires..."
              />
            </div>
          </div>
        </div>

        {/* Mental */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h4 className="text-md font-medium text-yellow-400 mb-3">Mental</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Forces
              </label>
              <textarea
                name="mentalPerformanceProject.forces"
                value={formData.mentalPerformanceProject?.forces || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Points forts mentaux..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À optimiser
              </label>
              <textarea
                name="mentalPerformanceProject.aOptimiser"
                value={formData.mentalPerformanceProject?.aOptimiser || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Aspects mentaux à optimiser..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À développer
              </label>
              <textarea
                name="mentalPerformanceProject.aDevelopper"
                value={formData.mentalPerformanceProject?.aDevelopper || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Compétences mentales à développer..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Besoins d'actions
              </label>
              <textarea
                name="mentalPerformanceProject.besoinsActions"
                value={formData.mentalPerformanceProject?.besoinsActions || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Actions mentales nécessaires..."
              />
            </div>
          </div>
        </div>

        {/* Environnement */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h4 className="text-md font-medium text-purple-400 mb-3">Environnement</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Forces
              </label>
              <textarea
                name="environnementPerformanceProject.forces"
                value={formData.environnementPerformanceProject?.forces || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Points forts environnementaux..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À optimiser
              </label>
              <textarea
                name="environnementPerformanceProject.aOptimiser"
                value={formData.environnementPerformanceProject?.aOptimiser || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Aspects environnementaux à optimiser..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À développer
              </label>
              <textarea
                name="environnementPerformanceProject.aDevelopper"
                value={formData.environnementPerformanceProject?.aDevelopper || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Compétences environnementales à développer..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Besoins d'actions
              </label>
              <textarea
                name="environnementPerformanceProject.besoinsActions"
                value={formData.environnementPerformanceProject?.besoinsActions || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Actions environnementales nécessaires..."
              />
            </div>
          </div>
        </div>

        {/* Tactique */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h4 className="text-md font-medium text-red-400 mb-3">Tactique</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Forces
              </label>
              <textarea
                name="tactiquePerformanceProject.forces"
                value={formData.tactiquePerformanceProject?.forces || ''}
                                    onChange={handleInputChange}
                                    disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Points forts tactiques..."
                                />
                            </div>
                            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À optimiser
              </label>
              <textarea
                name="tactiquePerformanceProject.aOptimiser"
                value={formData.tactiquePerformanceProject?.aOptimiser || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Aspects tactiques à optimiser..."
              />
                            </div>
                            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                À développer
              </label>
              <textarea
                name="tactiquePerformanceProject.aDevelopper"
                value={formData.tactiquePerformanceProject?.aDevelopper || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Compétences tactiques à développer..."
              />
                            </div>
                            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Besoins d'actions
              </label>
              <textarea
                name="tactiquePerformanceProject.besoinsActions"
                value={formData.tactiquePerformanceProject?.besoinsActions || ''}
                onChange={handleInputChange}
                disabled={!formFieldsEnabled}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Actions tactiques nécessaires..."
              />
                            </div>
                        </div>
        </div>
      </div>
        </div>
    );
};

export default PerformanceProjectTab;