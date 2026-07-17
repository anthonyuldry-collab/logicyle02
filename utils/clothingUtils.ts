import { ClothingType, ClothingItem } from '../types';

export type ClothingCategoryId = 'race' | 'sportswear' | 'accessories';

export const CLOTHING_CATEGORY_LABELS: Record<ClothingCategoryId, string> = {
  race: 'Tenue course',
  sportswear: 'Sportswear & tenues de sport',
  accessories: 'Accessoires',
};

export const CLOTHING_CATEGORY_HINTS: Record<ClothingCategoryId, string> = {
  race: 'Kit compétition : maillot, cuissard, veste…',
  sportswear: 'Tenues équipe / quotidien : polo, sweat, survêtement…',
  accessories: 'Casque, lunettes, chaussures, gants…',
};

/** Types par catégorie (ordre d’affichage). */
export const CLOTHING_TYPES_BY_CATEGORY: Record<ClothingCategoryId, ClothingType[]> = {
  race: [
    ClothingType.MAILLOT,
    ClothingType.CUISSARD,
    ClothingType.VESTE,
    ClothingType.CHAUSSETTES,
  ],
  sportswear: [
    ClothingType.SURVETEMENT,
    ClothingType.POLO,
    ClothingType.TSHIRT,
    ClothingType.SHORT,
    ClothingType.PANTALON,
    ClothingType.SWEAT,
    ClothingType.HOODIE,
    ClothingType.CASQUETTE,
    ClothingType.BRASSARD,
  ],
  accessories: [
    ClothingType.CASQUE,
    ClothingType.LUNETTES,
    ClothingType.CHAUSSURES,
    ClothingType.GANTS,
    ClothingType.AUTRE,
  ],
};

const TYPE_TO_CATEGORY = Object.entries(CLOTHING_TYPES_BY_CATEGORY).reduce(
  (acc, [category, types]) => {
    types.forEach((type) => {
      acc[type] = category as ClothingCategoryId;
    });
    return acc;
  },
  {} as Record<string, ClothingCategoryId>,
);

export function getClothingCategory(type: ClothingType | string): ClothingCategoryId {
  return TYPE_TO_CATEGORY[type] || 'accessories';
}

export function filterClothingByCategory(
  items: ClothingItem[] | undefined,
  category: ClothingCategoryId,
): ClothingItem[] {
  return (items || []).filter((item) => getClothingCategory(item.type) === category);
}

export function clothingCategoryOptions(): {
  id: ClothingCategoryId;
  label: string;
  types: ClothingType[];
}[] {
  return (Object.keys(CLOTHING_TYPES_BY_CATEGORY) as ClothingCategoryId[]).map((id) => ({
    id,
    label: CLOTHING_CATEGORY_LABELS[id],
    types: CLOTHING_TYPES_BY_CATEGORY[id],
  }));
}
