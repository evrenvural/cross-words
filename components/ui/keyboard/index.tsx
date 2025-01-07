import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useEffect } from 'react';

import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
}

const KEYBOARD_LAYOUT = [
  ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
  ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', '⌫'],
];

export function Keyboard({ onKeyPress, onBackspace }: KeyboardProps) {
  const { height } = useWindowDimensions();
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);

  const handleKeyPress = (key: string) => {
    if (key === '⌫') {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    translateY.value = withSpring(0, {
      damping: 25,
      mass: 1,
      stiffness: 100,
      velocity: 0,
    });
    opacity.value = withTiming(1, { duration: 100 });

    return () => {
      translateY.value = withSpring(height, {
        damping: 25,
        mass: 1,
        stiffness: 100,
        velocity: 0,
      });
      opacity.value = withTiming(0, { duration: 100 });
    };
  }, []);

  return (
    <Animated.View
      style={animatedStyle}
      className="bg-gray-100 p-2 pb-8 shadow-lg border-t border-gray-300"
    >
      {KEYBOARD_LAYOUT.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row justify-center my-1">
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => handleKeyPress(key)}
              className={`
                ${key === '⌫' ? 'w-[60px]' : 'w-[32px]'}
                h-[45px]
                bg-white
                rounded-lg
                mx-0.5
                items-center
                justify-center
                shadow-sm
                border
                border-gray-200
                active:bg-gray-200
              `}
              activeOpacity={0.7}
            >
              <Text className="text-lg font-semibold text-black">{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </Animated.View>
  );
}
