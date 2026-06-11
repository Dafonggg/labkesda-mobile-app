import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface SamplingStepperProps {
  /** Current active step (1-based) */
  currentStep: number;
  steps?: string[];
}

export function SamplingStepper({
  currentStep,
  steps = ['Lokasi', 'Parameter', 'Dokumentasi', 'Serah Terima'],
}: SamplingStepperProps) {
  return (
    <View style={styles.container}>
      {/* Background line */}
      <View style={styles.bgLine} />
      {/* Progress line */}
      <View
        style={[
          styles.progressLine,
          {
            width:
              currentStep >= steps.length
                ? '100%'
                : `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          },
        ]}
      />

      {/* Step circles */}
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;

        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.circle,
                isCompleted && styles.circleCompleted,
                isActive && styles.circleActive,
                isPending && styles.circlePending,
              ]}
            >
              <Text
                style={[
                  styles.circleText,
                  (isCompleted || isActive) && styles.circleTextActive,
                ]}
              >
                {isCompleted ? '✓' : stepNumber}
              </Text>
            </View>
            <Text
              style={[
                styles.label,
                (isActive || isCompleted) && styles.labelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    position: 'relative',
    marginBottom: 8,
  },
  bgLine: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 16,
    height: 2,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 1,
    zIndex: 0,
  },
  progressLine: {
    position: 'absolute',
    left: 40,
    top: 16,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    zIndex: 1,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.creamBg,
  },
  circleCompleted: {
    backgroundColor: Colors.primary,
  },
  circleActive: {
    backgroundColor: Colors.primaryContainer,
  },
  circlePending: {
    backgroundColor: Colors.surfaceContainer,
  },
  circleText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
  },
  circleTextActive: {
    color: Colors.onPrimary,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceVariant,
  },
  labelActive: {
    color: Colors.primary,
  },
});
