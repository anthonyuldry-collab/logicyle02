import { Rider } from '../types';

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

export const getRiderCharacteristicSafe = (rider: Rider | null | undefined, key: string): number => {
    if (!rider) return 0;
    return getRiderCharacteristic(rider, key);
};
