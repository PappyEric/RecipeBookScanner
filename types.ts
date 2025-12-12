
export interface Recipe {
  id: string;
  title: string;
  author?: string; // e.g., "Grandma", "Julia Child"
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  imageUrl?: string; // Base64 or URL
  source?: string; // e.g., "Grandma's 1960 Cookbook"
  dateAdded: string;
  category?: string; // e.g. "Main Dish", "Dessert"
  tags: string[]; // e.g. ["Seafood", "Church Cookbook"]
}

export interface ParseResult {
  title: string;
  author: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: string;
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  imageUrl?: string; // For the cropped version
  category?: string;
  tags?: string[];
}

export enum DigitizeStep {
  CAPTURE = 'CAPTURE',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  SAVED = 'SAVED'
}
