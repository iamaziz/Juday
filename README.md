# Juday

<a href="https://juday.vercel.app/" target="_blank" rel="noopener noreferrer">
  <img src="https://deploy-badge.vercel.app/vercel/juday" alt="Vercel Badge"/>
</a>
<a href="https://deepwiki.com/iamaziz/Juday" target="_blank" rel="noopener noreferrer">
  <img src="https://img.shields.io/badge/DeepWiki-iamaziz%2FJuday-blue.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ERKkJggg==" alt="DeepWiki Badge"/>
</a>

<div align="center">
  <img src="public/Juday-logo.png" alt="Juday Logo" width="200"/>
</div>

## Juday... Just Today!

Juday is a minimalist digital journal designed to maximize your [***signal-to-noise ratio***](https://www.youtube.com/shorts/JvIPESv49Y8). It provides a clean, distraction-free space to focus on what matters: **today**. Capture your thoughts, tasks, and reflections without the clutter.

### Features

*   ✍️ **Effortless Daily Entry:** A new page for today, ready when you are.
*   ✨ **Distraction-Free Writing:** A clean interface that lets you focus.
*   Ⓜ️ **Markdown Support:** Format your notes with simple syntax.
*   🔄 **Real-Time Sync:** Autosaved and synced across all your devices.
*   💾 **Robust Offline Editing:** Continue writing even without an internet connection. Your changes are saved locally and synced automatically when you're back online, with smart conflict resolution to prevent data loss.
*   📜 **Infinite Scroll History:** Just scroll to view past entries.
*   📅 **Calendar Navigation:** Jump to any date instantly.
*   🔒 **Secure Sign-In:** Log in with an email magic link or your GitHub account.
*   ↔️ **Data Import/Export:** Easily import and export your entries via Markdown, using `---YYYY-MM-DD` as an entry separator.

### App Demo

<div align="center">
  <video controls muted autoplay loop playsinline poster="public/Juday-logo-simple.png" style="width:100%; max-width:800px; border-radius: 12px; margin: 1rem 0;">
    <source src="public/juday-demo.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
</div>

[https://github.com/user-attachments/assets/7e280c10-8369-4d27-9ce1-0caed0498640](https://github.com/user-attachments/assets/b2e9828d-34d6-44e3-9741-aa6d79d71b4f)

### For Local Development

First, create a `.env.local` file in the root of the project and add your environment variables. You can get your Supabase keys from your project's dashboard.

```bash
# .env.local

# for cloud-db
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# for local LLM (optional)
OLLAMA_API_BASE_URL="http://localhost:11434/v1"
OLLAMA_MODEL="qwen3:4b"
OLLAMA_API_KEY="any"
```

Then, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the app. The main page is `src/app/page.tsx`.

### Acknowledgement

This app is built with [Dyad](https://github.com/dyad-sh/dyad) — 100% vibe-coded, 0% manually edited.