import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// Todo el acceso al chat pasa por acá. Si el tiempo real cambia de mecanismo
// (Broadcast, otro servicio), solo cambia este archivo (docs/specs/04-chat.md, notas técnicas).

export type ChatRef = { kind: 'group' | 'plan'; id: string };

export type ChatMessage = {
  id: string;
  group_id: string | null;
  plan_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  kind: 'text' | 'system';
  body: string;
  deleted_by: 'author' | 'moderator' | null;
  hidden: boolean;
  created_at: string;
  // Solo en la app, para el envío optimista (AC-11).
  local?: { status: 'sending' | 'failed' };
};

export type ChatInfo = { title: string; closed_reason: string | null; muted: boolean; is_moderator: boolean };
export type MyChat = Database['public']['Functions']['list_my_chats']['Returns'][number] & {
  last_message: ChatMessage | null;
};
export type MessagesCursor = { created_at: string; id: string } | null;

export const PAGE_SIZE = 50;

const chatArgs = (chat: ChatRef) => (chat.kind === 'group' ? { p_group: chat.id } : { p_plan: chat.id });

export async function getChat(chat: ChatRef): Promise<ChatInfo | null> {
  const { data, error } = await supabase.rpc('get_chat', chatArgs(chat));
  if (error) throw error;
  return data as ChatInfo | null;
}

// Mensajes de más nuevo a más viejo, de a 50 (AC-17).
export async function listMessages(chat: ChatRef, cursor: MessagesCursor): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('list_messages', {
    ...chatArgs(chat),
    p_before_created: cursor?.created_at,
    p_before_id: cursor?.id,
    p_limit: PAGE_SIZE,
  });
  if (error) throw error;
  return data as unknown as ChatMessage[];
}

export async function getMessage(id: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase.rpc('get_message', { p_message: id });
  if (error) throw error;
  return data as ChatMessage | null;
}

export async function sendMessage(chat: ChatRef, body: string): Promise<{ id: string; created_at: string }> {
  const { data, error } = await supabase.rpc('send_message', { p_body: body, ...chatArgs(chat) });
  if (error) throw error;
  return data as { id: string; created_at: string };
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.rpc('delete_message', { p_message: id });
  if (error) throw error;
}

export async function markRead(chat: ChatRef) {
  const { error } = await supabase.rpc('mark_read', chatArgs(chat));
  if (error) throw error;
}

export async function setMuted(chat: ChatRef, muted: boolean) {
  const { error } = await supabase.rpc('set_chat_muted', { p_muted: muted, ...chatArgs(chat) });
  if (error) throw error;
}

export async function listMyChats(): Promise<MyChat[]> {
  const { data, error } = await supabase.rpc('list_my_chats');
  if (error) throw error;
  return data as MyChat[];
}

// Avisa cuando llega o cambia un mensaje del chat (nuevo o borrado).
// La base ya filtra por permisos y bloqueos antes de mandar el evento.
export function subscribeToChat(
  chat: ChatRef,
  handlers: { onMessage: (id: string) => void; onReconnect: () => void },
): () => void {
  const column = chat.kind === 'group' ? 'group_id' : 'plan_id';
  let wasSubscribed = false;
  const channel: RealtimeChannel = supabase
    .channel(`chat:${chat.kind}:${chat.id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `${column}=eq.${chat.id}` }, (p) =>
      handlers.onMessage((p.new as { id: string }).id),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `${column}=eq.${chat.id}` }, (p) =>
      handlers.onMessage((p.new as { id: string }).id),
    )
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      // Al reconectar pudo haberse perdido algo: se vuelve a pedir lo último.
      if (wasSubscribed) handlers.onReconnect();
      wasSubscribed = true;
    });
  return () => {
    supabase.removeChannel(channel);
  };
}
