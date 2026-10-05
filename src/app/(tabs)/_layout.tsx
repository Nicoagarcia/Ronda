import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useMyChats } from '@/features/chat/hooks';

type IconProps = React.ComponentProps<typeof Ionicons>;

function icon(name: IconProps['name']) {
  function TabIcon({ color, size }: { color: IconProps['color']; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  // Punto en "Lo mío" si hay algo sin leer (spec 04).
  const { data: chats } = useMyChats();
  const hasUnread = chats?.some((c) => c.unread > 0) ?? false;

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#ff6b3d' }}>
      <Tabs.Screen name="index" options={{ title: 'Descubrir', tabBarIcon: icon('compass-outline') }} />
      <Tabs.Screen
        name="mine"
        options={{
          title: 'Lo mío',
          tabBarIcon: icon('people-outline'),
          tabBarBadge: hasUnread ? '' : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ff6b3d', minWidth: 10, maxHeight: 10, borderRadius: 5, top: 4 },
        }}
      />
      <Tabs.Screen name="create" options={{ title: 'Crear', tabBarIcon: icon('add-circle-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  );
}
