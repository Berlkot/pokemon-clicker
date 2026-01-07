import React, { useMemo } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useGame } from '@/context/GameContext'

export function SaveConflictGate() {
  const { isBlocked, blockReason, saveMeta, resolveSaveConflict } = useGame()

  const newerIs = useMemo(() => {
    const l = saveMeta.localLastSavedTime
    const c = saveMeta.cloudLastSavedTime
    if (l === null || c === null) return null
    if (l === c) return null
    return l > c ? 'local' : 'cloud'
  }, [saveMeta.localLastSavedTime, saveMeta.cloudLastSavedTime])

  const olderIs = useMemo(() => {
    const l = saveMeta.localLastSavedTime
    const c = saveMeta.cloudLastSavedTime
    if (l === null || c === null) return null
    if (l === c) return null
    return l < c ? 'local' : 'cloud'
  }, [saveMeta.localLastSavedTime, saveMeta.cloudLastSavedTime])

  return (
    <Modal visible={isBlocked} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Конфликт сохранений</Text>
          <Text style={styles.text}>{blockReason ?? 'Выберите сохранение.'}</Text>

          <View style={styles.row}>
            <Pressable
              style={styles.btn}
              onPress={async () => {
                if (!newerIs) return
                await resolveSaveConflict(newerIs)
              }}
            >
              <Text style={styles.btnText}>Более новый</Text>
            </Pressable>

            <Pressable
              style={styles.btn}
              onPress={async () => {
                if (!olderIs) return
                await resolveSaveConflict(olderIs)
              }}
            >
              <Text style={styles.btnText}>Более старый</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Пока выбор не сделан, игра приостановлена, чтобы не перезаписать прогресс.
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  text: { fontSize: 14, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { backgroundColor: '#f2f2f2', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, flex: 1, alignItems: 'center' },
  btnText: { fontWeight: '700' },
  hint: { marginTop: 10, fontSize: 12, color: '#666' },
})
