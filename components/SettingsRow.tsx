import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';

type RightType = 'chevron' | 'toggle' | 'badge' | 'text' | 'custom';

interface SettingsRowProps {
  /** MaterialCommunityIcons icon name */
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  rightType?: RightType;
  /** For toggle: current value */
  toggleValue?: boolean;
  /** For toggle: change handler */
  onToggleChange?: (value: boolean) => void;
  /** For badge: text content */
  badgeText?: string;
  badgeColor?: string;
  /** For text: right-side text */
  rightText?: string;
  /** For custom: any right element */
  rightElement?: React.ReactNode;
  /** For non-toggle rows: press handler */
  onPress?: () => void;
  /** Additional bottom content (e.g. progress bar) */
  bottomContent?: React.ReactNode;
}

export function SettingsRow({
  icon,
  iconColor = Colors.primaryContainer,
  title,
  subtitle,
  rightType = 'chevron',
  toggleValue,
  onToggleChange,
  badgeText,
  badgeColor = Colors.statusSuccess,
  rightText,
  rightElement,
  onPress,
  bottomContent,
}: SettingsRowProps) {
  const isToggle = rightType === 'toggle';

  const content = (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {/* Right element */}
        {rightType === 'chevron' && (
          <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
        )}
        {rightType === 'toggle' && (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            trackColor={{
              false: Colors.surfaceContainerHighest,
              true: Colors.primaryContainer,
            }}
            thumbColor={Colors.surfaceContainerLowest}
            ios_backgroundColor={Colors.surfaceContainerHighest}
          />
        )}
        {rightType === 'badge' && badgeText ? (
          <View style={styles.rightRow}>
            <View style={[styles.badge, { backgroundColor: `${badgeColor}15` }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.outline} />
          </View>
        ) : null}
        {rightType === 'text' && rightText ? (
          <Text style={styles.rightText}>{rightText}</Text>
        ) : null}
        {rightType === 'custom' && rightElement ? rightElement : null}
      </View>
      {bottomContent ? <View style={styles.bottomContent}>{bottomContent}</View> : null}
    </View>
  );

  if (isToggle) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.outline,
  },
  bottomContent: {
    marginTop: 12,
    paddingLeft: 56, // icon width + gap
  },
});
