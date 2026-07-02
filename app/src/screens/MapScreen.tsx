import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Progression} from '../game/progression';

export function MapScreen({
  progression: _progression,
  onSelect,
}: {
  progression: Progression;
  onSelect: () => void;
}) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Карта — в разработке (Task 4)</Text>
      <Pressable style={styles.btn} onPress={onSelect}>
        <Text style={styles.btnText}>К бою</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center', gap: 24},
  text: {color: '#fff', fontSize: 16},
  btn: {backgroundColor: '#F5A623', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24},
  btnText: {color: '#101828', fontWeight: '800', fontSize: 16},
});
