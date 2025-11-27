import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
        },
      }}>

      <Tabs.Screen
        name="transaction"
        options={{
          title: '記帳',
          tabBarIcon: ({ color }) => <TabBarIcon name="swap-horizontal" color={color} />,
        }}
      />

      <Tabs.Screen
        name="analysis"
        options={{
          title: '分析',
          tabBarIcon: ({ color }) => <TabBarIcon name="bulb-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="budget"
        options={{
          title: '預算',
          tabBarIcon: ({ color }) => <TabBarIcon name="wallet-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="goal"
        options={{
          title: '目標',
          tabBarIcon: ({ color }) => <TabBarIcon name="trophy-outline" color={color} />,
        }}
      />

    </Tabs>
  );
}