import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export function VictoryScreen({
  name,
  onContinue,
}: {
  name: string;
  onContinue: () => void;
}) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Повержен!</Text>
      {name ? <Text style={styles.name}>{name}</Text> : null}
      <Pressable style={styles.btn} onPress={onContinue}>
        <Text style={styles.btnText}>На карту</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center', gap: 20},
  title: {color: '#F5A623', fontSize: 40, fontWeight: '900'},
  name: {color: '#fff', fontSize: 18},
  btn: {backgroundColor: '#F5A623', paddingHorizontal: 48, paddingVertical: 16, borderRadius: 40, marginTop: 16},
  btnText: {color: '#101828', fontWeight: '800', fontSize: 18},
});
