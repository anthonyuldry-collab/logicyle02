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
    if (ageOnJanuary1st <= 18) category = 'U19';  // Jusqu'à 18 ans au 1er janvier
    else if (ageOnJanuary1st <= 22) category = 'U23';  // 19-22 ans au 1er janvier
    // 23 ans et plus = Senior
    
    return { category, age: exactAge };
};
