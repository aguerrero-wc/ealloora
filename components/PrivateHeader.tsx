// components/PrivateHeader.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import colors from '../constants/Colors';

interface PrivateHeaderProps {
  title: string;
  showBack?: boolean;
  showProfile?: boolean;
  onBackPress?: () => void;
  rightAction?: {
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
  };
}

const PrivateHeader: React.FC<PrivateHeaderProps> = ({
  title,
  showBack = false,
  showProfile = true,
  onBackPress,
  rightAction,
}) => {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleProfilePress = () => {
    router.navigate('/user-profile' as any);
  };

  return (
    <View style={styles.header}>
      {/* Left Side */}
      <View style={styles.leftSide}>
        {showBack ? (
          <Pressable onPress={handleBackPress} style={styles.actionButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primaryButton} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {/* Title */}
      <Text style={styles.headerTitle}>{title}</Text>

      {/* Right Side */}
      <View style={styles.rightSide}>
        {rightAction ? (
          <Pressable onPress={rightAction.onPress} style={styles.actionButton}>
            <MaterialIcons name={rightAction.icon} size={24} color={colors.primaryButton} />
          </Pressable>
        ) : showProfile ? (
          <Pressable onPress={handleProfilePress} style={styles.actionButton}>
            <MaterialIcons name="account-circle" size={24} color={colors.primaryButton} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  leftSide: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightSide: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
    flex: 1,
  },
  actionButton: {
    padding: 8,
  },
  spacer: {
    width: 40,
  },
});

export default PrivateHeader;