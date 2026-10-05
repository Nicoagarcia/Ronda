import { useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '@/features/chat/components/chat-screen';

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatScreen chat={{ kind: 'group', id }} />;
}
