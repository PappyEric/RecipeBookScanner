
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../store/RecipeContext';
import { Clock, Users, Plus, ChefHat, Loader2, Archive, Trash2, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { Recipe } from '../types';

const Dashboard: React.FC = () => {
  const { recipes, clearAllRecipes } = useRecipes();
  const [isExporting, setIsExporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleBulkExport = async () => {
    if (recipes.length === 0) return;

    // Check for missing source
    const recipesWithoutSource = recipes.filter(r => !r.source || r.source.trim() === "");
    if (recipesWithoutSource.length > 0) {
        if (!window.confirm(
            `⚠️ Missing Cookbook Source\n\n` +
            `${recipesWithoutSource.length} recipes do not have a Source/Cookbook defined.\n` +
            `Ideally, this should be set (e.g., "Family Church Cookbook 1980") for better filtering in Mealie.\n\n` +
            `Click OK to Export anyway.\nClick Cancel to go back and fix.`
        )) {
            return;
        }
    }

    setIsExporting(true);

    try {
      const zip = new JSZip();
      
      // Track used names to ensure absolute uniqueness within this batch
      const usedNames = new Set<string>();

      // Nextcloud Cookbook structure:
      // ZIP Root
      // └── Recipe Name Folder
      //     ├── recipe.json
      //     └── full.jpg

      for (const recipe of recipes) {
        // Create a directory name from title + ID segment
        const safeTitle = recipe.title
          .replace(/[^a-z0-9\s-_]/gi, '') // Remove special chars
          .trim()
          .replace(/\s+/g, '_'); // Replace spaces with underscores
        
        const folderName = `${safeTitle}_${recipe.id.substring(0, 4)}`;
        const recipeFolder = zip.folder(folderName);
        
        if (!recipeFolder) continue;

        let imageFileName = undefined;

        // Process Image if exists
        if (recipe.imageUrl) {
          try {
            // Extract base64 data
            const match = recipe.imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
            if (match) {
              const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
              // Nextcloud Cookbook standard often uses 'full.jpg'
              const filename = `full.${ext}`;
              recipeFolder.file(filename, match[2], { base64: true });
              imageFileName = filename; // Just the filename, no path
            }
          } catch (e) {
            console.error(`Failed to process image for recipe ${recipe.id}`, e);
          }
        }

        // Determine name for JSON (Mealie uses this name for import uniqueness)
        // REVERTED: Do not auto-append author name. User handles uniqueness via "Title Tag" setting in Digitizer.
        let jsonName = recipe.title;

        // Ensure uniqueness in this batch by checking against usedNames
        // This is a safety fallback for exact collisions
        let finalUniqueName = jsonName;
        if (usedNames.has(finalUniqueName.toLowerCase())) {
            // If collision, append partial ID
            finalUniqueName = `${jsonName} (${recipe.id.substring(0, 4)})`;
        }
        
        // Double check collision (rare)
        if (usedNames.has(finalUniqueName.toLowerCase())) {
             finalUniqueName = `${jsonName} (${recipe.id})`;
        }
        
        usedNames.add(finalUniqueName.toLowerCase());

        // Create JSON-LD entry specific to this recipe
        const recipeData = {
          "@context": "https://schema.org/",
          "@type": "Recipe",
          "name": finalUniqueName,
          "description": recipe.description,
          "image": imageFileName, // Reference the file directly in the same folder
          "author": {
            "@type": "Person",
            "name": recipe.author || "Family Archive"
          },
          "datePublished": recipe.dateAdded,
          "recipeCategory": recipe.category ? [recipe.category] : [],
          "keywords": recipe.tags.join(', '),
          "prepTime": recipe.prepTime ? `PT${parseInt(recipe.prepTime) || 0}M` : undefined,
          "cookTime": recipe.cookTime ? `PT${parseInt(recipe.cookTime) || 0}M` : undefined,
          "recipeYield": recipe.servings,
          "recipeIngredient": recipe.ingredients,
          "recipeInstructions": recipe.instructions.map((step, i) => ({
            "@type": "HowToStep",
            "text": step,
            "position": i + 1
          })),
          "extras": {
              "source": recipe.source
          }
        };

        // Save as recipe.json
        recipeFolder.file("recipe.json", JSON.stringify(recipeData, null, 2));
      }

      // Add instruction file
      zip.file("README.txt", 
        "Mealie Migration Instructions:\n" +
        "1. Go to Mealie > Settings > Migration\n" +
        "2. Select 'Nextcloud Cookbook' from the dropdown.\n" +
        "3. Upload this ZIP file.\n"
      );

      // Generate and download
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heirloom_nextcloud_export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to create export zip. See console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = async () => {
    await clearAllRecipes();
    setShowClearConfirm(false);
  };

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
        <div className="w-24 h-24 bg-sage-100 rounded-full flex items-center justify-center text-sage-600">
          <ChefHat className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-bold text-stone-800">Your Cookbook is Empty</h2>
          <p className="text-stone-500 max-w-md">Start preserving your family legacy by digitizing your first recipe.</p>
        </div>
        <Link 
          to="/digitize"
          className="flex items-center gap-2 bg-sage-600 text-white px-6 py-3 rounded-full hover:bg-sage-700 transition shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Digitize a Recipe
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-fade-in">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <div className="p-2 bg-red-100 rounded-full">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="font-serif font-bold text-xl">Clear All Recipes?</h3>
                    </div>
                    <p className="text-stone-600 mb-6 leading-relaxed">
                        This will permanently delete <strong>{recipes.length} recipes</strong> from your browser's database. 
                        This action cannot be undone.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-6">
                        <strong>Tip:</strong> Ensure you have exported your recipes to a ZIP file before clearing if you wish to keep them.
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setShowClearConfirm(false)}
                            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-medium transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmClear}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm font-medium transition flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Yes, Clear Everything
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-sage-900">My Cookbook</h1>
          <p className="text-stone-500 mt-1">{recipes.length} recipes saved</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleClearClick}
            className="flex items-center gap-2 bg-white text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition shadow-sm"
            title="Delete all recipes to start a new batch"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
          
          <button
            onClick={handleBulkExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition shadow-sm disabled:opacity-50"
            title="Download Zip for Mealie (Nextcloud Cookbook format)"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            <span className="hidden sm:inline">Export Zip</span>
          </button>
          
          <Link 
            to="/digitize"
            className="flex items-center gap-2 bg-sage-600 text-white px-4 py-2 rounded-lg hover:bg-sage-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add New</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map(recipe => (
          <Link 
            key={recipe.id} 
            to={`/recipe/${recipe.id}`}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-stone-100 overflow-hidden flex flex-col h-full"
          >
            <div className="h-48 overflow-hidden bg-stone-100 relative">
              {recipe.imageUrl ? (
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-stone-400">
                  <ChefHat className="w-10 h-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {recipe.category && (
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-sage-800 text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
                  {recipe.category}
                </span>
              )}
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-serif font-bold text-xl text-stone-800 mb-2 line-clamp-1 group-hover:text-sage-700 transition-colors">
                {recipe.title}
              </h3>
              <p className="text-sm text-stone-500 line-clamp-2 mb-4 flex-1">
                {recipe.description || "No description provided."}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-stone-400 border-t border-stone-100 pt-4">
                {recipe.prepTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recipe.prepTime}
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {recipe.servings}
                  </div>
                )}
                {recipe.source && (
                   <div className="ml-auto text-sage-600 font-medium truncate max-w-[100px]" title={recipe.source}>
                     {recipe.source}
                   </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Mobile FAB */}
      <Link 
        to="/digitize"
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-sage-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-sage-700 active:scale-95 transition-all z-20"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
};

export default Dashboard;
