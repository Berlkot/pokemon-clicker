import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'

type Props = {
  title: string
  instructions: string
  onComplete: () => void
}

const MinigameIntro = ({ title, instructions, onComplete }: Props) => {
  const [countdown, setCountdown] = useState(3)

  const scaleAnim = useRef(new Animated.Value(0.5)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Анимация появления — один раз
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start()
  }, [opacityAnim, scaleAnim])

  // Таймер — один раз (не зависит от props/state)
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)

          // дать показать "GO!" и затем закрыть
          setTimeout(() => {
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start(() => onCompleteRef.current())
          }, 300)

          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [opacityAnim])

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.instructions}>{instructions}</Text>
      <Text style={styles.countdown}>{countdown > 0 ? countdown : 'GO!'}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: 'white', fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  instructions: { color: '#ddd', fontSize: 18, textAlign: 'center', marginBottom: 40 },
  countdown: { color: '#FFDE00', fontSize: 96, fontWeight: '900' },
})

export default MinigameIntro
