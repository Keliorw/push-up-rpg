import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export function CompleteScreen({onContinue}: {onContinue: () => void}) {
  return (
    <View style={styles.root}>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={styles.title}>Игра пройдена!</Text>
      <Text style={styles.subtitle}>Все 10 боссов повержены</Text>
      <Pressable style={styles.btn} onPress={onContinue}>
        <Text style={styles.btnText}>На карту</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#101828',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  trophy: {fontSize: 72},
  title: {color: '#F5A623', fontSize: 36, fontWeight: '900', textAlign: 'center'},
  subtitle: {color: '#fff', fontSize: 18, textAlign: 'center'},
  btn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 40,
    marginTop: 24,
  },
  btnText: {color: '#101828', fontWeight: '800', fontSize: 18},
});
