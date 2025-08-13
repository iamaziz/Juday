# Juday

<a href="https://juday.vercel.app/" target="_blank" rel="noopener noreferrer">
  <img src="https://deploy-badge.vercel.app/vercel/juday" alt="Vercel Badge"/>
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