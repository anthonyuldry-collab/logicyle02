import { Rider } from '../types';

/**
 * Vérifie si riders est un tableau valide
 */
export const isValidRidersArray = (riders: any): riders is Rider[] => {
    return Array.isArray(riders) && riders.length >= 0;
};

/**
 * Trouve un coureur par email de manière sécurisée
 */
export const findRiderByEmail = (riders: any, email: string, userId?: string): Rider | undefined => {
    if (!isValidRidersArray(riders)) {
        return undefined;
    }
    return riders.find(
      (r) => r.email === email || (userId != null && r.id === userId)
    );
};

export const getRiderCharacteristic = (rider: Rider, key: string): number => {
    if (!rider || !key) return 0;
    
    // Accès sécurisé aux caractéristiques du rider
    const value = (rider as any)[key];
    
    // Vérification que la valeur est un nombre valide
    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }
    
    // Valeur par défaut si la caractéristique n'est pas définie
    return 0;
};

export const getRiderCharacteristicSafe = (
    rider: object | null | undefined,
    key: string,
): number => {
    if (!rider) return 0;
    return getRiderCharacteristic(rider as Rider, key);
};
