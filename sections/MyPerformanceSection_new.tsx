import React, { useState, useMemo } from 'react';
import { Rider, User, PowerProfile } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import { getRiderCharacteristicSafe } from '../utils/riderUtils';
import { SPIDER_CHART_CHARACTERISTICS_CONFIG } from '../constants';

interface MyPerformanceSectionProps {
  riders: Rider[];
  currentUser: User;
}

const MyPerformanceSection: React.FC<MyPerformanceSectionProps> = ({
  riders,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ppr' | 'project'>('overview');

  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);

  const performanceStats = useMemo(() => {
    if (!riderProfile) return null;
    
    return {
      generalPerformance: getRiderCharacteristicSafe(riderProfile, 'generalPerformanceScore'),
      fatigueResistance: getRiderCharacteristicSafe(riderProfile, 'fatigueResistanceScore'),
      sprint: getRiderCharacteristicSafe(riderProfile, 'charSprint'),
      climbing: getRiderCharacteristicSafe(riderProfile, 'charClimbing'),
      rouleur: getRiderCharacteristicSafe(riderProfile, 'charRouleur'),
      puncher: getRiderCharacteristicSafe(riderProfile, 'charPuncher'),
      anaerobic: getRiderCharacteristicSafe(riderProfile, 'charAnaerobic')
    };
  }, [riderProfile]);

  const calculatedCharsData = useMemo(() => {
    if (!riderProfile) return [];
    
    return SPIDER_CHART_CHARACTERISTICS_CONFIG.map(char => ({
      label: char.label,
      value: getRiderCharacteristicSafe(riderProfile, char.key),
    }));
  }, [riderProfile]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Performance Générale</p>
              <p className="text-2xl font-bold text-gray-900">{performanceStats?.generalPerformance || 0}/100</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Résistance</p>
              <p className="text-2xl font-bold text-gray-900">{performanceStats?.fatigueResistance || 0}/100</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Sprint</p>
              <p className="text-2xl font-bold text-gray-900">{performanceStats?.sprint || 0}/100</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Grimpeur</p>
              <p className="text-2xl font-bold text-gray-900">{performanceStats?.climbing || 0}/100</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique radar des caractéristiques */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profil de Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Caractéristiques Principales</h4>
            <div className="space-y-3">
              {calculatedCharsData.map(stat => (
                <div key={stat.label} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{stat.label}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${stat.value}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Scores Globaux</h4>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Performance Générale</p>
                <p className="text-3xl font-bold text-blue-600">{performanceStats?.generalPerformance || 0}/100</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Résistance à la Fatigue</p>
                <p className="text-3xl font-bold text-green-600">{performanceStats?.fatigueResistance || 0}/100</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informations de forme */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">État Actuel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600">Forme</p>
            <p className="text-xl font-bold text-yellow-600">{riderProfile?.forme || 'N/A'}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Moral</p>
            <p className="text-xl font-bold text-blue-600">{riderProfile?.moral || 'N/A'}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Santé</p>
            <p className="text-xl font-bold text-green-600">{riderProfile?.healthCondition || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPPRTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profils de Puissance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { key: 'powerProfileFresh', label: 'Profil Frais', profile: riderProfile?.powerProfileFresh },
            { key: 'powerProfile15KJ', label: 'Profil 15kJ', profile: riderProfile?.powerProfile15KJ },
            { key: 'powerProfile30KJ', label: 'Profil 30kJ', profile: riderProfile?.powerProfile30KJ },
            { key: 'powerProfile45KJ', label: 'Profil 45kJ', profile: riderProfile?.powerProfile45KJ }
          ].map(({ key, label, profile }) => (
            <div key={key} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-3">{label}</h4>
              {profile ? (
                <div className="space-y-2">
                  {Object.entries(profile).map(([powerKey, value]) => (
                    <div key={powerKey} className="flex justify-between text-sm">
                      <span className="text-gray-600">{powerKey}:</span>
                      <span className="font-medium">{value}W</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucun profil disponible</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProjectTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Projet de Performance</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Objectifs de Performance</h4>
            <p className="text-gray-600 bg-gray-50 p-3 rounded">
              {riderProfile?.performanceGoals || "Aucun objectif défini"}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'physique', label: 'Physique', project: riderProfile?.physiquePerformanceProject },
              { key: 'technique', label: 'Technique', project: riderProfile?.techniquePerformanceProject },
              { key: 'mental', label: 'Mental', project: riderProfile?.mentalPerformanceProject },
              { key: 'environnement', label: 'Environnement', project: riderProfile?.environnementPerformanceProject },
              { key: 'tactique', label: 'Tactique', project: riderProfile?.tactiquePerformanceProject }
            ].map(({ key, label, project }) => (
              <div key={key} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">{label}</h4>
                {project ? (
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Objectif:</span> {project.objective || 'N/A'}</p>
                    <p><span className="text-gray-600">Actions:</span> {project.actions || 'N/A'}</p>
                    <p><span className="text-gray-600">Échéance:</span> {project.deadline || 'N/A'}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucun projet défini</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!riderProfile) {
    return (
      <SectionWrapper title="Mes Performances">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <ChartBarIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="Mes Performances">
      <div className="space-y-6">
        {/* Navigation par onglets */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Vue d\'ensemble' },
              { id: 'ppr', label: 'Profils de Puissance' },
              { id: 'project', label: 'Projet Performance' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu de l'onglet actif */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'ppr' && renderPPRTab()}
        {activeTab === 'project' && renderProjectTab()}
      </div>
    </SectionWrapper>
  );
};

export default MyPerformanceSection;