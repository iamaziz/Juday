import { createClient } from '@/lib/supabase/server';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

// IMPORTANT: The 'openai' package is used for its type definitions and streaming client,
// but we are directing it to a local Ollama-compatible API endpoint.
// This is a common practice for using local LLMs with OpenAI-compatible tools.
const ollama = new OpenAI({
  apiKey: process.env.OLLAMA_API_KEY || 'ollama', // API key is required but not used by Ollama
  baseURL: process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434/v1', // Ensure this points to your local LLM's OpenAI-compatible endpoint
});

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const supabase = createClient();

    // 1. Authenticate the user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Fetch all journal entries for the user
    const { data: sheets, error } = await supabase
      .from('sheets')
      .select('title, content')
      .eq('user_id', user.id)
      .order('title', { ascending: true }); // Oldest to newest for chronological context

    if (error) {
      console.error('Error fetching sheets for chat context:', error);
      return new Response(`Failed to fetch journal data: ${error.message}`, { status: 500 });
    }

    if (!sheets || sheets.length === 0) {
      return new Response('You do not have any journal entries to chat with yet. Please write some notes first.', { status: 400 });
    }

    // 3. Format the journal entries into a single context string
    const journalContext = sheets
      .map(sheet => `--- Entry Date: ${sheet.title} ---\n\n${sheet.content || 'No content for this day.'}`)
      .join('\n\n\n');

    // 4. Construct the system prompt
    const systemPrompt = {
      role: 'system',
      content: `You are a helpful AI assistant named Juday integrated into a digital journal. Your purpose is to help the user reflect on their past entries.
- The user's complete journal is provided below, with each entry separated by its date.
- Base your answers *only* on the information contained within these journal entries.
- If the user asks a question that cannot be answered from their journal, politely state that the information is not available in their notes.
- Be concise and helpful.

Here is the user's journal:
---
${journalContext}
---
Now, please answer the user's question based on their journal.`
    };

    // 5. Call the local LLM with the prepared context and user messages
    const response = await ollama.chat.completions.create({
      model: process.env.OLLAMA_MODEL || 'llama3', // The model to use
      stream: true,
      messages: [systemPrompt, ...messages],
    });

    // 6. Stream the response back to the client
    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (e: any) {
    console.error('Error in chat API:', e);
    // Provide a more specific error message if the connection is refused
    if (e.cause?.code === 'ECONNREFUSED') {
        return new Response('Could not connect to the local AI model. Please ensure it is running and the `OLLAMA_API_BASE_URL` in your .env file is correct.', { status: 500 });
    }
    return new Response(e.message || 'An unexpected error occurred.', { status: 500 });
  }
}