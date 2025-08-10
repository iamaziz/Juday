-- Create the chat_sessions table
create table if not exists public.chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text,
    created_at timestamptz not null default now()
);

-- Add comments for clarity
comment on table public.chat_sessions is 'Stores metadata for each chat conversation.';
comment on column public.chat_sessions.title is 'A short, descriptive title for the session, often derived from the first user message.';

-- Create the chat_messages table
create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.chat_sessions(id) on delete cascade,
    role text not null,
    content text not null,
    created_at timestamptz not null default now()
);

-- Add comments for clarity
comment on table public.chat_messages is 'Stores individual messages within a chat session.';
comment on column public.chat_messages.role is 'The role of the message sender, e.g., ''user'' or ''assistant''.';