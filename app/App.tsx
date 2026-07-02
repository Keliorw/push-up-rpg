import React, {useState} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StartScreen} from './src/screens/StartScreen';
import {WorkoutScreen} from './src/screens/WorkoutScreen';

export default function App() {
  const [screen, setScreen] = useState<'start' | 'workout'>('start');
  return (
    // Provides safe-area insets (notch/status bar) to `useSafeAreaInsets()`
    // consumers (WorkoutScreen's HUD/exit button) and to `SafeAreaView`
    // consumers (StartScreen) throughout the tree.
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      {screen === 'start' ? (
        <StartScreen onStart={() => setScreen('workout')} />
      ) : (
        <WorkoutScreen onExit={() => setScreen('start')} />
      )}
    </SafeAreaProvider>
  );
}
