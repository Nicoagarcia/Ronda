import { useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '@/features/chat/components/chat-screen';

export default function PlanChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatScreen chat={{ kind: 'plan', id }} />;
}
