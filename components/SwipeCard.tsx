import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import ProfileCard from '@/components/ProfileCard';
import type { ProfileCardData } from '@/components/ProfileCard';

const SWIPE_THRESHOLD = 120;
const FLY_DURATION = 300;

export type SwipeCardRef = {
  swipeLeft: () => void;
  swipeRight: () => void;
};

type Props = {
  profile: ProfileCardData;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
  stackIndex: number;
};

const SwipeCard = forwardRef<SwipeCardRef, Props>(
  ({ profile, onSwipe, isTop, stackIndex }, ref) => {
    const { width: screenWidth } = useWindowDimensions();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    function flyOff(direction: 'left' | 'right') {
      'worklet';
      const target = direction === 'right' ? screenWidth * 1.5 : -screenWidth * 1.5;
      translateX.value = withTiming(target, { duration: FLY_DURATION }, () => {
        runOnJS(onSwipe)(direction);
      });
    }

    useImperativeHandle(ref, () => ({
      swipeLeft: () => flyOff('left'),
      swipeRight: () => flyOff('right'),
    }));

    const panGesture = Gesture.Pan()
      .enabled(isTop)
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY * 0.3;
      })
      .onEnd((e) => {
        if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
          flyOff(e.translationX > 0 ? 'right' : 'left');
        } else {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      });

    const stackScale = 1 - stackIndex * 0.04;
    const stackOffsetY = stackIndex * 10;

    const cardStyle = useAnimatedStyle(() => {
      const rotate = interpolate(
        translateX.value,
        [-screenWidth / 2, 0, screenWidth / 2],
        [-12, 0, 12],
        Extrapolation.CLAMP
      );
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: isTop ? translateY.value : stackOffsetY },
          { rotate: isTop ? `${rotate}deg` : '0deg' },
          { scale: isTop ? 1 : stackScale },
        ],
      };
    });

    const likeOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [30, 100], [0, 1], Extrapolation.CLAMP),
    }));

    const nopeOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(translateX.value, [-30, -100], [0, 1], Extrapolation.CLAMP),
    }));

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
          <ProfileCard profile={profile} />

          <Animated.View
            style={[styles.label, styles.likeLabel, likeOpacity]}
            pointerEvents="none"
          >
            <Animated.Text style={styles.likeLabelText}>LIKE</Animated.Text>
          </Animated.View>

          <Animated.View
            style={[styles.label, styles.nopeLabel, nopeOpacity]}
            pointerEvents="none"
          >
            <Animated.Text style={styles.nopeLabelText}>NOPE</Animated.Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }
);

SwipeCard.displayName = 'SwipeCard';
export default SwipeCard;

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    top: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: 8,
  },
  likeLabel: {
    left: 20,
    borderColor: '#4ade80',
    transform: [{ rotate: '-15deg' }],
  },
  likeLabelText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 2,
  },
  nopeLabel: {
    right: 20,
    borderColor: '#FF4458',
    transform: [{ rotate: '15deg' }],
  },
  nopeLabelText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF4458',
    letterSpacing: 2,
  },
});
