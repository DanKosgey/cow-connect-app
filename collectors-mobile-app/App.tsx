
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NewCollectionScreen } from './src/screens/NewCollectionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { DatabaseInspectorScreen } from './src/screens/DatabaseInspectorScreen';
import { RecentFarmersScreen } from './src/screens/RecentFarmersScreen';
import { OfflineIndicator } from './src/components/OfflineIndicator';
import { useBackgroundSync } from './src/hooks/useBackgroundSync';
import LoginScreen from './src/screens/LoginScreen';
import { FarmerPerformanceScreen } from './src/screens/FarmerPerformanceScreen';
import { CollectorPerformanceScreen } from './src/screens/CollectorPerformanceScreen';
import { CollectorGoalsScreen } from './src/screens/CollectorGoalsScreen';
import { EarningsReportScreen } from './src/screens/EarningsReportScreen';
import { FarmersDirectoryScreen } from './src/screens/FarmersDirectoryScreen';
import { FarmerProfileScreen } from './src/screens/FarmerProfileScreen';
import { CollectionHistoryScreen } from './src/screens/CollectionHistoryScreen';
import { AuthProvider, useAuth } from './src/hooks/useAuth';

const Stack = createNativeStackNavigator();

function AppContent() {
  // Initialize auth and background sync
  const { user, login, isLoading } = useAuth();
  useBackgroundSync();



  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Loading state could be a spinner here */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={user ? "Home" : "Login"}>
          {!user ? (
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
          ) : (
            <>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Dashboard', headerShown: false }}
              />
              <Stack.Screen
                name="NewCollection"
                component={NewCollectionScreen}
                options={{ title: 'Milk Collection' }}
              />
              <Stack.Screen
                name="DatabaseInspector"
                component={DatabaseInspectorScreen}
                options={{ title: '📊 Database Inspector' }}
              />
              <Stack.Screen
                name="RecentFarmers"
                component={RecentFarmersScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FarmerPerformance"
                component={FarmerPerformanceScreen}
                options={{ title: 'Farmer Performance' }}
              />
              <Stack.Screen
                name="CollectorPerformance"
                component={CollectorPerformanceScreen}
                options={{ title: 'My Performance' }}
              />
              <Stack.Screen
                name="CollectorGoals"
                component={CollectorGoalsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EarningsReport"
                component={EarningsReportScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FarmersDirectory"
                component={FarmersDirectoryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FarmerProfile"
                component={FarmerProfileScreen}
                options={{ headerShown: false, presentation: 'modal' }}
              />
              <Stack.Screen
                name="CollectionHistory"
                component={CollectionHistoryScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
