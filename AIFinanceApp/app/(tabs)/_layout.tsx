// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
// 使用 Ionicons 代替可能出錯的 FontAwesome
import { Ionicons } from '@expo/vector-icons'; 

// 定義 Tab Bar Icon 的元件
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  // 將大小調整為標準尺寸
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  
  // 由於移除了 useColorScheme，我們直接在下面設定固定顏色

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF', // 活躍標籤顏色：藍色
        tabBarInactiveTintColor: '#8E8E93', // 非活躍標籤顏色：灰色
        headerShown: false, // 隱藏所有 Tab 頁面的頂部標題列
        tabBarStyle: {
          backgroundColor: '#fff', // 底部 Tab Bar 的背景色：白色
        },
      }}>
      
      {/* 💸 記錄交易頁面 - 檔案名: app/(tabs)/transaction.tsx */}
      <Tabs.Screen
        name="transaction" 
        options={{
          title: '💸 記錄交易',
          // 修正為現代 Ionicons 名稱
          tabBarIcon: ({ color }) => <TabBarIcon name="swap-horizontal" color={color} />, 
        }}
      />
      
      {/* 📊 預算與目標頁面 - 檔案名: app/(tabs)/two.tsx */}
      <Tabs.Screen
        name="two" 
        options={{
          title: '📊 預算與目標',
          // 修正為現代 Ionicons 名稱
          tabBarIcon: ({ color }) => <TabBarIcon name="stats-chart" color={color} />,
        }}
      />
      
    </Tabs>
  );
}