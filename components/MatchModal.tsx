import { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ProfileCardData } from '@/components/ProfileCard';

type Props = {
  matchedProfile: ProfileCardData;
  currentUserProfile: ProfileCardData | null;
  onKeepSwiping: () => void;
};

export default function MatchModal({ matchedProfile, currentUserProfile, onKeepSwiping }: Props) {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 16, stiffness: 180 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const myPhoto = currentUserProfile?.photos[0]?.url ?? null;
  const theirPhoto = matchedProfile.photos[0]?.url ?? null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, containerStyle]}>
        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={styles.heading}>It's a Match!</Text>
          <Text style={styles.subheading}>
            You and {matchedProfile.name ?? 'someone'} liked each other
          </Text>

          <View style={styles.avatarRow}>
            <AvatarCircle uri={myPhoto} />
            <View style={styles.heartBadge}>
              <Ionicons name="heart" size={24} color="#fff" />
            </View>
            <AvatarCircle uri={theirPhoto} />
          </View>

          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => {
              onKeepSwiping();
              router.push('/(tabs)/matches' as never);
            }}
          >
            <Text style={styles.messageButtonText}>Send a Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keepSwipingButton} onPress={onKeepSwiping}>
            <Text style={styles.keepSwipingText}>Keep Swiping</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function AvatarCircle({ uri }: { uri: string | null }) {
  return (
    <View style={styles.avatarCircle}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} contentFit="cover" />
      ) : (
        <Ionicons name="person" size={48} color="#C0C0C0" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(66,145,219,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  heading: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 40,
    textAlign: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  heartBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginHorizontal: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  messageButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4291db',
  },
  keepSwipingButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  keepSwipingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
