import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FigureDetailScreen } from '@/screens/FigureDetailScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { SignInScreen } from '@/screens/SignInScreen';
import { colors } from '@/theme/tokens';
import { linking } from './linking';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: 'Inter-Regular', fontWeight: '400' as const },
    medium: { fontFamily: 'Inter-Medium', fontWeight: '500' as const },
    bold: { fontFamily: 'Inter-Bold', fontWeight: '700' as const },
    heavy: { fontFamily: 'Inter-Bold', fontWeight: '700' as const },
  },
};

export function AppNavigator({ initialFigureId }: { initialFigureId?: string }) {
  return (
    <NavigationContainer linking={linking} theme={navTheme}>
      <Stack.Navigator
        initialRouteName="FigureDetail"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="FigureDetail"
          component={FigureDetailScreen}
          initialParams={{ figureId: initialFigureId ?? 'mattel-elite-11-rey-mysterio' }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
