
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipes } from '../store/RecipeContext';
import { Clock, Users, ArrowLeft, Trash2, Share2, Code, User, Copy, ExternalLink, Download, Tag } from 'lucide-react';

const RecipeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecipe, deleteRecipe } = useRecipes();
  const [showSchema, setShowSchema] = useState(false);

  const recipe = id ? getRecipe(id) : undefined;

  useEffect(() => {
    if (!recipe) return;

    document.title = `${recipe.title} - Heirloom`;

    const setMeta = (property: string, content: string, attributeName = 'property') => {
      let meta = document.querySelector(`meta[${attributeName}="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attributeName, property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMeta('og:title', recipe.title);
    setMeta('og:description', recipe.description || `Recipe for ${recipe.title}`);
    setMeta('og:type', 'article');
    setMeta('og:url', window.location.href);
    if (recipe.imageUrl) {
      setMeta('og:image', recipe.imageUrl);
    }

    if (recipe.author) {
      setMeta('article:author', recipe.author);
      setMeta('author', recipe.author, 'name');
    }

    return () => {
      document.title = 'Heirloom - Recipe Digitizer';
    };
  }, [recipe]);

  if (!recipe) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl text-stone-500">Recipe not found</h2>
        <button onClick={() => navigate('/')} className="text-sage-600 mt-4 hover:underline">Return Home</button>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      if (id) deleteRecipe(id);
      navigate('/');
    }
  };

  // Construct JSON-LD structure for Mealie, Tandoor, and other recipe managers
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    "name": recipe.title,
    "description": recipe.description,
    "url": window.location.href,
    "image": recipe.imageUrl ? [recipe.imageUrl] : [],
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
    "recipeInstructions": recipe.instructions.map((step, index) => ({
      "@type": "HowToStep",
      "text": step,
      "position": index + 1
    }))
  };

  const copyJsonLd = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonLd, null, 2));
    alert("JSON-LD copied! You can now paste this into Mealie's 'Import' feature.");
  };

  const downloadMealieJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonLd, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${recipe.title.replace(/\s+/g, '_')}_mealie.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cookbook
        </button>
        <div className="flex gap-2">
           <button 
            onClick={() => setShowSchema(!showSchema)}
            className={`p-2 rounded-full transition ${showSchema ? 'bg-sage-100 text-sage-700' : 'text-stone-500 hover:bg-stone-100'}`}
            title="Export for Mealie/Tandoor"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={handleDelete}
            className="p-2 text-red-400 hover:bg-red-50 rounded-full transition"
            title="Delete Recipe"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Header Image */}
        <div className="h-64 md:h-80 w-full bg-stone-100 relative group">
          {recipe.imageUrl && (
            <img 
              src={recipe.imageUrl} 
              alt={recipe.title} 
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white w-full">
            {recipe.category && (
                <span className="inline-block bg-sage-600/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
                    {recipe.category}
                </span>
            )}
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2 shadow-sm">{recipe.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm md:text-base font-medium opacity-90">
              {recipe.author && (
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <User className="w-4 h-4" />
                  <span>By {recipe.author}</span>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                {recipe.prepTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Prep: {recipe.prepTime}</span>
                  </div>
                )}
                {recipe.cookTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Cook: {recipe.cookTime}</span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Serves: {recipe.servings}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 grid md:grid-cols-[1fr_2fr] gap-8">
          
          {/* Sidebar: Ingredients & Tags */}
          <div className="space-y-8">
            <div>
              <h3 className="font-serif font-bold text-xl text-sage-800 mb-4 border-b border-sage-100 pb-2">Ingredients</h3>
              <ul className="space-y-3">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-3 text-stone-700 text-sm leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            {recipe.tags && recipe.tags.length > 0 && (
                <div>
                     <h3 className="font-serif font-bold text-sm text-stone-500 uppercase tracking-wide mb-3">Tags</h3>
                     <div className="flex flex-wrap gap-2">
                        {recipe.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs hover:bg-stone-200 transition">
                                <Tag className="w-3 h-3" />
                                {tag}
                            </span>
                        ))}
                     </div>
                </div>
            )}
          </div>

          {/* Main: Instructions */}
          <div className="space-y-6">
             <div className="mb-6 bg-sage-50 p-4 rounded-lg text-sage-800 italic text-sm border-l-4 border-sage-400">
               "{recipe.description}"
               {recipe.source && <span className="block mt-2 font-semibold not-italic text-xs text-sage-600">— from {recipe.source}</span>}
             </div>

            <div>
              <h3 className="font-serif font-bold text-xl text-sage-800 mb-4 border-b border-sage-100 pb-2">Method</h3>
              <div className="space-y-6">
                {recipe.instructions.map((step, i) => (
                  <div key={i} className="group">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-100 text-stone-500 font-serif font-bold flex items-center justify-center group-hover:bg-sage-100 group-hover:text-sage-700 transition-colors">
                        {i + 1}
                      </div>
                      <p className="text-stone-700 leading-relaxed pt-1">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export / Schema Modal */}
      {showSchema && (
        <div className="mt-8 bg-stone-900 rounded-xl overflow-hidden shadow-lg animate-fade-in border border-stone-700">
          <div className="bg-stone-800 p-4 flex flex-col md:flex-row justify-between items-center border-b border-stone-700 gap-4">
            <div className="flex items-center gap-3 text-stone-200">
              <Code className="w-5 h-5 text-sage-400" />
              <div>
                <p className="font-medium">Export to Mealie</p>
                <p className="text-xs text-stone-400">Download JSON or Copy for Import.</p>
              </div>
            </div>
            <div className="flex gap-2">
                <button 
                onClick={downloadMealieJson}
                className="flex items-center gap-2 text-sm bg-stone-700 hover:bg-stone-600 text-white px-4 py-2 rounded-lg transition font-medium"
                >
                <Download className="w-4 h-4" />
                Download JSON
                </button>
                <button 
                onClick={copyJsonLd}
                className="flex items-center gap-2 text-sm bg-sage-600 hover:bg-sage-500 text-white px-4 py-2 rounded-lg transition font-medium"
                >
                <Copy className="w-4 h-4" />
                Copy Data
                </button>
            </div>
          </div>
          
          <div className="p-4 bg-black/50">
             <p className="text-stone-400 text-xs mb-2 flex items-center gap-1">
               <ExternalLink className="w-3 h-3" />
               Raw Data Preview
             </p>
            <div className="max-h-48 overflow-y-auto rounded bg-black p-3 border border-stone-800">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(jsonLd, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Embed Structured Data for Scrapers */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </div>
  );
};

export default RecipeDetails;
