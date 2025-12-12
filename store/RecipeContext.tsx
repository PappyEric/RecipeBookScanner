
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Recipe } from '../types';
import { initDB, getAllRecipes, saveRecipeToDB, saveRecipesToDB, deleteRecipeFromDB, clearAllRecipesFromDB } from '../services/db';

interface RecipeContextType {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  addRecipes: (recipes: Recipe[]) => void;
  deleteRecipe: (id: string) => void;
  clearAllRecipes: () => void;
  getRecipe: (id: string) => Recipe | undefined;
  isLoading: boolean;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize DB and Load Data
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        
        // Check for migration from LocalStorage (legacy support)
        const legacyData = localStorage.getItem('heirloom_recipes');
        if (legacyData) {
            try {
                const parsed = JSON.parse(legacyData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`Migrating ${parsed.length} recipes from LocalStorage to IndexedDB...`);
                    await saveRecipesToDB(parsed);
                    localStorage.removeItem('heirloom_recipes'); // Clear legacy data
                }
            } catch (e) {
                console.error("Migration failed", e);
            }
        }

        const loadedRecipes = await getAllRecipes();
        setRecipes(loadedRecipes);
      } catch (error) {
        console.error("Failed to initialize database", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const addRecipe = async (recipe: Recipe) => {
    // Optimistic UI update
    setRecipes(prev => [recipe, ...prev]);
    // Async DB save
    try {
        await saveRecipeToDB(recipe);
    } catch (e) {
        console.error("Failed to save recipe", e);
        // Could revert state here if needed
    }
  };

  const addRecipes = async (newRecipes: Recipe[]) => {
    setRecipes(prev => [...newRecipes, ...prev]);
    try {
        await saveRecipesToDB(newRecipes);
    } catch (e) {
        console.error("Failed to save recipes", e);
    }
  };

  const deleteRecipe = async (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    try {
        await deleteRecipeFromDB(id);
    } catch (e) {
        console.error("Failed to delete recipe", e);
    }
  };

  const clearAllRecipes = async () => {
    setRecipes([]);
    try {
        await clearAllRecipesFromDB();
    } catch (e) {
        console.error("Failed to clear all recipes", e);
    }
  };

  const getRecipe = (id: string) => {
    return recipes.find(r => r.id === id);
  };

  return (
    <RecipeContext.Provider value={{ recipes, addRecipe, addRecipes, deleteRecipe, clearAllRecipes, getRecipe, isLoading }}>
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error("useRecipes must be used within a RecipeProvider");
  }
  return context;
};
