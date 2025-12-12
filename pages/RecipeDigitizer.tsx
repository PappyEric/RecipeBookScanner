
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useRecipes } from '../store/RecipeContext';
import { parseRecipeFromImage } from '../services/geminiService';
import { compressImage } from '../services/imageUtils';
import CameraCapture from '../components/CameraCapture';
import { Recipe, DigitizeStep, ParseResult } from '../types';
import { Loader2, ArrowLeft, Save, AlertTriangle, Trash2, User, Book, Tag, Layers, FileType } from 'lucide-react';

const RecipeDigitizer: React.FC = () => {
  const navigate = useNavigate();
  const { addRecipes } = useRecipes();
  const [step, setStep] = useState<DigitizeStep>(DigitizeStep.CAPTURE);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  
  // State for handling multiple detected recipes
  const [draftRecipes, setDraftRecipes] = useState<ParseResult[]>([]);
  const [activeRecipeIndex, setActiveRecipeIndex] = useState<number>(0);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing...");
  const [error, setError] = useState<string | null>(null);

  // Batch Settings State - Persisted to LocalStorage
  const [batchSource, setBatchSource] = useState(localStorage.getItem('heirloom_batch_source') || "");
  const [batchCategory, setBatchCategory] = useState(localStorage.getItem('heirloom_batch_category') || "");
  const [batchTags, setBatchTags] = useState(localStorage.getItem('heirloom_batch_tags') || "");
  const [batchTitleTag, setBatchTitleTag] = useState(localStorage.getItem('heirloom_batch_title_tag') || "");

  // Persistence Handlers
  const handleBatchSourceChange = (val: string) => {
      setBatchSource(val);
      localStorage.setItem('heirloom_batch_source', val);
  };

  const handleBatchCategoryChange = (val: string) => {
      setBatchCategory(val);
      localStorage.setItem('heirloom_batch_category', val);
  };

  const handleBatchTagsChange = (val: string) => {
      setBatchTags(val);
      localStorage.setItem('heirloom_batch_tags', val);
  };

  const handleBatchTitleTagChange = (val: string) => {
      setBatchTitleTag(val);
      localStorage.setItem('heirloom_batch_title_tag', val);
  };

  // Helper to crop image
  const cropImage = (base64Source: string, box: { ymin: number, xmin: number, ymax: number, xmax: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        const is1000Scale = box.ymin > 1 || box.xmin > 1 || box.ymax > 1 || box.xmax > 1;
        const scale = is1000Scale ? 1000 : 1;

        const nYmin = Math.min(box.ymin, box.ymax) / scale;
        const nXmin = Math.min(box.xmin, box.xmax) / scale;
        const nYmax = Math.max(box.ymin, box.ymax) / scale;
        const nXmax = Math.max(box.xmin, box.xmax) / scale;

        const sx = nXmin * img.width;
        const sy = nYmin * img.height;
        const sWidth = (nXmax - nXmin) * img.width;
        const sHeight = (nYmax - nYmin) * img.height;
        
        const paddingW = img.width * 0.05;
        const paddingH = img.height * 0.05;
        
        const sx_p = Math.max(0, sx - paddingW);
        const sy_p = Math.max(0, sy - paddingH);
        const sWidth_p = Math.min(img.width - sx_p, sWidth + (paddingW * 2));
        const sHeight_p = Math.min(img.height - sy_p, sHeight + (paddingH * 2));

        if (sWidth_p < 50 || sHeight_p < 50) {
            resolve(base64Source);
            return;
        }

        const MAX_WIDTH = 1024;
        let finalWidth = sWidth_p;
        let finalHeight = sHeight_p;

        if (finalWidth > MAX_WIDTH) {
          const ratio = MAX_WIDTH / finalWidth;
          finalWidth = MAX_WIDTH;
          finalHeight = finalHeight * ratio;
        }

        canvas.width = finalWidth;
        canvas.height = finalHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject("No canvas context");
            return;
        }
        
        ctx.drawImage(img, sx_p, sy_p, sWidth_p, sHeight_p, 0, 0, finalWidth, finalHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = base64Source;
    });
  };

  const handleCapture = async (rawImagesData: string[]) => {
    setStep(DigitizeStep.PROCESSING);
    setIsProcessing(true);
    setError(null);
    setLoadingMessage("Optimizing images for AI...");

    const allDrafts: ParseResult[] = [];
    const optimizedImages: string[] = [];

    try {
      // 1. Compress Images First
      for (const rawImg of rawImagesData) {
        try {
            const compressed = await compressImage(rawImg);
            optimizedImages.push(compressed);
        } catch (e) {
            console.warn("Compression failed, using original", e);
            optimizedImages.push(rawImg);
        }
      }
      setSourceImages(optimizedImages);

      // 2. Send to Gemini
      for (let i = 0; i < optimizedImages.length; i++) {
        setLoadingMessage(`Analyzing image ${i + 1} of ${optimizedImages.length}...`);
        const imageData = optimizedImages[i];
        
        try {
          const results = await parseRecipeFromImage(imageData);
          
          if (results && results.length > 0) {
             const processedResults = await Promise.all(results.map(async (recipe) => {
               if (recipe.boundingBox) {
                 try {
                   const croppedUrl = await cropImage(imageData, recipe.boundingBox);
                   return { ...recipe, imageUrl: croppedUrl };
                 } catch (e) {
                   console.warn("Failed to crop image for recipe:", recipe.title);
                   return { ...recipe, imageUrl: imageData }; 
                 }
               }
               return { ...recipe, imageUrl: imageData };
             }));
             
             allDrafts.push(...processedResults);
          }
        } catch (e) {
          console.error(`Error processing image ${i+1}:`, e);
        }
      }

      if (allDrafts.length > 0) {
        setDraftRecipes(allDrafts);
        setActiveRecipeIndex(0);
        setStep(DigitizeStep.REVIEW);
      } else {
        throw new Error("No recipes identified in the uploaded images.");
      }

    } catch (err) {
      console.error(err);
      setError("Failed to process images. Please ensure they are clear and legible.");
      setStep(DigitizeStep.CAPTURE);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateDraft = (field: keyof ParseResult, value: string) => {
    setDraftRecipes(prev => {
      const updated = [...prev];
      if (field === 'ingredients' || field === 'instructions') {
        // @ts-ignore
        updated[activeRecipeIndex][field] = value.split('\n').filter(line => line.trim() !== '');
      } else if (field === 'tags') {
        // @ts-ignore
        updated[activeRecipeIndex][field] = value.split(',').map(t => t.trim()).filter(t => t);
      } else {
         // @ts-ignore
        updated[activeRecipeIndex][field] = value;
      }
      return updated;
    });
  };

  const handleDeleteDraft = (index: number) => {
    const updated = draftRecipes.filter((_, i) => i !== index);
    if (updated.length === 0) {
      setStep(DigitizeStep.CAPTURE);
      setDraftRecipes([]);
    } else {
      setDraftRecipes(updated);
      setActiveRecipeIndex(0);
    }
  };

  const handleSaveAll = () => {
    const newRecipes: Recipe[] = draftRecipes.map(draft => {
      // Logic to merge tags from individual draft and batch settings
      const finalTags = new Set(draft.tags || []);
      
      // Add Batch Tags
      if (batchTags) {
          batchTags.split(',').forEach(t => {
              const trimmed = t.trim();
              if (trimmed) finalTags.add(trimmed);
          });
      }
      
      // Add Source as Tag for Mealie/searchability
      if (batchSource && batchSource.trim()) {
          finalTags.add(batchSource.trim());
      }

      // Handle Title Suffix logic: Title - Suffix
      let finalTitle = draft.title;
      if (batchTitleTag && batchTitleTag.trim()) {
          finalTitle = `${finalTitle} - ${batchTitleTag.trim()}`;
      }

      return {
        id: uuidv4(),
        title: finalTitle,
        author: draft.author,
        description: draft.description,
        ingredients: draft.ingredients,
        instructions: draft.instructions,
        prepTime: draft.prepTime,
        cookTime: draft.cookTime,
        servings: draft.servings,
        imageUrl: draft.imageUrl || undefined,
        
        // Use batch category if set, otherwise fallback to AI detected category
        category: batchCategory ? batchCategory : draft.category,
        
        tags: Array.from(finalTags),
        source: batchSource || undefined,
        dateAdded: new Date().toISOString()
      };
    });

    addRecipes(newRecipes);
    navigate('/');
  };

  const getArrayAsText = (arr: string[]) => arr.join('\n');
  const getTagsAsText = (arr: string[]) => arr ? arr.join(', ') : '';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => step === DigitizeStep.CAPTURE ? navigate('/') : setStep(DigitizeStep.CAPTURE)}
          className="p-2 hover:bg-stone-100 rounded-full transition"
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        <h1 className="text-2xl font-serif font-bold text-stone-800">
          {step === DigitizeStep.CAPTURE ? 'Digitize Recipe' : 
           step === DigitizeStep.PROCESSING ? 'Processing...' : 'Review Recipes'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {step === DigitizeStep.CAPTURE && (
        <CameraCapture onCapture={handleCapture} />
      )}

      {step === DigitizeStep.PROCESSING && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-12 h-12 text-sage-600 animate-spin" />
          <p className="text-stone-500 animate-pulse">{loadingMessage}</p>
        </div>
      )}

      {step === DigitizeStep.REVIEW && draftRecipes.length > 0 && (
        <div className="space-y-6">
          
          {/* Batch Settings Panel */}
          <div className="bg-sage-50 p-5 rounded-xl border border-sage-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-sage-800 font-bold border-b border-sage-200 pb-2">
                <Layers className="w-5 h-5" />
                <h3>Batch Settings</h3>
                <span className="text-xs font-normal text-sage-600 ml-auto">Autosaved</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-sage-700 uppercase mb-1">Cookbook / Source</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Z. Warner Church" 
                        value={batchSource}
                        onChange={(e) => handleBatchSourceChange(e.target.value)}
                        className="w-full text-sm p-2 rounded border border-sage-300 focus:ring-1 focus:ring-sage-500 bg-white text-stone-900"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-sage-700 uppercase mb-1">Section / Category</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Main Dishes" 
                        value={batchCategory}
                        onChange={(e) => handleBatchCategoryChange(e.target.value)}
                        className="w-full text-sm p-2 rounded border border-sage-300 focus:ring-1 focus:ring-sage-500 bg-white text-stone-900"
                    />
                </div>
                 <div>
                    <label className="block text-xs font-semibold text-sage-700 uppercase mb-1">Title Tag / Suffix</label>
                    <input 
                        type="text" 
                        placeholder="e.g. ZWC" 
                        value={batchTitleTag}
                        onChange={(e) => handleBatchTitleTagChange(e.target.value)}
                        className="w-full text-sm p-2 rounded border border-sage-300 focus:ring-1 focus:ring-sage-500 bg-white text-stone-900"
                    />
                    <p className="text-[10px] text-sage-600 mt-1">Appends " - [TAG]" to all titles</p>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-sage-700 uppercase mb-1">Common Tags</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Potluck, Favorite" 
                        value={batchTags}
                        onChange={(e) => handleBatchTagsChange(e.target.value)}
                        className="w-full text-sm p-2 rounded border border-sage-300 focus:ring-1 focus:ring-sage-500 bg-white text-stone-900"
                    />
                </div>
            </div>
          </div>

          {/* Recipe Tabs */}
          {draftRecipes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {draftRecipes.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveRecipeIndex(idx)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    activeRecipeIndex === idx 
                      ? 'bg-sage-600 text-white shadow-md' 
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {r.title || `Recipe ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 relative">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                 {draftRecipes[activeRecipeIndex].imageUrl && (
                   <img 
                     src={draftRecipes[activeRecipeIndex].imageUrl} 
                     alt="Crop" 
                     className="w-16 h-16 object-cover rounded-lg border border-stone-200 shadow-sm"
                   />
                 )}
                <h2 className="text-lg font-serif font-bold text-sage-800 line-clamp-1">
                   {draftRecipes[activeRecipeIndex].title}
                </h2>
              </div>
              {draftRecipes.length > 1 && (
                <button 
                  onClick={() => handleDeleteDraft(activeRecipeIndex)}
                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition"
                  title="Remove this recipe"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Recipe Title</label>
                  <input
                    type="text"
                    value={draftRecipes[activeRecipeIndex].title}
                    onChange={(e) => handleUpdateDraft('title', e.target.value)}
                    className="w-full p-2 bg-white text-stone-900 border border-stone-300 rounded-md focus:ring-2 focus:ring-sage-500 focus:border-sage-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Author
                  </label>
                  <input
                    type="text"
                    value={draftRecipes[activeRecipeIndex].author || ''}
                    placeholder="e.g. Grandma, Aunt Jane"
                    onChange={(e) => handleUpdateDraft('author', e.target.value)}
                    className="w-full p-2 bg-white text-stone-900 border border-stone-300 rounded-md focus:ring-2 focus:ring-sage-500 focus:border-sage-500 shadow-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center gap-1">
                    <Book className="w-3 h-3" /> Category
                  </label>
                  <input
                    type="text"
                    value={draftRecipes[activeRecipeIndex].category || ''}
                    placeholder="e.g. Main Dish"
                    onChange={(e) => handleUpdateDraft('category', e.target.value)}
                    className="w-full p-2 bg-white text-stone-900 border border-stone-300 rounded-md focus:ring-2 focus:ring-sage-500 focus:border-sage-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={getTagsAsText(draftRecipes[activeRecipeIndex].tags || [])}
                    onChange={(e) => handleUpdateDraft('tags', e.target.value)}
                    className="w-full p-2 bg-white text-stone-900 border border-stone-300 rounded-md focus:ring-2 focus:ring-sage-500 focus:border-sage-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Prep Time</label>
                  <input
                    type="text"
                    value={draftRecipes[activeRecipeIndex].prepTime}
                    onChange={(e) => handleUpdateDraft('prepTime', e.target.value)}
                    className="w-full p-2 text-sm bg-white text-stone-900 border border-stone-300 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Cook Time</label>
                  <input
                    type="text"
                    value={draftRecipes[activeRecipeIndex].cookTime}
                    onChange={(e) => handleUpdateDraft('cookTime', e.target.value)}
                    className="w-full p-2 text-sm bg-white text-stone-900 border border-stone-300 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Servings</label>
                  <input
                    type="text"
                    value={draftRecipes[activeRecipeIndex].servings}
                    onChange={(e) => handleUpdateDraft('servings', e.target.value)}
                    className="w-full p-2 text-sm bg-white text-stone-900 border border-stone-300 rounded-md shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={draftRecipes[activeRecipeIndex].description}
                  onChange={(e) => handleUpdateDraft('description', e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-white text-stone-900 border border-stone-300 rounded-md focus:ring-2 focus:ring-sage-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Ingredients <span className="text-xs font-normal text-stone-400">(One per line)</span>
                </label>
                <textarea
                  value={getArrayAsText(draftRecipes[activeRecipeIndex].ingredients)}
                  onChange={(e) => handleUpdateDraft('ingredients', e.target.value)}
                  rows={6}
                  className="w-full p-2 bg-white text-stone-900 border border-stone-300 rounded-md focus:ring-2 focus:ring-sage-500 font-mono text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Instructions <span className="text-xs font-normal text-stone-400">(One per line)</span>
                </label>
                <textarea
                  value={getArrayAsText(draftRecipes[activeRecipeIndex].instructions)}
                  onChange={(e) => handleUpdateDraft('instructions', e.target.value)}
                  rows={6}
                  className="w-full p-2 bg-white text-stone-900 border border-stone-300 rounded-md focus:ring-2 focus:ring-sage-500 font-mono text-sm shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
             <button
              onClick={() => setStep(DigitizeStep.CAPTURE)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition"
            >
              Discard All
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 bg-sage-600 text-white px-6 py-2 rounded-lg hover:bg-sage-700 transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              {draftRecipes.length > 1 ? `Save All (${draftRecipes.length})` : 'Save to Cookbook'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDigitizer;
