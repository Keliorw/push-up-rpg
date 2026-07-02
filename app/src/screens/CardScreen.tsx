import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Progression} from '../game/progression';

export function CardScreen({
  progression: _progression,
  onStart,
  onBack,
}: {
  progression: Progression;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Карточка врага — в разработке (Task 5)</Text>
      <Pressable style={styles.btn} onPress={onStart}>
        <Text style={styles.btnText}>Начать тренировку</Text>
      </Pressable>
      <Pressable style={styles.btnDark} onPress={onBack}>
        <Text style={styles.btnText}>Назад</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center', gap: 16},
  text: {color: '#fff', fontSize: 16},
  btn: {backgroundColor: '#F5A623', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24},
  btnDark: {backgroundColor: '#24314a', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24},
  btnText: {color: '#fff', fontWeight: '800', fontSize: 16},
});
