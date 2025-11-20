
import React, { useState } from 'react';
import { Rider, PowerProfile, PowerProfileHistoryEntry } from '../../types';

interface PowerPPRTabProps {
    formData: Rider | Omit<Rider, 'id'>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    formFieldsEnabled: boolean;
    powerDurationsConfig: { key: keyof PowerProfile; label: string; unit: string; sortable: boolean; }[];
    theme?: 'light' | 'dark';
    profileReliabilityLevel?: number;
    onDeleteProfile?: (profileKey: 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ') => void;
}

const PowerPPRTab: React.FC<PowerPPRTabProps> = ({
    formData,
    handleInputChange,
    formFieldsEnabled,
    powerDurationsConfig,
    theme = 'dark',
    profileReliabilityLevel = 1,
    onDeleteProfile
}) => {
    const inputClasses = theme === 'light'
        ? "block w-full px-2 py-1 border rounded-md shadow-sm sm:text-sm bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
        : "input-field-sm";
        
    const containerClasses = theme === 'light'
        ? "bg-gray-50 p-3 rounded-md border"
        : "bg-slate-700 p-2 rounded-md";
        
    const titleClasses = theme === 'light'
        ? "text-md font-semibold text-gray-800 mb-2"
        : "text-sm font-semibold uppercase text-slate-300 mb-1.5";
        
    const labelClasses = theme === 'light'
        ? "block text-sm font-medium text-gray-700"
        : "block text-[10px] font-medium text-slate-300";
        
    const noteLabelClasses = theme === 'light'
        ? "block text-sm font-medium text-gray-700 mt-2"
        : "block text-[10px] font-medium text-slate-300";
        
    const noteTextClasses = theme === 'light'
        ? "text-xs text-gray-500 mt-1 italic"
        : "text-xs text-slate-400 mt-1 italic";

    const renderPowerProfileSectionInputs = (
        profileKey: keyof Pick<Rider, 'powerProfileFresh' | 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ'>, 
        profileNoteFieldName: keyof Pick<Rider, 'profilePRR' | 'profile15KJ' | 'profile30KJ' | 'profile45KJ'>, 
        title: string,
        dataToUse: Rider | Omit<Rider, 'id'> = formData
    ) => {
        const profileData = dataToUse[profileKey];
        const noteValue = dataToUse[profileNoteFieldName] || '';
        const isDeletable = profileKey !== 'powerProfileFresh' && onDeleteProfile && !showAllTimePPR;
        const hasData = profileData && Object.values(profileData).some(val => val && val > 0);
        const isEditable = formFieldsEnabled && !showAllTimePPR;

        const handleDeleteProfile = () => {
            if (isDeletable && onDeleteProfile && window.confirm(`Êtes-vous sûr de vouloir supprimer toutes les données du profil ${title} ? Cette action ne peut pas être annulée.`)) {
                onDeleteProfile(profileKey as 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ');
            }
        };

        return (
            <div className={`${containerClasses} mb-2`}>
                <div className="flex justify-between items-center mb-2">
                    <h5 className={titleClasses}>{title}</h5>
                    {isDeletable && hasData && isEditable && (
                        <button
                            type="button"
                            onClick={handleDeleteProfile}
                            className={`px-2 py-1 text-xs rounded ${
                                theme === 'light' 
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300' 
                                    : 'bg-red-900 text-red-300 hover:bg-red-800 border border-red-700'
                            } transition-colors`}
                            title={`Supprimer toutes les données du profil ${title}`}
                        >
                            🗑️ Supprimer
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2 text-xs">
                    {powerDurationsConfig.map(pdc => (
                        <div key={pdc.key} className="flex flex-col">
                            <label htmlFor={`${profileKey}.${pdc.key}`} className={labelClasses}>{pdc.label} ({pdc.unit})</label>
                            <input
                                type="number"
                                step="any"
                                name={`${profileKey}.${pdc.key}`}
                                id={`${profileKey}.${pdc.key}`}
                                value={profileData?.[pdc.key] ?? ''}
                                onChange={handleInputChange}
                                className={inputClasses}
                                disabled={!isEditable}
                            />
                        </div>
                    ))}
                </div>
                {isEditable ? (
                    <div className="mt-2">
                    <label htmlFor={profileNoteFieldName} className={noteLabelClasses}>Note pour {title}:</label>
                    <textarea
                        id={profileNoteFieldName}
                        name={profileNoteFieldName}
                        value={noteValue}
                        onChange={handleInputChange}
                        rows={1}
                        className={`${inputClasses} w-full text-xs`}
                        disabled={!isEditable}
                    />
                    </div>
                ) : (
                    noteValue && <p className={noteTextClasses}>Note: {noteValue}</p>
                )
                }
            </div>
        );
    };
    
    const getDropColorClass = (dropPercentage?: number): string => {
        if (dropPercentage === undefined || dropPercentage >= -2) {
            return theme === 'light' ? 'text-gray-800' : 'text-slate-200';
        }
        const absDrop = Math.abs(dropPercentage);
        if (absDrop <= 10) return 'text-yellow-500 font-semibold';
        if (absDrop <= 20) return 'text-orange-500 font-semibold';
        return 'text-red-500 font-semibold';
    };

    // État pour gérer les sous-onglets
    const [activeSubTab, setActiveSubTab] = useState<'ppr' | 'history' | 'summary'>('ppr');
    
    // État pour gérer l'affichage de l'historique
    const [showHistory, setShowHistory] = useState(false);
    const [historyView, setHistoryView] = useState<'table' | 'comparison' | 'season-n1'>('table');
    const [selectedDuration, setSelectedDuration] = useState<keyof PowerProfile | 'all'>('all');
    const [maxEntries, setMaxEntries] = useState<number>(10);
    
    // Filtres par période
    const [filterType, setFilterType] = useState<'all' | 'season' | 'dates'>('all');
    const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    // Pour la comparaison : sélection de deux périodes
    const [comparisonType, setComparisonType] = useState<'sequential' | 'periods'>('sequential');
    const [period1Season, setPeriod1Season] = useState<number | 'all'>('all');
    const [period2Season, setPeriod2Season] = useState<number | 'all'>('all');
    const [period1StartDate, setPeriod1StartDate] = useState<string>('');
    const [period1EndDate, setPeriod1EndDate] = useState<string>('');
    const [period2StartDate, setPeriod2StartDate] = useState<string>('');
    const [period2EndDate, setPeriod2EndDate] = useState<string>('');
    
    // Pour la comparaison N-1 : sélection de périodes personnalisées
    const [seasonN1ComparisonType, setSeasonN1ComparisonType] = useState<'n1' | 'custom'>('n1');
    const [seasonN1Period1Month, setSeasonN1Period1Month] = useState<string>('');
    const [seasonN1Period1Year, setSeasonN1Period1Year] = useState<number | 'all'>('all');
    const [seasonN1Period2Month, setSeasonN1Period2Month] = useState<string>('');
    const [seasonN1Period2Year, setSeasonN1Period2Year] = useState<number | 'all'>('all');
    
    const history = formData.powerProfileHistory?.entries || [];
    const hasHistory = history.length > 0;
    
    // Fonction pour obtenir la saison actuelle (année du 1er novembre)
    const getCurrentSeasonYear = (): number => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        // Si on est après le 1er novembre, la saison actuelle est l'année en cours
        // Sinon, la saison actuelle est l'année précédente
        return currentMonth >= 11 ? currentYear : currentYear - 1;
    };
    
    // Extraire les années uniques de l'historique
    const historySeasons = Array.from(new Set(
        history.map(entry => {
            try {
                return new Date(entry.date).getFullYear();
            } catch {
                return null;
            }
        }).filter((year): year is number => year !== null)
    )).sort((a, b) => b - a); // Plus récent en premier
    
    // Ajouter la saison actuelle si elle n'est pas déjà dans l'historique
    const currentSeasonYear = getCurrentSeasonYear();
    const availableSeasons = Array.from(new Set([
        currentSeasonYear,
        ...historySeasons
    ])).sort((a, b) => b - a); // Plus récent en premier
    
    // Fonction pour obtenir l'année d'une date
    const getYearFromDate = (dateString: string): number | null => {
        try {
            return new Date(dateString).getFullYear();
        } catch {
            return null;
        }
    };
    
    // Fonction pour filtrer l'historique selon les critères
    const getFilteredHistory = (): PowerProfileHistoryEntry[] => {
        let filtered = [...history];
        
        // Filtrer par type de filtre
        if (filterType === 'season' && selectedSeason !== 'all') {
            filtered = filtered.filter(entry => getYearFromDate(entry.date) === selectedSeason);
        } else if (filterType === 'dates') {
            if (startDate) {
                filtered = filtered.filter(entry => entry.date >= startDate);
            }
            if (endDate) {
                filtered = filtered.filter(entry => entry.date <= endDate);
            }
        }
        
        // Limiter le nombre d'entrées
        return filtered.slice(0, maxEntries);
    };
    
    const filteredHistory = getFilteredHistory();
    
    // Pour la comparaison : obtenir les entrées des deux périodes
    const getComparisonPeriods = (): { period1: PowerProfileHistoryEntry[], period2: PowerProfileHistoryEntry[] } => {
        if (comparisonType === 'sequential') {
            // Comparaison séquentielle : plus ancienne vs plus récente dans l'historique filtré
            const filtered = getFilteredHistory();
            if (filtered.length < 2) {
                return { period1: [], period2: [] };
            }
            const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return {
                period1: [sorted[0]], // Plus ancienne
                period2: [sorted[sorted.length - 1]] // Plus récente
            };
        } else {
            // Comparaison entre deux périodes spécifiques
            let period1: PowerProfileHistoryEntry[] = [];
            let period2: PowerProfileHistoryEntry[] = [];
            
            // Période 1
            if (period1Season !== 'all') {
                period1 = history.filter(entry => getYearFromDate(entry.date) === period1Season);
            } else if (period1StartDate || period1EndDate) {
                period1 = history.filter(entry => {
                    if (period1StartDate && entry.date < period1StartDate) return false;
                    if (period1EndDate && entry.date > period1EndDate) return false;
                    return true;
                });
            }
            
            // Période 2
            if (period2Season !== 'all') {
                period2 = history.filter(entry => getYearFromDate(entry.date) === period2Season);
            } else if (period2StartDate || period2EndDate) {
                period2 = history.filter(entry => {
                    if (period2StartDate && entry.date < period2StartDate) return false;
                    if (period2EndDate && entry.date > period2EndDate) return false;
                    return true;
                });
            }
            
            // Prendre les entrées les plus représentatives de chaque période
            if (period1.length > 0) {
                const sorted1 = period1.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                period1 = [sorted1[Math.floor(sorted1.length / 2)]]; // Entrée médiane
            }
            if (period2.length > 0) {
                const sorted2 = period2.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                period2 = [sorted2[Math.floor(sorted2.length / 2)]]; // Entrée médiane
            }
            
            return { period1, period2 };
        }
    };

    // Fonction pour formater la date
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch {
            return dateString;
        }
    };

    // Fonction pour calculer la variation en pourcentage
    const calculateVariation = (oldValue?: number, newValue?: number, weight?: number): string => {
        if (!oldValue || !newValue || !weight) return '-';
        const oldWkg = oldValue / weight;
        const newWkg = newValue / weight;
        const variation = ((newWkg - oldWkg) / oldWkg) * 100;
        const sign = variation >= 0 ? '+' : '';
        return `${sign}${variation.toFixed(1)}%`;
    };

    // Fonction pour obtenir la couleur de la variation
    const getVariationColor = (variation: string): string => {
        if (variation === '-') return theme === 'light' ? 'text-gray-500' : 'text-slate-400';
        const num = parseFloat(variation.replace('%', '').replace('+', ''));
        if (num > 0) return 'text-green-500 font-semibold';
        if (num < 0) return 'text-red-500 font-semibold';
        return theme === 'light' ? 'text-gray-600' : 'text-slate-300';
    };

    // Fonction pour calculer la progression entre deux entrées
    const calculateProgression = (entry1: PowerProfileHistoryEntry, entry2: PowerProfileHistoryEntry, duration: keyof PowerProfile): number | null => {
        const val1 = entry1.powerProfileFresh?.[duration];
        const val2 = entry2.powerProfileFresh?.[duration];
        const weight1 = entry1.weightKg;
        const weight2 = entry2.weightKg;
        
        if (!val1 || !val2 || !weight1 || !weight2) return null;
        
        const wkg1 = val1 / weight1;
        const wkg2 = val2 / weight2;
        
        if (wkg1 === 0) return null;
        return ((wkg2 - wkg1) / wkg1) * 100;
    };

    // Fonction pour obtenir les données d'évolution pour un graphique simple
    const getEvolutionData = (duration: keyof PowerProfile) => {
        const filtered = getFilteredHistory();
        const data = filtered.map((entry, index) => {
            const val = entry.powerProfileFresh?.[duration];
            const weight = entry.weightKg || formData.weightKg;
            const wkg = val && weight ? val / weight : null;
            return {
                date: entry.date,
                value: wkg,
                label: formatDate(entry.date)
            };
        }).filter(d => d.value !== null);
        
        // Ajouter la valeur actuelle seulement si on veut voir l'évolution complète
        const currentVal = formData.powerProfileFresh?.[duration];
        const currentWeight = formData.weightKg;
        if (currentVal && currentWeight && filterType === 'all') {
            data.push({
                date: new Date().toISOString(),
                value: currentVal / currentWeight,
                label: 'Actuel'
            });
        }
        
        // Trier par date (plus ancien en premier pour le graphique)
        return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    // Fonction pour obtenir le min/max pour l'échelle du graphique
    const getMinMax = (data: { value: number | null }[]) => {
        const values = data.map(d => d.value).filter((v): v is number => v !== null);
        if (values.length === 0) return { min: 0, max: 10 };
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1;
        return { min: Math.max(0, min - padding), max: max + padding };
    };

    // Fonction pour obtenir les entrées d'une période spécifique (mois/année)
    const getEntriesForPeriod = (month: string, year: number | 'all'): PowerProfileHistoryEntry[] => {
        if (!month || year === 'all') return [];
        
        const monthNum = parseInt(month);
        if (isNaN(monthNum)) return [];
        
        return history.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === monthNum;
        });
    };

    // Fonction pour obtenir l'entrée représentative d'une période
    const getRepresentativeEntry = (entries: PowerProfileHistoryEntry[]): PowerProfileHistoryEntry | null => {
        if (entries.length === 0) return null;
        if (entries.length === 1) return entries[0];
        
        // Prendre l'entrée médiane pour avoir une valeur représentative
        const sorted = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return sorted[Math.floor(sorted.length / 2)];
    };

    // Fonction pour obtenir les données de comparaison (N-1 ou périodes personnalisées)
    const getComparisonData = (): { 
        period1Entry: PowerProfileHistoryEntry | null; 
        period2Entry: PowerProfileHistoryEntry | null;
        period1Label: string;
        period2Label: string;
        currentSeason: number | null;
    } => {
        if (seasonN1ComparisonType === 'n1') {
            // Mode N-1 : comparer avec la saison précédente
            const currentYear = new Date().getFullYear();
            const currentSeasonEntries = history.filter(entry => getYearFromDate(entry.date) === currentYear);
            
            let currentSeason: number | null = null;
            if (currentSeasonEntries.length > 0) {
                currentSeason = currentYear;
            } else if (availableSeasons.length > 0) {
                currentSeason = availableSeasons[0];
            }
            
            // Période 2 : valeurs actuelles (null = on utilisera les valeurs actuelles)
            const period2Entry: PowerProfileHistoryEntry | null = null;
            const period2Label = currentSeason ? `Saison ${currentSeason} (Actuel)` : 'Actuel';
            
            // Période 1 : saison N-1
            let period1Entry: PowerProfileHistoryEntry | null = null;
            let period1Label = 'N/A';
            
            if (currentSeason !== null) {
                const targetYear = currentSeason - 1;
                const targetEntries = history.filter(entry => getYearFromDate(entry.date) === targetYear);
                if (targetEntries.length > 0) {
                    period1Entry = getRepresentativeEntry(targetEntries);
                    period1Label = `Saison ${targetYear}`;
                }
            }
            
            return { period1Entry, period2Entry, period1Label, period2Label, currentSeason };
        } else {
            // Mode personnalisé : comparer deux périodes spécifiques
            const period1Entries = getEntriesForPeriod(seasonN1Period1Month, seasonN1Period1Year);
            const period2Entries = getEntriesForPeriod(seasonN1Period2Month, seasonN1Period2Year);
            
            const period1Entry = getRepresentativeEntry(period1Entries);
            const period2Entry = getRepresentativeEntry(period2Entries);
            
            const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
            const period1Label = seasonN1Period1Month && seasonN1Period1Year !== 'all' 
                ? `${monthNames[parseInt(seasonN1Period1Month)]} ${seasonN1Period1Year}`
                : 'Période 1';
            const period2Label = seasonN1Period2Month && seasonN1Period2Year !== 'all'
                ? `${monthNames[parseInt(seasonN1Period2Month)]} ${seasonN1Period2Year}`
                : 'Période 2';
            
            return { period1Entry, period2Entry, period1Label, period2Label, currentSeason: null };
        }
    };

    // Structure des filières énergétiques selon le tableau
    interface EnergySystem {
        name: string;
        durations: {
            key: keyof PowerProfile;
            label: string;
        }[];
    }

    const energySystems: EnergySystem[] = [
        {
            name: 'PUISSANCE NEUROMUSCULAIRE (Phosphagènes)',
            durations: [
                { key: 'power5s', label: '5 sec' }
            ]
        },
        {
            name: 'CAPACITÉ ANAÉROBIE (Glycolyse rapide)',
            durations: [
                { key: 'power30s', label: '30 sec' },
                { key: 'power1min', label: '1 min' }
            ]
        },
        {
            name: 'PUISSANCE MAXIMALE AÉROBIE (VO2Max)',
            durations: [
                { key: 'power3min', label: '3 min' },
                { key: 'power5min', label: '5 min' }
            ]
        },
        {
            name: 'ENDURANCE DE PUISSANCE (Seuil)',
            durations: [
                { key: 'power12min', label: '12 min' },
                { key: 'power20min', label: '20 min' }
            ]
        }
    ];

    // Fonction pour calculer la variation avec indicateur visuel
    const getVariationIndicator = (variation: number): { symbol: string; label: string; color: string } => {
        if (variation >= 10) {
            return { symbol: '↑↑', label: 'Forte Hausse', color: 'text-green-500' };
        } else if (variation >= 3) {
            return { symbol: '↑', label: 'Hausse', color: 'text-green-400' };
        } else if (variation <= -3) {
            return { symbol: '↓', label: 'Baisse', color: 'text-red-400' };
        } else {
            return { symbol: '=', label: 'Stable', color: 'text-yellow-500' };
        }
    };

    // Fonction pour obtenir la meilleure valeur entre deux valeurs
    const getBetterPowerValue = (val1?: number, val2?: number): number | undefined => {
        if (!val1 && !val2) return undefined;
        if (!val1) return val2;
        if (!val2) return val1;
        return Math.max(val1, val2);
    };

    // Fonction pour combiner deux PowerProfile en prenant les meilleures valeurs
    const combinePowerProfiles = (profile1?: PowerProfile, profile2?: PowerProfile): PowerProfile | undefined => {
        if (!profile1 && !profile2) return undefined;
        if (!profile1) return profile2 ? { ...profile2 } : undefined;
        if (!profile2) return profile1 ? { ...profile1 } : undefined;
        
        return {
            power1s: getBetterPowerValue(profile1.power1s, profile2.power1s),
            power5s: getBetterPowerValue(profile1.power5s, profile2.power5s),
            power30s: getBetterPowerValue(profile1.power30s, profile2.power30s),
            power1min: getBetterPowerValue(profile1.power1min, profile2.power1min),
            power3min: getBetterPowerValue(profile1.power3min, profile2.power3min),
            power5min: getBetterPowerValue(profile1.power5min, profile2.power5min),
            power12min: getBetterPowerValue(profile1.power12min, profile2.power12min),
            power20min: getBetterPowerValue(profile1.power20min, profile2.power20min),
            criticalPower: getBetterPowerValue(profile1.criticalPower, profile2.criticalPower),
            power45min: getBetterPowerValue(profile1.power45min, profile2.power45min),
        };
    };

    // Fonction pour obtenir les PPR d'une saison spécifique depuis l'historique
    const getSeasonPPRFromHistory = (year: number): {
        powerProfileFresh?: PowerProfile;
        powerProfile15KJ?: PowerProfile;
        powerProfile30KJ?: PowerProfile;
        powerProfile45KJ?: PowerProfile;
        weightKg?: number;
        date?: string;
    } | null => {
        const seasonEntries = history.filter(entry => {
            const entryYear = getYearFromDate(entry.date);
            return entryYear === year;
        });
        
        if (seasonEntries.length === 0) return null;
        
        // Prendre l'entrée médiane de la saison pour avoir une valeur représentative
        const sorted = seasonEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const representativeEntry = sorted[Math.floor(sorted.length / 2)];
        
        return {
            powerProfileFresh: representativeEntry.powerProfileFresh,
            powerProfile15KJ: representativeEntry.powerProfile15KJ,
            powerProfile30KJ: representativeEntry.powerProfile30KJ,
            powerProfile45KJ: representativeEntry.powerProfile45KJ,
            weightKg: representativeEntry.weightKg,
            date: representativeEntry.date,
        };
    };

    // État pour afficher le PPR all-time ou saison
    const [showAllTimePPR, setShowAllTimePPR] = useState(false);
    const [selectedSeasonYear, setSelectedSeasonYear] = useState<number | 'current' | 'all-time'>('current');
    
    // Obtenir les PPR à afficher selon le mode sélectionné
    let displayPowerProfileFresh: PowerProfile | undefined;
    let displayPowerProfile15KJ: PowerProfile | undefined;
    let displayPowerProfile30KJ: PowerProfile | undefined;
    let displayPowerProfile45KJ: PowerProfile | undefined;
    let displaySeasonLabel = '';
    
    if (showAllTimePPR) {
        // Mode All-time : combiner automatiquement le PPR all-time stocké avec le PPR de la saison en cours
        displayPowerProfileFresh = combinePowerProfiles(
            formData.powerProfileAllTime?.powerProfileFresh,
            formData.powerProfileFresh
        );
        displayPowerProfile15KJ = combinePowerProfiles(
            formData.powerProfileAllTime?.powerProfile15KJ,
            formData.powerProfile15KJ
        );
        displayPowerProfile30KJ = combinePowerProfiles(
            formData.powerProfileAllTime?.powerProfile30KJ,
            formData.powerProfile30KJ
        );
        displayPowerProfile45KJ = combinePowerProfiles(
            formData.powerProfileAllTime?.powerProfile45KJ,
            formData.powerProfile45KJ
        );
        displaySeasonLabel = 'All-time (incluant saison en cours)';
    } else if (selectedSeasonYear === 'current') {
        // Mode Saison en cours
        displayPowerProfileFresh = formData.powerProfileFresh;
        displayPowerProfile15KJ = formData.powerProfile15KJ;
        displayPowerProfile30KJ = formData.powerProfile30KJ;
        displayPowerProfile45KJ = formData.powerProfile45KJ;
        displaySeasonLabel = 'Saison en cours';
    } else if (selectedSeasonYear === 'all-time') {
        // Mode All-time uniquement (sans saison en cours)
        displayPowerProfileFresh = formData.powerProfileAllTime?.powerProfileFresh;
        displayPowerProfile15KJ = formData.powerProfileAllTime?.powerProfile15KJ;
        displayPowerProfile30KJ = formData.powerProfileAllTime?.powerProfile30KJ;
        displayPowerProfile45KJ = formData.powerProfileAllTime?.powerProfile45KJ;
        displaySeasonLabel = 'All-time (sans saison en cours)';
    } else {
        // Mode Saison précédente depuis l'historique
        const seasonPPR = getSeasonPPRFromHistory(selectedSeasonYear);
        if (seasonPPR) {
            displayPowerProfileFresh = seasonPPR.powerProfileFresh;
            displayPowerProfile15KJ = seasonPPR.powerProfile15KJ;
            displayPowerProfile30KJ = seasonPPR.powerProfile30KJ;
            displayPowerProfile45KJ = seasonPPR.powerProfile45KJ;
            displaySeasonLabel = `Saison ${selectedSeasonYear}`;
        } else {
            displayPowerProfileFresh = formData.powerProfileFresh;
            displayPowerProfile15KJ = formData.powerProfile15KJ;
            displayPowerProfile30KJ = formData.powerProfile30KJ;
            displayPowerProfile45KJ = formData.powerProfile45KJ;
            displaySeasonLabel = 'Saison en cours';
        }
    }
    
    // Créer un objet formData temporaire pour l'affichage
    const displayFormData = {
        ...formData,
        powerProfileFresh: displayPowerProfileFresh,
        powerProfile15KJ: displayPowerProfile15KJ,
        powerProfile30KJ: displayPowerProfile30KJ,
        powerProfile45KJ: displayPowerProfile45KJ,
    };

    return (
        <div className="space-y-4">
            {/* Sous-onglets PPR / Historique / Bilan */}
            <div className={`${containerClasses} p-2`}>
                <div className="flex gap-2 border-b border-gray-300 dark:border-slate-600">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('ppr')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                            activeSubTab === 'ppr'
                                ? theme === 'light'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-blue-400 text-blue-400'
                                : theme === 'light'
                                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500'
                        }`}
                    >
                        📊 PPR
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('history')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                            activeSubTab === 'history'
                                ? theme === 'light'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-blue-400 text-blue-400'
                                : theme === 'light'
                                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500'
                        }`}
                    >
                        📈 Historique
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('summary')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                            activeSubTab === 'summary'
                                ? theme === 'light'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-blue-400 text-blue-400'
                                : theme === 'light'
                                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-500'
                        }`}
                    >
                        📋 Bilan
                    </button>
                </div>
            </div>

            {/* Contenu de l'onglet PPR */}
            {activeSubTab === 'ppr' && (
                <div className="space-y-4">
                    {/* Sélecteur PPR Saison / All-time */}
                    <div className={`${containerClasses} p-3`}>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <label className={`${titleClasses} mb-0`}>Type de PPR à afficher :</label>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => {
                                setShowAllTimePPR(false);
                                setSelectedSeasonYear('current');
                            }}
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                                !showAllTimePPR && selectedSeasonYear === 'current'
                                    ? theme === 'light'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-blue-600 text-white'
                                    : theme === 'light'
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            📅 Saison en cours
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowAllTimePPR(true);
                                setSelectedSeasonYear('all-time');
                            }}
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                                showAllTimePPR && selectedSeasonYear === 'all-time'
                                    ? theme === 'light'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-blue-600 text-white'
                                    : theme === 'light'
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            ⭐ All-time (incluant saison en cours)
                        </button>
                    </div>
                </div>
                
                {/* Sélecteur de saison précédente */}
                {availableSeasons.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-slate-600">
                        <label className={`block text-xs font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                            Consulter une saison précédente :
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {availableSeasons.map(year => (
                                <button
                                    key={year}
                                    type="button"
                                    onClick={() => {
                                        setShowAllTimePPR(false);
                                        setSelectedSeasonYear(year);
                                    }}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${
                                        !showAllTimePPR && selectedSeasonYear === year
                                            ? theme === 'light'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-green-600 text-white'
                                            : theme === 'light'
                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                                >
                                    📆 {year}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className={`text-xs mt-2 ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                    {showAllTimePPR ? (
                        <>
                            <strong>PPR All-time :</strong> Meilleures valeurs jamais atteintes par l'athlète, incluant automatiquement les valeurs de la saison en cours.
                            {formData.powerProfileAllTime?.lastUpdated && (
                                <> Dernière mise à jour : {new Date(formData.powerProfileAllTime.lastUpdated).toLocaleDateString('fr-FR')}</>
                            )}
                        </>
                    ) : selectedSeasonYear === 'current' ? (
                        <>
                            <strong>PPR Saison en cours :</strong> Valeurs de la saison actuelle (réinitialisé chaque 1er novembre).
                            {formData.currentSeasonStartDate && (
                                <> Saison commencée le {new Date(formData.currentSeasonStartDate).toLocaleDateString('fr-FR')}</>
                            )}
                        </>
                    ) : typeof selectedSeasonYear === 'number' ? (
                        <>
                            <strong>PPR Saison {selectedSeasonYear} :</strong> Valeurs de la saison {selectedSeasonYear} depuis l'historique.
                        </>
                    ) : null}
                </div>
            </div>
            
            {/* Affichage des étoiles de fiabilité */}
            <div className={`${containerClasses} p-3`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className={`${titleClasses} mb-0`}>Fiabilité du profil de puissance :</span>
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4].map((level) => (
                                <svg
                                    key={level}
                                    className={`w-5 h-5 ${
                                        level <= profileReliabilityLevel
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-slate-500'
                                    }`}
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                    </div>
                    <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                        {profileReliabilityLevel === 1 && "Profil basique"}
                        {profileReliabilityLevel === 2 && "Profil 15kJ"}
                        {profileReliabilityLevel === 3 && "Profil 30kJ"}
                        {profileReliabilityLevel === 4 && "Profil complet"}
                    </div>
                </div>
                <div className={`mt-2 text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                    {profileReliabilityLevel === 1 && "Seules les informations de base sont disponibles"}
                    {profileReliabilityLevel === 2 && "Données de puissance 15kJ disponibles"}
                    {profileReliabilityLevel === 3 && "Données de puissance 30kJ disponibles"}
                    {profileReliabilityLevel === 4 && "Profil de performance complet avec données 45kJ"}
                </div>
            </div>
            
            <div className="space-y-4">
                {/* Première ligne : Frais et 15kJ côte à côte */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderPowerProfileSectionInputs('powerProfileFresh', 'profilePRR', 'Profil - Frais', displayFormData)}
                    {renderPowerProfileSectionInputs('powerProfile15KJ', 'profile15KJ', 'Profil - 15 kJ/kg', displayFormData)}
                </div>

                {/* Deuxième ligne : 30kJ et 45kJ côte à côte */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderPowerProfileSectionInputs('powerProfile30KJ', 'profile30KJ', 'Profil - 30 kJ/kg', displayFormData)}
                    {renderPowerProfileSectionInputs('powerProfile45KJ', 'profile45KJ', 'Profil - 45 kJ/kg', displayFormData)}
                </div>

                {/* Tableau de synthèse des pertes en dessous */}
                <div className={containerClasses}>
                     <h5 className={`${titleClasses} text-center`}>Analyse de Fatigue - Synthèse des Pertes</h5>
                     <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className={theme === 'light' ? "bg-gray-200 text-gray-600" : "bg-slate-600 text-slate-300"}>
                                <tr>
                                    <th className="p-1.5 text-left">Métrique</th>
                                    <th className="p-1.5 text-right">Frais (W/kg)</th>
                                    <th className="p-1.5 text-right">15kJ (W/kg)</th>
                                    <th className="p-1.5 text-right">Δ% (15kJ)</th>
                                    <th className="p-1.5 text-right">30kJ (W/kg)</th>
                                    <th className="p-1.5 text-right">Δ% (30kJ)</th>
                                    <th className="p-1.5 text-right">45kJ (W/kg)</th>
                                    <th className="p-1.5 text-right">Δ% (45kJ)</th>
                                </tr>
                            </thead>
                            <tbody>
                            {powerDurationsConfig.map(pdc => {
                                const freshVal = displayFormData.powerProfileFresh?.[pdc.key];
                                const kj15Val = displayFormData.powerProfile15KJ?.[pdc.key];
                                const kj30Val = displayFormData.powerProfile30KJ?.[pdc.key];
                                const kj45Val = displayFormData.powerProfile45KJ?.[pdc.key];
                                const weight = displayFormData.weightKg;

                                const freshWkg = (freshVal && weight) ? freshVal / weight : undefined;
                                const kj15Wkg = (kj15Val && weight) ? kj15Val / weight : undefined;
                                const kj30Wkg = (kj30Val && weight) ? kj30Val / weight : undefined;
                                const kj45Wkg = (kj45Val && weight) ? kj45Val / weight : undefined;

                                const drop15 = (freshWkg && kj15Wkg) ? ((kj15Wkg - freshWkg) / freshWkg) * 100 : undefined;
                                const drop30 = (freshWkg && kj30Wkg) ? ((kj30Wkg - freshWkg) / freshWkg) * 100 : undefined;
                                const drop45 = (freshWkg && kj45Wkg) ? ((kj45Wkg - freshWkg) / freshWkg) * 100 : undefined;

                                const kj15Color = getDropColorClass(drop15);
                                const kj30Color = getDropColorClass(drop30);
                                const kj45Color = getDropColorClass(drop45);

                                return (
                                    <tr key={pdc.key} className={`border-b ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                        <td className={`p-1.5 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>{pdc.label}</td>
                                        <td className={`p-1.5 text-right font-medium ${theme === 'light' ? 'text-gray-800' : 'text-slate-200'}`}>{freshWkg?.toFixed(1) ?? '-'}</td>
                                        
                                        <td className={`p-1.5 text-right ${kj15Color}`}>{kj15Wkg?.toFixed(1) ?? '-'}</td>
                                        <td className={`p-1.5 text-right ${kj15Color}`}>{drop15?.toFixed(0) ?? '-'}%</td>
                                        
                                        <td className={`p-1.5 text-right ${kj30Color}`}>{kj30Wkg?.toFixed(1) ?? '-'}</td>
                                        <td className={`p-1.5 text-right ${kj30Color}`}>{drop30?.toFixed(0) ?? '-'}%</td>
                                        
                                        <td className={`p-1.5 text-right ${kj45Color}`}>{kj45Wkg?.toFixed(1) ?? '-'}</td>
                                        <td className={`p-1.5 text-right ${kj45Color}`}>{drop45?.toFixed(0) ?? '-'}%</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                     </div>
                </div>
           </div>

                </div>
            )}

            {/* Contenu de l'onglet Historique */}
            {activeSubTab === 'history' && (
                <div className="space-y-4">
                    {hasHistory ? (
                        <div className={containerClasses}>
                            <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                                <h5 className={titleClasses}>Historique des valeurs de puissance</h5>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setShowHistory(!showHistory)}
                                        className={`px-3 py-1 text-xs rounded transition-colors ${
                                            theme === 'light'
                                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                                                : 'bg-blue-900 text-blue-300 hover:bg-blue-800 border border-blue-700'
                                        }`}
                                    >
                                        {showHistory ? 'Masquer' : 'Afficher'} ({history.length} entrée{history.length > 1 ? 's' : ''})
                                    </button>
                                </div>
                            </div>
                    
                    {showHistory && (
                        <div className="space-y-4">
                            {/* Filtres et contrôles */}
                            <div className={`${theme === 'light' ? 'bg-white' : 'bg-slate-800'} p-3 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                <div className="space-y-3">
                                    {/* Première ligne : Vue et métrique */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Sélection de la vue */}
                                        <div>
                                            <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                Vue
                                            </label>
                                            <div className="flex gap-1 flex-wrap">
                                                {(['table', 'comparison', 'season-n1'] as const).map(view => (
                                                    <button
                                                        key={view}
                                                        type="button"
                                                        onClick={() => setHistoryView(view)}
                                                        className={`px-2 py-1 text-xs rounded transition-colors ${
                                                            historyView === view
                                                                ? theme === 'light'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : 'bg-blue-600 text-white'
                                                                : theme === 'light'
                                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        {view === 'table' && '📊 Tableau'}
                                                        {view === 'comparison' && '⚖️ Comparaison'}
                                                        {view === 'season-n1' && '📅 Comparaison N-1'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                    </div>

                                    {/* Deuxième ligne : Filtres par période */}
                                    {historyView === 'table' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Type de filtre */}
                                            <div>
                                                <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                    Filtrer par période
                                                </label>
                                                <select
                                                    value={filterType}
                                                    onChange={(e) => {
                                                        setFilterType(e.target.value as 'all' | 'season' | 'dates');
                                                        if (e.target.value === 'all') {
                                                            setSelectedSeason('all');
                                                            setStartDate('');
                                                            setEndDate('');
                                                        }
                                                    }}
                                                    className={`w-full px-2 py-1 text-xs rounded ${
                                                        theme === 'light'
                                                            ? 'bg-white border-gray-300 text-gray-900'
                                                            : 'bg-slate-700 border-slate-600 text-slate-300'
                                                    } border`}
                                                >
                                                    <option value="all">Toutes les périodes</option>
                                                    <option value="season">Par saison</option>
                                                    <option value="dates">Par dates</option>
                                                </select>
                                            </div>

                                            {/* Filtre par saison */}
                                            {filterType === 'season' && (
                                                <div>
                                                    <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                        Saison
                                                    </label>
                                                    <select
                                                        value={selectedSeason}
                                                        onChange={(e) => setSelectedSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                                        className={`w-full px-2 py-1 text-xs rounded ${
                                                            theme === 'light'
                                                                ? 'bg-white border-gray-300 text-gray-900'
                                                                : 'bg-slate-700 border-slate-600 text-slate-300'
                                                        } border`}
                                                    >
                                                        <option value="all">Toutes les saisons</option>
                                                        {availableSeasons.map(year => (
                                                            <option key={year} value={year}>{year}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Filtre par dates */}
                                            {filterType === 'dates' && (
                                                <>
                                                    <div>
                                                        <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                            Date début
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={startDate}
                                                            onChange={(e) => setStartDate(e.target.value)}
                                                            className={`w-full px-2 py-1 text-xs rounded ${
                                                                theme === 'light'
                                                                    ? 'bg-white border-gray-300 text-gray-900'
                                                                    : 'bg-slate-700 border-slate-600 text-slate-300'
                                                            } border`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                            Date fin
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={endDate}
                                                            onChange={(e) => setEndDate(e.target.value)}
                                                            className={`w-full px-2 py-1 text-xs rounded ${
                                                                theme === 'light'
                                                                    ? 'bg-white border-gray-300 text-gray-900'
                                                                    : 'bg-slate-700 border-slate-600 text-slate-300'
                                                            } border`}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {/* Nombre d'entrées */}
                                            {filterType === 'all' && (
                                                <div>
                                                    <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                        Nombre d'entrées
                                                    </label>
                                                    <select
                                                        value={maxEntries}
                                                        onChange={(e) => setMaxEntries(Number(e.target.value))}
                                                        className={`w-full px-2 py-1 text-xs rounded ${
                                                            theme === 'light'
                                                                ? 'bg-white border-gray-300 text-gray-900'
                                                                : 'bg-slate-700 border-slate-600 text-slate-300'
                                                        } border`}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                        <option value={history.length}>Toutes ({history.length})</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Filtres pour la comparaison */}
                                    {historyView === 'comparison' && (
                                        <div className="space-y-3">
                                            {/* Type de comparaison */}
                                            <div>
                                                <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                    Type de comparaison
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setComparisonType('sequential')}
                                                        className={`px-3 py-1 text-xs rounded transition-colors ${
                                                            comparisonType === 'sequential'
                                                                ? theme === 'light'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : 'bg-blue-600 text-white'
                                                                : theme === 'light'
                                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        Séquentielle (ancien vs récent)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setComparisonType('periods')}
                                                        className={`px-3 py-1 text-xs rounded transition-colors ${
                                                            comparisonType === 'periods'
                                                                ? theme === 'light'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : 'bg-blue-600 text-white'
                                                                : theme === 'light'
                                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        Entre deux périodes
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Comparaison entre deux périodes */}
                                            {comparisonType === 'periods' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Période 1 */}
                                                    <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-3 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                        <h6 className={`text-xs font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                            Période 1
                                                        </h6>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <label className={`block text-[10px] font-medium mb-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                    Par saison
                                                                </label>
                                                                <select
                                                                    value={period1Season}
                                                                    onChange={(e) => {
                                                                        setPeriod1Season(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                                                        if (e.target.value !== 'all') {
                                                                            setPeriod1StartDate('');
                                                                            setPeriod1EndDate('');
                                                                        }
                                                                    }}
                                                                    className={`w-full px-2 py-1 text-xs rounded ${
                                                                        theme === 'light'
                                                                            ? 'bg-white border-gray-300 text-gray-900'
                                                                            : 'bg-slate-600 border-slate-500 text-slate-300'
                                                                    } border`}
                                                                >
                                                                    <option value="all">Sélectionner une saison</option>
                                                                    {availableSeasons.map(year => (
                                                                        <option key={year} value={year}>{year}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className={`text-[10px] text-center ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>OU</div>
                                                            <div>
                                                                <label className={`block text-[10px] font-medium mb-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Date début
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={period1StartDate}
                                                                    onChange={(e) => {
                                                                        setPeriod1StartDate(e.target.value);
                                                                        if (e.target.value) setPeriod1Season('all');
                                                                    }}
                                                                    className={`w-full px-2 py-1 text-xs rounded ${
                                                                        theme === 'light'
                                                                            ? 'bg-white border-gray-300 text-gray-900'
                                                                            : 'bg-slate-600 border-slate-500 text-slate-300'
                                                                    } border`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className={`block text-[10px] font-medium mb-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Date fin
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={period1EndDate}
                                                                    onChange={(e) => {
                                                                        setPeriod1EndDate(e.target.value);
                                                                        if (e.target.value) setPeriod1Season('all');
                                                                    }}
                                                                    className={`w-full px-2 py-1 text-xs rounded ${
                                                                        theme === 'light'
                                                                            ? 'bg-white border-gray-300 text-gray-900'
                                                                            : 'bg-slate-600 border-slate-500 text-slate-300'
                                                                    } border`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Période 2 */}
                                                    <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-3 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                        <h6 className={`text-xs font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                            Période 2
                                                        </h6>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <label className={`block text-[10px] font-medium mb-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Par saison
                                                                </label>
                                                                <select
                                                                    value={period2Season}
                                                                    onChange={(e) => {
                                                                        setPeriod2Season(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                                                        if (e.target.value !== 'all') {
                                                                            setPeriod2StartDate('');
                                                                            setPeriod2EndDate('');
                                                                        }
                                                                    }}
                                                                    className={`w-full px-2 py-1 text-xs rounded ${
                                                                        theme === 'light'
                                                                            ? 'bg-white border-gray-300 text-gray-900'
                                                                            : 'bg-slate-600 border-slate-500 text-slate-300'
                                                                    } border`}
                                                                >
                                                                    <option value="all">Sélectionner une saison</option>
                                                                    {availableSeasons.map(year => (
                                                                        <option key={year} value={year}>{year}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className={`text-[10px] text-center ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>OU</div>
                                                            <div>
                                                                <label className={`block text-[10px] font-medium mb-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Date début
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={period2StartDate}
                                                                    onChange={(e) => {
                                                                        setPeriod2StartDate(e.target.value);
                                                                        if (e.target.value) setPeriod2Season('all');
                                                                    }}
                                                                    className={`w-full px-2 py-1 text-xs rounded ${
                                                                        theme === 'light'
                                                                            ? 'bg-white border-gray-300 text-gray-900'
                                                                            : 'bg-slate-600 border-slate-500 text-slate-300'
                                                                    } border`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className={`block text-[10px] font-medium mb-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Date fin
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={period2EndDate}
                                                                    onChange={(e) => {
                                                                        setPeriod2EndDate(e.target.value);
                                                                        if (e.target.value) setPeriod2Season('all');
                                                                    }}
                                                                    className={`w-full px-2 py-1 text-xs rounded ${
                                                                        theme === 'light'
                                                                            ? 'bg-white border-gray-300 text-gray-900'
                                                                            : 'bg-slate-600 border-slate-500 text-slate-300'
                                                                    } border`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vue Tableau */}
                            {historyView === 'table' && (
                                <div className="space-y-4">
                                    {/* Valeurs actuelles pour référence */}
                                    <div className={`${theme === 'light' ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 'bg-gradient-to-r from-slate-700 to-slate-800'} p-4 rounded-lg border-2 ${theme === 'light' ? 'border-blue-200' : 'border-blue-700'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <h6 className={`text-sm font-bold ${theme === 'light' ? 'text-gray-800' : 'text-slate-200'}`}>
                                                📊 Valeurs actuelles (référence)
                                            </h6>
                                            <span className={`text-xs px-2 py-1 rounded ${theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-900 text-blue-300'}`}>
                                                {formatDate(new Date().toISOString())}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {powerDurationsConfig.map(pdc => {
                                                const currentVal = formData.powerProfileFresh?.[pdc.key];
                                                const weight = formData.weightKg;
                                                const currentWkg = (currentVal && weight) ? (currentVal / weight).toFixed(1) : '-';
                                                const currentWatts = currentVal ? currentVal.toFixed(0) : '-';
                                                return (
                                                    <div key={pdc.key} className={`${theme === 'light' ? 'bg-white' : 'bg-slate-800'} p-2 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                        <div className={`text-[10px] font-medium ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'} mb-1`}>
                                                            {pdc.label}
                                                        </div>
                                                        <div className={`text-sm font-bold ${theme === 'light' ? 'text-gray-800' : 'text-slate-200'}`}>
                                                            {currentWkg} <span className={`text-xs font-normal ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>W/kg</span>
                                                        </div>
                                                        <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                                                            {currentWatts} W
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Tableau d'historique amélioré */}
                                    <div className={`${theme === 'light' ? 'bg-white' : 'bg-slate-800'} rounded-lg border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'} overflow-hidden`}>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-xs">
                                                <thead className={theme === 'light' ? "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700" : "bg-gradient-to-r from-slate-700 to-slate-600 text-slate-300"}>
                                                    <tr>
                                                        <th className="p-3 text-left sticky left-0 z-20 bg-inherit font-semibold">Date</th>
                                                        <th className="p-3 text-left font-semibold">Poids</th>
                                                        {powerDurationsConfig.map(pdc => (
                                                            <th key={pdc.key} className={`p-3 text-center font-semibold border-l ${theme === 'light' ? 'border-gray-300' : 'border-slate-500'}`} colSpan={2}>
                                                                {pdc.label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <th className="p-2 text-left sticky left-0 z-20 bg-inherit"></th>
                                                        <th className="p-2 text-left"></th>
                                                        {powerDurationsConfig.map(pdc => (
                                                            <React.Fragment key={pdc.key}>
                                                                <th className={`p-2 text-right border-l ${theme === 'light' ? 'border-gray-200' : 'border-slate-500'} text-[10px]`}>W</th>
                                                                <th className="p-2 text-right text-[10px]">W/kg</th>
                                                            </React.Fragment>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredHistory.map((entry: PowerProfileHistoryEntry, index: number) => {
                                                        const currentWeight = formData.weightKg;
                                                        const entryWeight = entry.weightKg || currentWeight;
                                                        const isMostRecent = index === 0;
                                                        
                                                        return (
                                                            <tr 
                                                                key={entry.id} 
                                                                className={`border-b ${theme === 'light' ? 'border-gray-100' : 'border-slate-700'} ${
                                                                    isMostRecent 
                                                                        ? theme === 'light' 
                                                                            ? 'bg-blue-50 border-blue-200' 
                                                                            : 'bg-blue-900/20 border-blue-700'
                                                                        : theme === 'light' 
                                                                            ? 'hover:bg-gray-50' 
                                                                            : 'hover:bg-slate-800'
                                                                } transition-colors`}
                                                            >
                                                                <td className={`p-3 sticky left-0 z-10 ${isMostRecent ? theme === 'light' ? 'bg-blue-50' : 'bg-blue-900/20' : theme === 'light' ? 'bg-white' : 'bg-slate-800'} ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'} font-medium`}>
                                                                    <div className="flex items-center gap-2">
                                                                        {isMostRecent && <span className="text-blue-500">●</span>}
                                                                        {formatDate(entry.date)}
                                                                    </div>
                                                                </td>
                                                                <td className={`p-3 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    {entryWeight ? (
                                                                        <span className="font-medium">{entryWeight} kg</span>
                                                                    ) : '-'}
                                                                </td>
                                                                {powerDurationsConfig.map(pdc => {
                                                                    const entryVal = entry.powerProfileFresh?.[pdc.key];
                                                                    const currentVal = formData.powerProfileFresh?.[pdc.key];
                                                                    const entryWkg = (entryVal && entryWeight) ? (entryVal / entryWeight) : null;
                                                                    const entryWatts = entryVal || null;
                                                                    const currentWkg = (currentVal && currentWeight) ? (currentVal / currentWeight) : null;
                                                                    
                                                                    const variation = entryVal && currentVal && currentWeight 
                                                                        ? calculateVariation(entryVal, currentVal, currentWeight)
                                                                        : '-';
                                                                    const variationColor = getVariationColor(variation);
                                                                    
                                                                    // Calculer la largeur de la barre pour W/kg
                                                                    const maxWkg = Math.max(...filteredHistory.map(e => {
                                                                        const val = e.powerProfileFresh?.[pdc.key];
                                                                        const w = e.weightKg || formData.weightKg || 1;
                                                                        return val ? val / w : 0;
                                                                    }).filter(v => v > 0));
                                                                    const barWidth = entryWkg && maxWkg > 0 ? (entryWkg / maxWkg) * 100 : 0;
                                                                    
                                                                    return (
                                                                        <React.Fragment key={pdc.key}>
                                                                            <td className={`p-2 text-right border-l ${theme === 'light' ? 'border-gray-100' : 'border-slate-700'} ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                                {entryWatts ? (
                                                                                    <span className="font-medium">{entryWatts.toFixed(0)}</span>
                                                                                ) : '-'}
                                                                            </td>
                                                                            <td className={`p-2 text-right ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    <div className="flex-1 max-w-[60px]">
                                                                                        <div className={`h-2 rounded-full ${theme === 'light' ? 'bg-gray-200' : 'bg-slate-700'} overflow-hidden`}>
                                                                                            <div 
                                                                                                className={`h-full rounded-full transition-all ${
                                                                                                    isMostRecent ? 'bg-blue-500' : theme === 'light' ? 'bg-gray-400' : 'bg-slate-500'
                                                                                                }`}
                                                                                                style={{ width: `${barWidth}%` }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end min-w-[45px]">
                                                                                        <span className={`font-semibold ${isMostRecent ? theme === 'light' ? 'text-blue-600' : 'text-blue-400' : ''}`}>
                                                                                            {entryWkg ? entryWkg.toFixed(1) : '-'}
                                                                                        </span>
                                                                                        {variation !== '-' && isMostRecent && (
                                                                                            <span className={`text-[9px] ${variationColor} font-medium`}>
                                                                                                {variation}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Vue Comparaison */}
                            {historyView === 'comparison' && (
                                <div className="space-y-4">
                                    <div className={`${theme === 'light' ? 'bg-white' : 'bg-slate-800'} p-4 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                        <h6 className={`text-sm font-semibold mb-4 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                            Comparaison des progrès
                                            {comparisonType === 'periods' && (
                                                <span className={`ml-2 text-xs font-normal ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                                                    ({period1Season !== 'all' ? `Saison ${period1Season}` : period1StartDate || period1EndDate ? 'Période 1' : 'Non définie'} vs {period2Season !== 'all' ? `Saison ${period2Season}` : period2StartDate || period2EndDate ? 'Période 2' : 'Non définie'})
                                                </span>
                                            )}
                                        </h6>
                                        {(() => {
                                            const { period1, period2 } = getComparisonPeriods();
                                            const hasValidComparison = period1.length > 0 && period2.length > 0;
                                            
                                            if (!hasValidComparison) {
                                                return (
                                                    <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                                                        {comparisonType === 'sequential' 
                                                            ? 'Au moins 2 entrées sont nécessaires pour la comparaison.'
                                                            : 'Veuillez sélectionner deux périodes valides pour la comparaison.'}
                                                    </p>
                                                );
                                            }
                                            
                                            const entry1 = period1[0];
                                            const entry2 = period2[0];
                                            
                                            const weight1 = entry1.weightKg || formData.weightKg || 1;
                                            const weight2 = entry2.weightKg || formData.weightKg || 1;
                                            
                                            return (
                                                <div className="space-y-4">
                                                    {/* Informations sur les périodes comparées */}
                                                    <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-3 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                                            <div>
                                                                <span className={`font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                    Période 1
                                                                </span>
                                                                <div className={`mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    {comparisonType === 'sequential' ? 'Plus ancienne' : formatDate(entry1.date)}
                                                                </div>
                                                                <div className={`mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Poids: {weight1} kg
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className={`font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                    Période 2
                                                                </span>
                                                                <div className={`mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    {comparisonType === 'sequential' ? 'Plus récente' : formatDate(entry2.date)}
                                                                </div>
                                                                <div className={`mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Poids: {weight2} kg
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Tableau de comparaison */}
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-xs">
                                                            <thead className={theme === 'light' ? "bg-gray-200 text-gray-600" : "bg-slate-600 text-slate-300"}>
                                                                <tr>
                                                                    <th className="p-2 text-left sticky left-0 z-10 bg-inherit">Métrique</th>
                                                                    <th className={`p-2 text-center border-l ${theme === 'light' ? 'border-gray-300' : 'border-slate-500'}`} colSpan={3}>
                                                                        Période 1
                                                                    </th>
                                                                    <th className={`p-2 text-center border-l ${theme === 'light' ? 'border-gray-300' : 'border-slate-500'}`} colSpan={3}>
                                                                        Période 2
                                                                    </th>
                                                                    <th className={`p-2 text-center border-l ${theme === 'light' ? 'border-gray-300' : 'border-slate-500'}`} colSpan={2}>
                                                                        Variation
                                                                    </th>
                                                                </tr>
                                                                <tr>
                                                                    <th className="p-2 text-left sticky left-0 z-10 bg-inherit"></th>
                                                                    <th className={`p-1 text-right border-l ${theme === 'light' ? 'border-gray-300' : 'border-slate-500'}`}>W</th>
                                                                    <th className="p-1 text-right">W/kg</th>
                                                                    <th className="p-1 text-right">Barre</th>
                                                                    <th className={`p-1 text-right border-l ${theme === 'light' ? 'border-gray-300' : 'border-slate-500'}`}>W</th>
                                                                    <th className="p-1 text-right">W/kg</th>
                                                                    <th className="p-1 text-right">Barre</th>
                                                                    <th className={`p-1 text-right border-l ${theme === 'light' ? 'border-gray-300' : 'border-slate-500'}`}>Δ W</th>
                                                                    <th className="p-1 text-right">Δ W/kg</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {powerDurationsConfig.map(pdc => {
                                                                    const watts1 = entry1.powerProfileFresh?.[pdc.key];
                                                                    const watts2 = entry2.powerProfileFresh?.[pdc.key];
                                                                    
                                                                    if (!watts1 || !watts2) return null;
                                                                    
                                                                    const wkg1 = watts1 / weight1;
                                                                    const wkg2 = watts2 / weight2;
                                                                    
                                                                    const deltaWatts = watts2 - watts1;
                                                                    const deltaWkg = wkg2 - wkg1;
                                                                    const progressWatts = watts1 !== 0 ? ((watts2 - watts1) / watts1) * 100 : 0;
                                                                    const progressWkg = wkg1 !== 0 ? ((wkg2 - wkg1) / wkg1) * 100 : 0;
                                                                    
                                                                    // Calculer la largeur des barres (normalisée sur la valeur max)
                                                                    const maxWatts = Math.max(watts1, watts2);
                                                                    const maxWkg = Math.max(wkg1, wkg2);
                                                                    const barWidth1Watts = (watts1 / maxWatts) * 100;
                                                                    const barWidth2Watts = (watts2 / maxWatts) * 100;
                                                                    const barWidth1Wkg = (wkg1 / maxWkg) * 100;
                                                                    const barWidth2Wkg = (wkg2 / maxWkg) * 100;
                                                                    
                                                                    return (
                                                                        <tr 
                                                                            key={pdc.key} 
                                                                            className={`border-b ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'} ${
                                                                                theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-slate-800'
                                                                            }`}
                                                                        >
                                                                            {/* Métrique */}
                                                                            <td className={`p-2 font-medium sticky left-0 z-10 ${theme === 'light' ? 'bg-white text-gray-700' : 'bg-slate-800 text-slate-300'}`}>
                                                                                {pdc.label}
                                                                            </td>
                                                                            
                                                                            {/* Période 1 - Watts */}
                                                                            <td className={`p-2 text-right border-l ${theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-slate-600 text-slate-300'}`}>
                                                                                <span className="font-semibold">{watts1.toFixed(0)}</span>
                                                                            </td>
                                                                            
                                                                            {/* Période 1 - W/kg */}
                                                                            <td className={`p-2 text-right ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                                <span className="font-semibold">{wkg1.toFixed(1)}</span>
                                                                            </td>
                                                                            
                                                                            {/* Période 1 - Barre visuelle */}
                                                                            <td className="p-2">
                                                                                <div className={`h-4 rounded ${theme === 'light' ? 'bg-gray-200' : 'bg-slate-700'} relative overflow-hidden`}>
                                                                                    <div 
                                                                                        className={`h-full rounded ${theme === 'light' ? 'bg-blue-400' : 'bg-blue-500'}`}
                                                                                        style={{ width: `${barWidth1Watts}%` }}
                                                                                        title={`${watts1.toFixed(0)} W`}
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                            
                                                                            {/* Période 2 - Watts */}
                                                                            <td className={`p-2 text-right border-l ${theme === 'light' ? 'border-gray-200 text-gray-700' : 'border-slate-600 text-slate-300'}`}>
                                                                                <span className="font-semibold">{watts2.toFixed(0)}</span>
                                                                            </td>
                                                                            
                                                                            {/* Période 2 - W/kg */}
                                                                            <td className={`p-2 text-right ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                                <span className="font-semibold">{wkg2.toFixed(1)}</span>
                                                                            </td>
                                                                            
                                                                            {/* Période 2 - Barre visuelle */}
                                                                            <td className="p-2">
                                                                                <div className={`h-4 rounded ${theme === 'light' ? 'bg-gray-200' : 'bg-slate-700'} relative overflow-hidden`}>
                                                                                    <div 
                                                                                        className={`h-full rounded ${theme === 'light' ? 'bg-blue-500' : 'bg-blue-400'}`}
                                                                                        style={{ width: `${barWidth2Watts}%` }}
                                                                                        title={`${watts2.toFixed(0)} W`}
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                            
                                                                            {/* Variation - Δ W */}
                                                                            <td className={`p-2 text-right border-l ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                                                <span className={`font-semibold ${
                                                                                    deltaWatts > 0 ? 'text-green-500' : deltaWatts < 0 ? 'text-red-500' : theme === 'light' ? 'text-gray-600' : 'text-slate-400'
                                                                                }`}>
                                                                                    {deltaWatts > 0 ? '+' : ''}{deltaWatts.toFixed(0)}
                                                                                </span>
                                                                                <div className={`text-[10px] mt-0.5 ${
                                                                                    progressWatts > 0 ? 'text-green-500' : progressWatts < 0 ? 'text-red-500' : theme === 'light' ? 'text-gray-500' : 'text-slate-500'
                                                                                }`}>
                                                                                    {progressWatts > 0 ? '+' : ''}{progressWatts.toFixed(1)}%
                                                                                </div>
                                                                            </td>
                                                                            
                                                                            {/* Variation - Δ W/kg */}
                                                                            <td className={`p-2 text-right ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                                <span className={`font-semibold ${
                                                                                    deltaWkg > 0 ? 'text-green-500' : deltaWkg < 0 ? 'text-red-500' : theme === 'light' ? 'text-gray-600' : 'text-slate-400'
                                                                                }`}>
                                                                                    {deltaWkg > 0 ? '+' : ''}{deltaWkg.toFixed(1)}
                                                                                </span>
                                                                                <div className={`text-[10px] mt-0.5 ${
                                                                                    progressWkg > 0 ? 'text-green-500' : progressWkg < 0 ? 'text-red-500' : theme === 'light' ? 'text-gray-500' : 'text-slate-500'
                                                                                }`}>
                                                                                    {progressWkg > 0 ? '+' : ''}{progressWkg.toFixed(1)}%
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    
                                                    {/* Légende */}
                                                    <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-2 rounded text-xs`}>
                                                        <div className="flex flex-wrap gap-4 items-center">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-4 h-4 rounded ${theme === 'light' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                                                                <span className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>Période 1</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-4 h-4 rounded ${theme === 'light' ? 'bg-blue-500' : 'bg-blue-400'}`}></div>
                                                                <span className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>Période 2</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-green-500 font-semibold">+</span>
                                                                <span className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>Amélioration</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-red-500 font-semibold">-</span>
                                                                <span className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>Régression</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Vue Comparaison Saison N-1 */}
                            {historyView === 'season-n1' && (
                                <div className="space-y-4">
                                    {/* Contrôles de sélection de période */}
                                    <div className={`${theme === 'light' ? 'bg-white' : 'bg-slate-800'} p-4 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                        <div className="space-y-4">
                                            <div>
                                                <label className={`block text-xs font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                    Type de comparaison
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSeasonN1ComparisonType('n1')}
                                                        className={`px-3 py-1 text-xs rounded transition-colors ${
                                                            seasonN1ComparisonType === 'n1'
                                                                ? theme === 'light'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : 'bg-blue-600 text-white'
                                                                : theme === 'light'
                                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        Saison N-1
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSeasonN1ComparisonType('custom')}
                                                        className={`px-3 py-1 text-xs rounded transition-colors ${
                                                            seasonN1ComparisonType === 'custom'
                                                                ? theme === 'light'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : 'bg-blue-600 text-white'
                                                                : theme === 'light'
                                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        Périodes personnalisées
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {seasonN1ComparisonType === 'custom' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-slate-600">
                                                    {/* Période 1 */}
                                                    <div className="space-y-2">
                                                        <label className={`block text-xs font-medium ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                            Période 1
                                                        </label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <select
                                                                value={seasonN1Period1Month}
                                                                onChange={(e) => setSeasonN1Period1Month(e.target.value)}
                                                                className={`px-2 py-1 text-xs rounded ${
                                                                    theme === 'light'
                                                                        ? 'bg-white border-gray-300 text-gray-900'
                                                                        : 'bg-slate-700 border-slate-600 text-slate-300'
                                                                } border`}
                                                            >
                                                                <option value="">Mois</option>
                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                                                    <option key={m} value={m.toString()}>
                                                                        {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][m - 1]}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <select
                                                                value={seasonN1Period1Year}
                                                                onChange={(e) => setSeasonN1Period1Year(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                                                className={`px-2 py-1 text-xs rounded ${
                                                                    theme === 'light'
                                                                        ? 'bg-white border-gray-300 text-gray-900'
                                                                        : 'bg-slate-700 border-slate-600 text-slate-300'
                                                                } border`}
                                                            >
                                                                <option value="all">Année</option>
                                                                {availableSeasons.map(year => (
                                                                    <option key={year} value={year.toString()}>{year}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Période 2 */}
                                                    <div className="space-y-2">
                                                        <label className={`block text-xs font-medium ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                            Période 2
                                                        </label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <select
                                                                value={seasonN1Period2Month}
                                                                onChange={(e) => setSeasonN1Period2Month(e.target.value)}
                                                                className={`px-2 py-1 text-xs rounded ${
                                                                    theme === 'light'
                                                                        ? 'bg-white border-gray-300 text-gray-900'
                                                                        : 'bg-slate-700 border-slate-600 text-slate-300'
                                                                } border`}
                                                            >
                                                                <option value="">Mois</option>
                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                                                    <option key={m} value={m.toString()}>
                                                                        {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][m - 1]}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <select
                                                                value={seasonN1Period2Year}
                                                                onChange={(e) => setSeasonN1Period2Year(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                                                className={`px-2 py-1 text-xs rounded ${
                                                                    theme === 'light'
                                                                        ? 'bg-white border-gray-300 text-gray-900'
                                                                        : 'bg-slate-700 border-slate-600 text-slate-300'
                                                                } border`}
                                                            >
                                                                <option value="all">Année</option>
                                                                {availableSeasons.map(year => (
                                                                    <option key={year} value={year.toString()}>{year}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {(() => {
                                        const { period1Entry, period2Entry, period1Label, period2Label, currentSeason } = getComparisonData();
                                        const currentWeight = formData.weightKg || 1;
                                        
                                        // Utiliser les valeurs actuelles si period2Entry est null (mode N-1)
                                        const period2Weight = period2Entry?.weightKg || currentWeight;
                                        const period2Fresh = period2Entry?.powerProfileFresh || formData.powerProfileFresh;
                                        const period215KJ = period2Entry?.powerProfile15KJ || formData.powerProfile15KJ;
                                        const period230KJ = period2Entry?.powerProfile30KJ || formData.powerProfile30KJ;
                                        
                                        if (!period1Entry) {
                                            return (
                                                <div className={`${theme === 'light' ? 'bg-white' : 'bg-slate-800'} p-4 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                    <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                                                        {seasonN1ComparisonType === 'n1' 
                                                            ? "Aucune donnée disponible pour la saison N-1. Les données d'historique sont nécessaires pour effectuer cette comparaison."
                                                            : "Veuillez sélectionner une période 1 valide avec des données disponibles."}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        
                                        if (seasonN1ComparisonType === 'custom' && !period2Entry) {
                                            return (
                                                <div className={`${theme === 'light' ? 'bg-white' : 'bg-slate-800'} p-4 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                    <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                                                        Veuillez sélectionner une période 2 valide avec des données disponibles.
                                                    </p>
                                                </div>
                                            );
                                        }
                                        
                                        const period1Weight = period1Entry.weightKg || currentWeight;
                                        const period1Fresh = period1Entry.powerProfileFresh;
                                        const period115KJ = period1Entry.powerProfile15KJ;
                                        const period130KJ = period1Entry.powerProfile30KJ;
                                        
                                        return (
                                            <div className="space-y-4">
                                                <div className={`${theme === 'light' ? 'bg-white' : 'bg-slate-800'} p-4 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                    <h6 className={`text-sm font-semibold mb-4 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                        Évolution de la puissance par filière énergétique
                                                        <span className={`ml-2 text-xs font-normal ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                                                            ({period2Label} vs {period1Label})
                                                        </span>
                                                    </h6>
                                                    
                                                    {/* Informations sur les périodes comparées */}
                                                    <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-3 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'} mb-4`}>
                                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                                            <div>
                                                                <span className={`font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                    {period1Label}
                                                                </span>
                                                                <div className={`mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    {formatDate(period1Entry.date)}
                                                                </div>
                                                                <div className={`mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Poids: {period1Weight} kg
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className={`font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                    {period2Label}
                                                                </span>
                                                                <div className={`mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    {period2Entry ? formatDate(period2Entry.date) : 'Valeurs actuelles'}
                                                                </div>
                                                                <div className={`mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                                    Poids: {period2Weight} kg
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Tableau de comparaison par filière énergétique */}
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-xs">
                                                            <thead className={theme === 'light' ? "bg-gray-200 text-gray-600" : "bg-slate-600 text-slate-300"}>
                                                                <tr>
                                                                    <th className="p-2 text-left sticky left-0 z-10 bg-inherit">Filière / Durée</th>
                                                                    <th className="p-2 text-center border-l border-gray-300 dark:border-slate-500">À Frais</th>
                                                                    <th className="p-2 text-center border-l border-gray-300 dark:border-slate-500">Pré-Fatigue (&gt;850kJ)</th>
                                                                    <th className="p-2 text-center border-l border-gray-300 dark:border-slate-500">Fatigue Avancée (&gt;1500kJ)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {energySystems.map((system, systemIndex) => (
                                                                    <React.Fragment key={systemIndex}>
                                                                        {system.durations.map((duration, durationIndex) => {
                                                                            // Calculer les variations pour chaque état de fatigue
                                                                            const calcVariation = (period2Profile?: PowerProfile, period1Profile?: PowerProfile): number | null => {
                                                                                const period2Val = period2Profile?.[duration.key];
                                                                                const period1Val = period1Profile?.[duration.key];
                                                                                
                                                                                if (!period2Val || !period1Val || !period2Weight || !period1Weight) return null;
                                                                                
                                                                                const period2Wkg = period2Val / period2Weight;
                                                                                const period1Wkg = period1Val / period1Weight;
                                                                                
                                                                                if (period1Wkg === 0) return null;
                                                                                return ((period2Wkg - period1Wkg) / period1Wkg) * 100;
                                                                            };
                                                                            
                                                                            const variationFresh = calcVariation(period2Fresh, period1Fresh);
                                                                            const variation15KJ = calcVariation(period215KJ, period115KJ);
                                                                            const variation30KJ = calcVariation(period230KJ, period130KJ);
                                                                            
                                                                            const renderVariationCell = (variation: number | null) => {
                                                                                if (variation === null) {
                                                                                    return (
                                                                                        <td className={`p-2 text-center border-l ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                                                            <span className={theme === 'light' ? 'text-gray-400' : 'text-slate-500'}>-</span>
                                                                                        </td>
                                                                                    );
                                                                                }
                                                                                
                                                                                const indicator = getVariationIndicator(variation);
                                                                                const sign = variation >= 0 ? '+' : '';
                                                                                
                                                                                return (
                                                                                    <td className={`p-2 text-center border-l ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                                                                        <div className="flex flex-col items-center gap-0.5">
                                                                                            <div className="flex items-center gap-1">
                                                                                                <span className={`text-lg font-bold ${indicator.color}`}>{indicator.symbol}</span>
                                                                                                <span className={`${indicator.color} font-semibold text-xs`}>{indicator.label}</span>
                                                                                            </div>
                                                                                            <span className={`${variation >= 0 ? 'text-green-500' : variation < 0 ? 'text-red-500' : 'text-yellow-500'} font-bold text-sm`}>
                                                                                                {sign}{variation.toFixed(1)}%
                                                                                            </span>
                                                                                        </div>
                                                                                    </td>
                                                                                );
                                                                            };
                                                                            
                                                                            return (
                                                                                <tr 
                                                                                    key={`${systemIndex}-${durationIndex}`}
                                                                                    className={`border-b ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'} ${
                                                                                        theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-slate-800'
                                                                                    }`}
                                                                                >
                                                                                    <td className={`p-2 font-medium sticky left-0 z-10 ${theme === 'light' ? 'bg-white text-gray-700' : 'bg-slate-800 text-slate-300'}`}>
                                                                                        {durationIndex === 0 ? (
                                                                                            <div className="font-semibold mb-1">{system.name}</div>
                                                                                        ) : null}
                                                                                        <div className={durationIndex === 0 ? 'mt-1' : ''}>{duration.label}</div>
                                                                                    </td>
                                                                                    {renderVariationCell(variationFresh)}
                                                                                    {renderVariationCell(variation15KJ)}
                                                                                    {renderVariationCell(variation30KJ)}
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </React.Fragment>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    
                                                    {/* Légende */}
                                                    <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-3 rounded text-xs mt-4`}>
                                                        <div className={`font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                            Légende des variations :
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-green-500 font-semibold">↑↑</span>
                                                                <span className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>Forte Hausse (≥10%)</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-green-400 font-semibold">↑</span>
                                                                <span className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>Hausse (≥3%)</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-yellow-500 font-semibold">=</span>
                                                                <span className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>Stable (-3% à +3%)</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-red-400 font-semibold">↓</span>
                                                                <span className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>Baisse (≤-3%)</span>
                                                            </div>
                                                        </div>
                                                        <div className={`mt-2 pt-2 border-t ${theme === 'light' ? 'border-gray-300' : 'border-slate-600'}`}>
                                                            <div className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>
                                                                <strong>Note :</strong> Les variations sont calculées en W/kg pour tenir compte des changements de poids entre les saisons.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                            
                            <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'} italic`}>
                                💡 L'historique conserve les valeurs précédentes à chaque modification des données de puissance. 
                                Utilisez les filtres pour analyser les progrès sur différentes périodes et métriques.
                            </p>
                        </div>
                    )}
                        </div>
                    ) : (
                        <div className={`${containerClasses} p-4`}>
                            <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                                Aucun historique disponible pour le moment. L'historique sera créé automatiquement lors des modifications des données de puissance.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Contenu de l'onglet Bilan */}
            {activeSubTab === 'summary' && (
                <div className="space-y-4">
                    <div className={`${containerClasses} p-4`}>
                        <h5 className={`${titleClasses} mb-4`}>Bilan des performances</h5>
                        
                        {/* Résumé général */}
                        <div className="space-y-4">
                            {/* PPR All-time vs Saison en cours */}
                            <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-3 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                <h6 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                    Comparaison All-time vs Saison en cours
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <div className={`font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                            PPR All-time
                                        </div>
                                        {formData.powerProfileAllTime?.lastUpdated ? (
                                            <div className={`${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                Dernière mise à jour : {new Date(formData.powerProfileAllTime.lastUpdated).toLocaleDateString('fr-FR')}
                                            </div>
                                        ) : (
                                            <div className={`${theme === 'light' ? 'text-gray-500' : 'text-slate-500'}`}>
                                                Aucune donnée all-time disponible
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className={`font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                            Saison en cours
                                        </div>
                                        {formData.currentSeasonStartDate ? (
                                            <div className={`${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
                                                Saison commencée le {new Date(formData.currentSeasonStartDate).toLocaleDateString('fr-FR')}
                                            </div>
                                        ) : (
                                            <div className={`${theme === 'light' ? 'text-gray-500' : 'text-slate-500'}`}>
                                                Saison non définie
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Statistiques de l'historique */}
                            {hasHistory && (
                                <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-3 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                    <h6 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Statistiques de l'historique
                                    </h6>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                        <div>
                                            <div className={`${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>Total d'entrées</div>
                                            <div className={`text-lg font-bold ${theme === 'light' ? 'text-gray-800' : 'text-slate-200'}`}>
                                                {history.length}
                                            </div>
                                        </div>
                                        <div>
                                            <div className={`${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>Saisons suivies</div>
                                            <div className={`text-lg font-bold ${theme === 'light' ? 'text-gray-800' : 'text-slate-200'}`}>
                                                {availableSeasons.length}
                                            </div>
                                        </div>
                                        <div>
                                            <div className={`${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>Première entrée</div>
                                            <div className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                {history.length > 0 ? formatDate(history[history.length - 1].date) : '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className={`${theme === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>Dernière entrée</div>
                                            <div className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                                {history.length > 0 ? formatDate(history[0].date) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Saisons disponibles */}
                            {availableSeasons.length > 0 && (
                                <div className={`${theme === 'light' ? 'bg-gray-50' : 'bg-slate-700'} p-3 rounded border ${theme === 'light' ? 'border-gray-200' : 'border-slate-600'}`}>
                                    <h6 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Saisons disponibles
                                    </h6>
                                    <div className="flex flex-wrap gap-2">
                                        {availableSeasons.map(year => (
                                            <span
                                                key={year}
                                                className={`px-3 py-1 rounded text-xs ${
                                                    year === currentSeasonYear
                                                        ? theme === 'light'
                                                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                                            : 'bg-blue-900 text-blue-300 border border-blue-700'
                                                        : theme === 'light'
                                                            ? 'bg-gray-100 text-gray-700 border border-gray-300'
                                                            : 'bg-slate-600 text-slate-300 border border-slate-500'
                                                }`}
                                            >
                                                {year === currentSeasonYear ? '⭐ ' : ''}{year}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PowerPPRTab;
