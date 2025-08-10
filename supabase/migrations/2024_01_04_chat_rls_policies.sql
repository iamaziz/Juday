-- Enable Row Level Security for chat_sessions
alter table public.chat_sessions enable row level security;

-- Policies for chat_sessions
create policy "Users can view their own chat sessions"
on public.chat_sessions for select
using (auth.uid() = user_id);

create policy "Users can create their own chat sessions"
on public.chat_sessions for insert
with check (auth.uid() = user_id);

create policy "Users can update their own chat sessions"
on public.chat_sessions for update
using (auth.uid() = user_id);

create policy "Users can delete their own chat sessions"
on public.chat_sessions for delete
using (auth.uid() = user_id);


-- Enable Row Level Security for chat_messages
alter table public.chat_messages enable row level security;

-- Policies for chat_messages
create policy "Users can view messages in their own sessions"
on public.chat_messages for select
using (auth.uid() = (select user_id from public.chat_sessions where id = session_id));

create policy "Users can create messages in their own sessions"
on public.chat_messages for insert
with check (auth.uid() = (select user_id from public.chat_sessions where id = session_id));

create policy "Users can update messages in their own sessions"
on public.chat_messages for update
using (auth.uid() = (select user_id from public.chat_sessions where id = session_id));

create policy "Users can delete messages in their own sessions"
on public.chat_messages for delete
using (auth.uid() = (select user_id from public.chat_sessions where id = session_id));