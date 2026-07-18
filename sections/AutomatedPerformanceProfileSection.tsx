import React, { useMemo } from 'react';
import { Rider } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import { SPIDER_CHART_CHARACTERISTICS_CONFIG } from '../constants';
import { getRiderCharacteristicSafe } from '../utils/riderUtils';
import SpiderChart from '../components/SpiderChart';

interface AutomatedPerformanceProfileSectionProps {
  rider: Rider | undefined;
}

export const AutomatedPerformanceProfileSection: React.FC<AutomatedPerformanceProfileSectionProps> = ({ rider }) => {
    if (!rider) {
        return (
            <SectionWrapper title="Profil de Performance Automatisé">
                <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
                    <p className="text-slate-300 text-center">Profil coureur introuvable pour cet utilisateur.</p>
                </div>
            </SectionWrapper>
        );
    }
    const spiderChartData = useMemo(() => {
        return SPIDER_CHART_CHARACTERISTICS_CONFIG.map(char => ({
            axis: char.label,
            value: getRiderCharacteristicSafe(rider, char.key),
        }));
    }, [rider]);

    return (
        <SectionWrapper title="Profil de Performance Automatisé">
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
                <p className="text-slate-300 text-center mb-6">
                    Ce profil est calculé automatiquement à partir de vos données de puissance (PPR).
                    Plus vos données sont complètes (y compris les profils de fatigue), plus le profil sera précis.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                        <SpiderChart
                          data={spiderChartData}
                          size={300}
                          fill="rgba(239, 169, 182, 0.4)"
                          stroke="#efa9b6"
                        />
                    </div>
                    <div className="space-y-4">
                        {spiderChartData.map(char => (
                            <div key={char.axis} className="flex flex-col">
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="font-semibold text-slate-200">{char.axis}</span>
                                    <span className="font-mono text-lg font-bold text-white">{char.value.toFixed(0)}</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2.5">
                                    <div className="bg-gradient-to-r from-pink-500 to-violet-500 h-2.5 rounded-full" style={{ width: `${char.value}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="mt-8 pt-6 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <h4 className="text-slate-400 text-sm font-medium">Note de Performance Générale</h4>
                        <p className="text-3xl font-bold text-white mt-1">{rider.generalPerformanceScore?.toFixed(0) || 'N/A'} <span className="text-lg text-slate-300">/ 100</span></p>
                        <p className="text-xs text-slate-500 mt-1">Reflète votre adéquation avec votre profil qualitatif.</p>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <h4 className="text-slate-400 text-sm font-medium">Indice de Résistance à la Fatigue</h4>
                        <p className="text-3xl font-bold text-white mt-1">{rider.fatigueResistanceScore?.toFixed(0) || 'N/A'} <span className="text-lg text-slate-300">/ 100</span></p>
                        <p className="text-xs text-slate-500 mt-1">Capacité à maintenir la puissance après un effort.</p>
                    </div>
                </div>
            </div>
        </SectionWrapper>
    );
};
