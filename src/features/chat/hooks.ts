import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useMyProfile } from '@/features/profile/hooks';
import {
  deleteMessage,
  getChat,
  getMessage,
  listMessages,
  listMyChats,
  markRead,
  PAGE_SIZE,
  sendMessage,
  setMuted,
  subscribeToChat,
  type ChatMessage,
  type ChatRef,
  type MessagesCursor,
} from '@/services/chat';

export const chatKeys = {
  all: ['chat'] as const,
  mine: ['chat', 'mine'] as const,
  info: (chat: ChatRef) => ['chat', 'info', chat.kind, chat.id] as const,
  messages: (chat: ChatRef) => ['chat', 'messages', chat.kind, chat.id] as const,
};

type Pages = InfiniteData<ChatMessage[], MessagesCursor>;

export const useChatInfo = (chat: ChatRef) => useQuery({ queryKey: chatKeys.info(chat), queryFn: () => getChat(chat) });

// "Lo mío" y el punto de la pestaña: se refresca cada 20 s mientras no haya notificaciones (Hito 5).
export const useMyChats = () => useQuery({ queryKey: chatKeys.mine, queryFn: listMyChats, refetchInterval: 20_000 });

// Agrega o reemplaza un mensaje en la primera página, sin duplicar.
function upsertMessage(data: Pages | undefined, message: ChatMessage, replaceId?: string): Pages | undefined {
  if (!data) return data;
  const [first = [], ...rest] = data.pages;
  const existsElsewhere = rest.some((p) => p.some((m) => m.id === message.id));
  if (existsElsewhere) {
    return { ...data, pages: data.pages.map((p) => p.map((m) => (m.id === message.id ? message : m))) };
  }
  const withoutDupes = first.filter((m) => m.id !== message.id && m.id !== replaceId);
  const merged = [message, ...withoutDupes].sort((a, b) =>
    a.created_at === b.created_at ? b.id.localeCompare(a.id) : b.created_at.localeCompare(a.created_at),
  );
  return { ...data, pages: [merged, ...rest] };
}

function removeMessage(data: Pages | undefined, id: string): Pages | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((p) => p.filter((m) => m.id !== id)) };
}

export function useChatMessages(chat: ChatRef) {
  const queryClient = useQueryClient();
  const key = chatKeys.messages(chat);

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => listMessages(chat, pageParam),
    initialPageParam: null as MessagesCursor,
    getNextPageParam: (last) => {
      if (last.length < PAGE_SIZE) return undefined;
      const oldest = last[last.length - 1];
      return { created_at: oldest.created_at, id: oldest.id };
    },
  });

  // Tiempo real (AC-10). Al reconectar se vuelve a pedir la primera página.
  useEffect(() => {
    return subscribeToChat(chat, {
      onMessage: async (id) => {
        const message = await getMessage(id);
        // null = no corresponde verlo (bloqueo, permisos).
        if (message) queryClient.setQueryData<Pages>(key, (data) => upsertMessage(data, message));
        markRead(chat).catch(() => undefined);
        queryClient.invalidateQueries({ queryKey: chatKeys.mine });
      },
      onReconnect: () => queryClient.invalidateQueries({ queryKey: key }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.kind, chat.id]);

  const messages = query.data?.pages.flat() ?? [];
  return { ...query, messages };
}

// Envío optimista: aparece al instante como "enviando…"; si falla queda "No enviado" (AC-11).
export function useSendMessage(chat: ChatRef) {
  const queryClient = useQueryClient();
  const { data: me } = useMyProfile();
  const key = chatKeys.messages(chat);

  const setLocal = (localId: string, body: string, status: 'sending' | 'failed') =>
    queryClient.setQueryData<Pages>(key, (data) =>
      upsertMessage(data, {
        id: localId,
        group_id: chat.kind === 'group' ? chat.id : null,
        plan_id: chat.kind === 'plan' ? chat.id : null,
        sender_id: me?.id ?? null,
        sender_name: me?.name ?? null,
        sender_avatar: me?.avatar_url ?? null,
        kind: 'text',
        body,
        deleted_by: null,
        hidden: false,
        created_at: new Date().toISOString(),
        local: { status },
      }),
    );

  const send = async (body: string, localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`) => {
    setLocal(localId, body, 'sending');
    try {
      const saved = await sendMessage(chat, body);
      const message = await getMessage(saved.id);
      queryClient.setQueryData<Pages>(key, (data) =>
        message ? upsertMessage(data, message, localId) : removeMessage(data, localId),
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.mine });
      return null;
    } catch (e) {
      setLocal(localId, body, 'failed');
      return e;
    }
  };

  return { send };
}

export function useDeleteMessage(chat: ChatRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMessage,
    onSuccess: async (_data, id) => {
      const message = await getMessage(id);
      if (message) queryClient.setQueryData<Pages>(chatKeys.messages(chat), (data) => upsertMessage(data, message));
    },
  });
}

export function useMarkRead(chat: ChatRef) {
  const queryClient = useQueryClient();
  return () =>
    markRead(chat)
      .then(() => queryClient.invalidateQueries({ queryKey: chatKeys.mine }))
      .catch(() => undefined);
}

export function useSetMuted(chat: ChatRef) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (muted: boolean) => setMuted(chat, muted),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.info(chat) });
      queryClient.invalidateQueries({ queryKey: chatKeys.mine });
    },
  });
}

// Un mensaje fallido se saca de la lista para reintentarlo como nuevo.
export function useDiscardLocal(chat: ChatRef) {
  const queryClient = useQueryClient();
  return (localId: string) => queryClient.setQueryData<Pages>(chatKeys.messages(chat), (data) => removeMessage(data, localId));
}
