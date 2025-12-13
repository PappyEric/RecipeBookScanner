# Heirloom: The Recipe Digitizer

**Heirloom** is a specialized tool built to help you preserve your family's culinary legacy. 

It bridges the analog world of grandma's handwritten recipe cards and vintage community cookbooks with the modern digital world of self-hosted recipe managers like [Mealie](https://nightly.mealie.io/) and [Nextcloud Cookbook](https://apps.nextcloud.com/apps/cookbook).

<div align="center">
<img width="800" alt="Heirloom Cookbooks Banner" src="./banner.png" />
</div>

I have a version [here](https://heirloom-recipe-digitizer-791910551214.us-west1.run.app/) you're more than welcome to try it out. It is using my API key so please just test things out. I use this alot on my phone to digitize recipes and it works great. I'm interested in how the community uses it. Please let me know if you have any issues or suggestions.

### 1. Take pics or your reipe cards and cookbooks
Start by digitizing your physical media.
- **Recipe Cards**: Use your phone or a scanner to take clear pictures of handwritten cards.
- **Vintage Books**: For best results with old cookbooks, use a **flatbed scanner**. This ensures high resolution and flat pages, which improves AI accuracy.
- **Multiple Recipes**: If a single page has 3 different recipes on it, that's fine! Heirloom can detect multiple recipes on a single page.

### 2. AI-Powered Parsing
- The app uses **Google Gemini AI** to "read" the image.
- It identifies the **Title** (keeping exact original naming).
- It extracts **Ingredients**, **Instructions**, and **Prep Metadata**.
- It even intelligently crops the image to finding just the section of the page relevant to each recipe.

### 3. Review and Curate
- Review the extracted text in the dashboard.
- Add "Batch Tags" (like "Church Cookbook 1985") to organize entire collections at once.
- Discard duplicates or irrelevant detected text.

### 4. Export
- Once you've digitized a batch of recipes, click **"Export Zip"**.
- Heirloom generates a standard **Nextcloud/Mealie Cookbook compatible ZIP** file.
- This ZIP contains folder structures with `recipe.json` and high-quality `full.jpg` images for every recipe.
- **Import to Mealie**: Go to Mealie > User Settings > Data Migration > Choose Migration Type > Nextcloud Cookbook and drop your ZIP file there. Submit.
- *Voila!* Your entire vintage cookbook is now searchable, tagged, and backed up in your self-hosted instance.

## Technical Stack
- **Frontend**: React 19 + Vite (Fast, modern UI)
- **Styling**: TailwindCSS (Clean, responsive design)
- **AI**: Google Gemini 2.0 Flash (Multimodal vision capabilities)
- **Processing**: JSZip (Client-side ZIP generation)

## Running Locally

1. **Clone & Install**
   ```bash
   git clone https://github.com/PappyEric/RecipeBookScanner.git
   cd RecipeBookScanner
   npm install
   ```

2. **Configure API**
   - Create a `.env` file (or `.env.local`).
   - Add your Gemini API Key: `GEMINI_API_KEY=your_key_here`

3. **Start the App**
   ```bash
   npm run dev
   ```
