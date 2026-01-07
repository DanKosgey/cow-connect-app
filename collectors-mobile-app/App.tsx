
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NewCollectionScreen } from './src/screens/NewCollectionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { DatabaseInspectorScreen } from './src/screens/DatabaseInspectorScreen';
import { OfflineIndicator } from './src/components/OfflineIndicator';
import { useBackgroundSync } from './src/hooks/useBackgroundSync';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/hooks/useAuth';

const Stack = createNativeStackNavigator();

function AppContent() {
  // Initialize auth and background sync
  const { user, login, isLoading } = useAuth();
  useBackgroundSync();

  // DEMO ONLY: Seed offline credentials for testing
  React.useEffect(() => {
    const seedDemo = async () => {
      try {
        const { seedDemoCredentials } = await import('./src/utils/seedOfflineCredentials');
        await seedDemoCredentials();
      } catch (error) {
        console.log('Seed skipped:', error);
      }
    };
    seedDemo();
  }, []);

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
