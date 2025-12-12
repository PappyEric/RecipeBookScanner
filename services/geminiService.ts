
import { GoogleGenAI, Type } from "@google/genai";
import { ParseResult } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const parseRecipeFromImage = async (base64Image: string): Promise<ParseResult[]> => {
  const ai = getClient();
  
  // Clean base64 string if it contains metadata prefix
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const prompt = `
    Analyze this image of a recipe page. It may contain ONE or MULTIPLE recipes.
    Extract the details for EACH recipe found into a structured JSON array.
    
    CRITICAL: For each recipe, you must identify its location on the page.
    
    Fields to extract per recipe:
    - Title: Name of the dish.
      * CRITICAL: Extract the Title EXACTLY as it appears on the page.
      * Do NOT shorten, "clean", or rephrase the title.
      * Example: If the text says "Grandma's Famous Apple Pie", the Title MUST be "Grandma's Famous Apple Pie", NOT "Apple Pie".
    - Author/Creator: Name of the person who created the recipe.
      * LOOK SPECIFICALLY in the UPPER RIGHT or UPPER LEFT of the recipe block for names (e.g., "Bessie Simpson", "Mrs. Smith").
      * If the author's name is followed by a location (City, State), INCLUDE THE LOCATION.
      * Example: "Bessie Simpson, Chicago, IL" should be captured in full.
      * Check the Title line (e.g., "By [Name]").
      * Common format in community cookbooks: Title on left, Author on right (e.g. "Apple Pie ......... Mrs. Jane Doe").
    - Description: Summary text.
      * If a specific headnote/description exists in the text, use it.
      * IF NO DESCRIPTION EXISTS, GENERATE ONE based on the Title, Author, and Ingredients.
      * Format: "A [Category] recipe for [Title] created by [Author]. Features [Top 3 Ingredients]."
      * Example: "A delicious Main Dish recipe for Meatloaf created by Aunt Jane. Features ground beef, onions, and breadcrumbs."
      * CRITICAL: ALWAYS include the Author's name in the description if an author is found.
    - Ingredients: Array of strings.
    - Instructions: Array of strings.
    - Prep/Cook Time/Servings: Extract if available.
    - Category: Infer the course/category (e.g., "Main Dish", "Dessert", "Salad", "Soup", "Bread") based on ingredients and title.
    - Tags: Generate a list of 2-4 keywords (e.g., "Seafood", "Chicken", "Vegetarian", "Holiday", "Chocolate").
    - Bounding Box: The rectangular region containing the TITLE, AUTHOR, INGREDIENTS, and INSTRUCTIONS for this specific recipe.
      Return ymin, xmin, ymax, xmax as INTEGERS between 0 and 1000.
      (0,0 is top-left, 1000,1000 is bottom-right).
      Ensure the box visually covers ALL text content of the recipe, INCLUDING the author name in the corner.

    If multiple recipes are present, return an item for each one with its distinct bounding box.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              instructions: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              prepTime: { type: Type.STRING },
              cookTime: { type: Type.STRING },
              servings: { type: Type.STRING },
              category: { type: Type.STRING },
              tags: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              boundingBox: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.NUMBER, description: "Top Y (0-1000)" },
                  xmin: { type: Type.NUMBER, description: "Left X (0-1000)" },
                  ymax: { type: Type.NUMBER, description: "Bottom Y (0-1000)" },
                  xmax: { type: Type.NUMBER, description: "Right X (0-1000)" },
                },
                required: ["ymin", "xmin", "ymax", "xmax"]
              }
            },
            required: ["title", "ingredients", "instructions"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as ParseResult[];

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to parse recipe from image.");
  }
};
