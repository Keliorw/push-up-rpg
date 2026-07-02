import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export function WorkoutScreen({onExit: _onExit}: {onExit: () => void}) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Workout — в разработке (Task 7)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {color: '#FFF'},
});
