import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B4A',
        tabBarInactiveTintColor: '#7A838D',
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#F7F4EE',
          borderTopColor: 'rgba(22,32,42,0.1)',
          height: 82,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
