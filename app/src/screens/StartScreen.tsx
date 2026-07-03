import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

export function StartScreen({onStart}: {onStart: () => void}) {
  // `SafeAreaView` pads for the top inset itself (native, no Provider
  // context needed), keeping the title clear of a notch/status bar without
  // altering the centered layout or dark background/accent design.
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Push-Ups RPG</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={onStart}>
        <Text style={styles.buttonText}>START</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#101828',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  title: {color: '#FFFFFF', fontSize: 32, fontWeight: '800'},
  button: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 64,
    paddingVertical: 20,
    borderRadius: 40,
  },
  buttonText: {
    color: '#101828',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
