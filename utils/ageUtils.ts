// Fonction pour calculer l'âge exact d'un coureur
export const getAge = (birthDate?: string): number | null => {
    if (!birthDate || typeof birthDate !== 'string') {
        return null;
    }
    
    // Robust date parsing to avoid timezone issues.
    const parts = birthDate.split('-').map(p => parseInt(p, 10));
    if (parts.length !== 3 || parts.some(isNaN)) {
        return null;
    }
    const [year, month, day] = parts;
    const birth = new Date(Date.UTC(year, month - 1, day));
    
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    
    // Calcul de l'âge exact
    let age = utcToday.getUTCFullYear() - birth.getUTCFullYear();
    const m = utcToday.getUTCMonth() - birth.getUTCMonth();
    if (m < 0 || (m === 0 && utcToday.getUTCDate() < birth.getUTCDate())) {
        age--;
    }
    
    if (age < 0 || age > 120) { // Sanity check
        return null;
    }
    
    return age;
};

export const getAgeCategory = (birthDate?: string): { category: string; age: number | null } => {
    if (!birthDate || typeof birthDate !== 'string') {
        return { category: 'N/A', age: null };
    }
    
    // Robust date parsing to avoid timezone issues.
    const parts = birthDate.split('-').map(p => parseInt(p, 10));
    if (parts.length !== 3 || parts.some(isNaN)) {
        return { category: 'N/A', age: null };
    }
    const [year, month, day] = parts;
    const birth = new Date(Date.UTC(year, month - 1, day));
    
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    
    // Calcul de l'âge exact pour l'affichage
    let exactAge = utcToday.getUTCFullYear() - birth.getUTCFullYear();
    const m = utcToday.getUTCMonth() - birth.getUTCMonth();
    if (m < 0 || (m === 0 && utcToday.getUTCDate() < birth.getUTCDate())) {
        exactAge--;
    }
    
    // Pour les catégories cyclistes : âge au 1er janvier de l'année en cours
    const currentYear = today.getFullYear();
    const ageOnJanuary1st = currentYear - birth.getUTCFullYear();
    
    if (exactAge < 0 || exactAge > 120) { // Sanity check
        return { category: 'N/A', age: null };
    }

    // Catégories cyclistes basées sur l'âge au 1er janvier
    let category = 'Senior';
    if (ageOnJanuary1st <= 14) category = 'U15';  // Jusqu'à 14 ans au 1er janvier
    else if (ageOnJanuary1st <= 16) category = 'U17';  // 15-16 ans au 1er janvier
    else if (ageOnJanuary1st <= 18) category = 'U19';  // 17-18 ans au 1er janvier
    else if (ageOnJanuary1st <= 22) category = 'U23';  // 19-22 ans au 1er janvier
    else if (ageOnJanuary1st <= 29) category = 'Senior';  // 23-29 ans au 1er janvier
    else category = 'Master';  // 30 ans et plus au 1er janvier
    
    return { category, age: exactAge };
};

// Fonction pour déterminer la catégorie de niveau basée sur les performances
export const getLevelCategory = (rider: any): string => {
    if (!rider) return 'N/A';
    
    // 1. Priorité : Si le coureur a des catégories de niveau sélectionnées manuellement
    if (rider.categories && Array.isArray(rider.categories) && rider.categories.length > 0) {
        // Retourner la première catégorie sélectionnée (ou la plus élevée)
        const sortedCategories = ['Pro', 'Elite', 'Open 1', 'Open 2', 'Open 3', 'Handisport'];
        const selectedCategory = rider.categories.find(cat => sortedCategories.includes(cat));
        if (selectedCategory) {
            return selectedCategory;
        }
    }
    
    // 2. Si le coureur a un statut spécifique défini
    if (rider.levelCategory) {
        return rider.levelCategory;
    }
    
    // 3. Calcul basé sur les caractéristiques de performance si disponibles
    if (rider.powerProfileFresh && rider.weightKg) {
        const wkg = (power: number) => power / rider.weightKg;
        const ftp = rider.powerProfileFresh.criticalPower;
        const ftpWkg = ftp ? wkg(ftp) : 0;
        
        // Seuils approximatifs pour les catégories de niveau (W/kg)
        if (ftpWkg >= 6.0) return 'Pro';
        if (ftpWkg >= 5.5) return 'Elite';
        if (ftpWkg >= 4.8) return 'Open 1';
        if (ftpWkg >= 4.0) return 'Open 2';
        if (ftpWkg >= 3.0) return 'Open 3';
        return 'Open 3';
    }
    
    // 4. Par défaut, si aucune donnée disponible
    return 'N/A';
};
