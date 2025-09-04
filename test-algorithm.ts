// Test de l'algorithme Coggan
interface PowerProfile {
  power1s?: number;
  power5s?: number;
  power30s?: number;
  power1min?: number;
  power3min?: number;
  power5min?: number;
  power12min?: number;
  power20min?: number;
  criticalPower?: number;
}

interface TestRider {
  weightKg: number;
  powerProfileFresh: PowerProfile;
}

// Algorithme de profilage Coggan Expert
const calculateCogganProfileScore = (rider: TestRider) => {
  const powerProfile = rider.powerProfileFresh || {};
  const weight = rider.weightKg || 70;
  
  // Calcul des puissances relatives (W/kg) pour chaque durée
  const power1s = (powerProfile.power1s || 0) / weight;
  const power5s = (powerProfile.power5s || 0) / weight;
  const power30s = (powerProfile.power30s || 0) / weight;
  const power1min = (powerProfile.power1min || 0) / weight;
  const power3min = (powerProfile.power3min || 0) / weight;
  const power5min = (powerProfile.power5min || 0) / weight;
  const power12min = (powerProfile.power12min || 0) / weight;
  const power20min = (powerProfile.power20min || 0) / weight;
  const criticalPower = (powerProfile.criticalPower || 0) / weight;
  
  // Références Coggan pour un athlète "ultime" (100/100)
  const cogganUltimate = {
    power1s: 25.0,    // 25 W/kg - Sprint ultime
    power5s: 18.0,    // 18 W/kg - Anaérobie ultime
    power30s: 12.0,   // 12 W/kg - Puissance critique ultime
    power1min: 8.5,   // 8.5 W/kg - Endurance anaérobie ultime
    power3min: 7.0,   // 7.0 W/kg - Seuil anaérobie ultime
    power5min: 6.5,   // 6.5 W/kg - Seuil fonctionnel ultime
    power12min: 5.8,  // 5.8 W/kg - FTP ultime
    power20min: 5.5,  // 5.5 W/kg - Endurance critique ultime
    criticalPower: 5.5 // 5.5 W/kg - CP ultime
  };
  
  // Calcul des scores par durée (0-100)
  const getDurationScore = (actual: number, ultimate: number) => {
    if (actual >= ultimate) return 100;
    return Math.max(0, Math.round((actual / ultimate) * 100));
  };
  
  const scores = {
    power1s: getDurationScore(power1s, cogganUltimate.power1s),
    power5s: getDurationScore(power5s, cogganUltimate.power5s),
    power30s: getDurationScore(power30s, cogganUltimate.power30s),
    power1min: getDurationScore(power1min, cogganUltimate.power1min),
    power3min: getDurationScore(power3min, cogganUltimate.power3min),
    power5min: getDurationScore(power5min, cogganUltimate.power5min),
    power12min: getDurationScore(power12min, cogganUltimate.power12min),
    power20min: getDurationScore(power20min, cogganUltimate.power20min),
    criticalPower: getDurationScore(criticalPower, cogganUltimate.criticalPower)
  };
  
  // Note générale = moyenne simple de toutes les données de puissance
  const generalScore = Math.round(
    Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length
  );
  
  return {
    generalScore,
    scores,
    powerProfile: {
      power1s, power5s, power30s, power1min, power3min, 
      power5min, power12min, power20min, criticalPower
    }
  };
};

// Test avec un coureur exemple
const testRider: TestRider = {
  weightKg: 70,
  powerProfileFresh: {
    power1s: 1200,    // 17.1 W/kg
    power5s: 900,     // 12.9 W/kg
    power30s: 600,    // 8.6 W/kg
    power1min: 450,   // 6.4 W/kg
    power3min: 400,   // 5.7 W/kg
    power5min: 380,   // 5.4 W/kg
    power12min: 350,  // 5.0 W/kg
    power20min: 330,  // 4.7 W/kg
    criticalPower: 330 // 4.7 W/kg
  }
};

const result = calculateCogganProfileScore(testRider);
console.log("Test de l'algorithme Coggan:");
console.log("Coureur de test:", testRider);
console.log("Résultat:", result);
console.log("Note générale:", result.generalScore + "/100");
console.log("Scores par durée:", result.scores);
console.log("Puissances W/kg:", result.powerProfile);
