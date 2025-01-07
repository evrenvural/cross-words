import cn from 'classnames';
import Animated from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useState } from 'react';

import { Keyboard as NativeKeyboard, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { Keyboard } from '../components/ui/keyboard';

interface WordPlaced {
  answer: string;
  description: string;
  startX: number;
  startY: number;
  orientation: 'horizontal' | 'vertical';
  coords: [number, number][];
}

interface PuzzleData {
  grid: { [key: string]: string };
  wordsPlaced: WordPlaced[];
  missingWords: string[];
  blanks: number;
  columns: number;
  rows: number;
}

interface UserAnswers {
  [key: string]: string;
}

interface InputRefs {
  [key: string]: TextInput | null;
}

interface ActiveQuestion {
  word: WordPlaced;
  index: number;
}

const PUZZLE_DATA: PuzzleData = {
  grid: {
    '0_0': 'E',
    '0_1': 'L',
    '0_2': 'M',
    '0_3': 'A',
    '0_4': 'A',
    '1_0': 'M',
    '1_1': 'O',
    '1_2': 'R',
    '1_3': 'I',
    '1_4': 'Ş',
    '2_0': 'İ',
    '2_1': 'R',
    '2_2': 'A',
    '2_3': 'B',
    '2_4': 'K',
    '3_0': 'R',
    '3_1': 'A',
    '3_2': 'N',
    '3_3': 'A',
    '3_4': 'A',
    '4_0': 'A',
    '4_1': 'L',
    '4_2': 'U',
    '4_3': 'L',
    '4_4': 'S',
  },
  wordsPlaced: [
    {
      answer: 'ELMA',
      description: 'Bir meyve',
      startX: 0,
      startY: 0,
      orientation: 'horizontal',
      coords: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    },
    {
      answer: 'MOR',
      description: 'Bir renk',
      startX: 1,
      startY: 1,
      orientation: 'horizontal',
      coords: [
        [1, 1],
        [1, 2],
        [1, 3],
      ],
    },
    {
      answer: 'ARI',
      description: 'Bir hayvan',
      startX: 2,
      startY: 2,
      orientation: 'horizontal',
      coords: [
        [2, 2],
        [2, 3],
        [2, 4],
      ],
    },
    {
      answer: 'ARABA',
      description: 'Bir araç',
      startX: 3,
      startY: 2,
      orientation: 'horizontal',
      coords: [
        [3, 0],
        [3, 1],
        [3, 2],
        [3, 3],
        [3, 4],
      ],
    },
    {
      answer: 'BURSA',
      description: 'Bir şehir',
      startX: 4,
      startY: 0,
      orientation: 'horizontal',
      coords: [
        [4, 0],
        [4, 1],
        [4, 2],
        [4, 3],
        [4, 4],
      ],
    },
    {
      answer: 'EMİR',
      description: 'Bir eşya',
      startX: 0,
      startY: 0,
      orientation: 'vertical',
      coords: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
    },
    {
      answer: 'MARUL',
      description: 'Bir sebze',
      startX: 1,
      startY: 1,
      orientation: 'vertical',
      coords: [
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
      ],
    },
    {
      answer: 'İRAN',
      description: 'Bir ülke',
      startX: 2,
      startY: 2,
      orientation: 'vertical',
      coords: [
        [2, 2],
        [3, 2],
        [4, 2],
      ],
    },
    {
      answer: 'ASİL',
      description: 'Bir sıfat',
      startX: 1,
      startY: 3,
      orientation: 'vertical',
      coords: [
        [1, 3],
        [2, 3],
        [3, 3],
        [4, 3],
      ],
    },
    {
      answer: 'AŞK',
      description: 'Bir his',
      startX: 0,
      startY: 4,
      orientation: 'vertical',
      coords: [
        [0, 4],
        [1, 4],
        [2, 4],
      ],
    },
  ],
  missingWords: [],
  blanks: 3,
  columns: 5,
  rows: 5,
};

function Game() {
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Sonraki hücreyi bulma fonksiyonu
  const findNextCell = (currentRow: number, currentCol: number): string | null => {
    // Yatay kelime kontrolü
    const horizontalWord = PUZZLE_DATA.wordsPlaced.find(
      (word) =>
        word.orientation === 'horizontal' &&
        word.coords.some(([row, col]) => row === currentRow && col === currentCol)
    );

    if (horizontalWord) {
      const currentIndex = horizontalWord.coords.findIndex(
        ([row, col]) => row === currentRow && col === currentCol
      );
      if (currentIndex < horizontalWord.coords.length - 1) {
        const [nextRow, nextCol] = horizontalWord.coords[currentIndex + 1];
        return `${nextRow}_${nextCol}`;
      }
    }

    // Dikey kelime kontrolü
    const verticalWord = PUZZLE_DATA.wordsPlaced.find(
      (word) =>
        word.orientation === 'vertical' &&
        word.coords.some(([row, col]) => row === currentRow && col === currentCol)
    );

    if (verticalWord) {
      const currentIndex = verticalWord.coords.findIndex(
        ([row, col]) => row === currentRow && col === currentCol
      );
      if (currentIndex < verticalWord.coords.length - 1) {
        const [nextRow, nextCol] = verticalWord.coords[currentIndex + 1];
        return `${nextRow}_${nextCol}`;
      }
    }

    return null;
  };

  // Önceki hücreyi bulma fonksiyonu
  const findPreviousCell = (currentRow: number, currentCol: number): string | null => {
    // Yatay kelime kontrolü
    const horizontalWord = PUZZLE_DATA.wordsPlaced.find(
      (word) =>
        word.orientation === 'horizontal' &&
        word.coords.some(([row, col]) => row === currentRow && col === currentCol)
    );

    if (horizontalWord) {
      const currentIndex = horizontalWord.coords.findIndex(
        ([row, col]) => row === currentRow && col === currentCol
      );
      if (currentIndex > 0) {
        const [prevRow, prevCol] = horizontalWord.coords[currentIndex - 1];
        return `${prevRow}_${prevCol}`;
      }
    }

    // Dikey kelime kontrolü
    const verticalWord = PUZZLE_DATA.wordsPlaced.find(
      (word) =>
        word.orientation === 'vertical' &&
        word.coords.some(([row, col]) => row === currentRow && col === currentCol)
    );

    if (verticalWord) {
      const currentIndex = verticalWord.coords.findIndex(
        ([row, col]) => row === currentRow && col === currentCol
      );
      if (currentIndex > 0) {
        const [prevRow, prevCol] = verticalWord.coords[currentIndex - 1];
        return `${prevRow}_${prevCol}`;
      }
    }

    return null;
  };

  const handleKeyPress = (key: string) => {
    if (!selectedCell) return;

    const [rowIndex, colIndex] = selectedCell.split('_').map(Number);

    if (key.length === 1) {
      setUserAnswers((prev) => ({
        ...prev,
        [selectedCell]: key,
      }));

      // Sonraki hücreyi bul ve seç
      const nextCellKey = findNextCell(rowIndex, colIndex);
      if (nextCellKey) {
        setSelectedCell(nextCellKey);
      }
    }
  };

  const handleBackspace = () => {
    if (!selectedCell) return;

    const [rowIndex, colIndex] = selectedCell.split('_').map(Number);

    if (!userAnswers[selectedCell]) {
      // Eğer mevcut hücre boşsa
      const prevCellKey = findPreviousCell(rowIndex, colIndex);
      if (prevCellKey) {
        setUserAnswers((prev) => ({
          ...prev,
          [prevCellKey]: '',
        }));
        setSelectedCell(prevCellKey);
      }
    } else {
      // Mevcut hücredeki harfi sil
      setUserAnswers((prev) => ({
        ...prev,
        [selectedCell]: '',
      }));
    }
  };

  const handleCellPress = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}_${colIndex}`;
    setSelectedCell(cellKey);
    setIsKeyboardVisible(true);
    NativeKeyboard.dismiss();

    // Seçili hücrenin bulunduğu kelimeyi bul
    const selectedWords = PUZZLE_DATA.wordsPlaced.filter((word) =>
      word.coords.some(([row, col]) => row === rowIndex && col === colIndex)
    );

    if (selectedWords.length > 0) {
      const wordIndex = PUZZLE_DATA.wordsPlaced.findIndex((w) => w === selectedWords[0]);
      setActiveQuestion({ word: selectedWords[0], index: wordIndex + 1 });
    }
  };

  const handleCancel = () => {
    setSelectedCell(null);
    setIsKeyboardVisible(false);
    setActiveQuestion(null);
    setShowHint(false);
  };

  const handleHint = () => {
    setShowHint(true);
  };

  const handleComplete = () => {
    setSelectedCell(null);
    setIsKeyboardVisible(false);
    setActiveQuestion(null);
    setShowHint(false);
  };

  const renderCell = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}_${colIndex}`;
    const correctLetter = PUZZLE_DATA.grid[cellKey];
    const isBlank = correctLetter === '@';
    const isSelected = selectedCell === cellKey;

    // Seçili hücrenin bulunduğu kelimeyi bul
    const selectedWord = selectedCell
      ? PUZZLE_DATA.wordsPlaced.find((word) =>
          word.coords.some(([row, col]) => `${row}_${col}` === selectedCell)
        )
      : null;

    // Hücrenin seçili kelimede olup olmadığını kontrol et
    const isPartOfSelectedWord = selectedWord?.coords.some(
      ([row, col]) => row === rowIndex && col === colIndex
    );

    const wordStart = PUZZLE_DATA.wordsPlaced.find(
      (word) => word.startX === rowIndex && word.startY === colIndex
    );

    const questionNumber =
      PUZZLE_DATA.wordsPlaced.findIndex(
        (word) => word.startX === rowIndex && word.startY === colIndex
      ) + 1;

    const userAnswer = userAnswers[cellKey] || '';
    const isCorrect = userAnswer.toLowerCase() === correctLetter.toLowerCase();

    if (isBlank) {
      return (
        <View
          key={`cell-${rowIndex}-${colIndex}`}
          className="w-[45px] h-[45px] bg-black border border-black"
        />
      );
    }

    const cellClassName = cn('w-[45px] h-[45px]', 'relative', {
      'bg-[#90EE90]': userAnswer && isCorrect,
      'bg-white': !userAnswer || !isCorrect,
      'border-2 border-blue-500': isSelected,
      'border-2 border-blue-300': !isSelected && isPartOfSelectedWord,
      'border border-black': !isSelected && !isPartOfSelectedWord,
      'bg-blue-50': isPartOfSelectedWord,
    });

    return (
      <TouchableOpacity
        key={`cell-${rowIndex}-${colIndex}`}
        onPress={(e) => {
          e.stopPropagation();
          handleCellPress(rowIndex, colIndex);
        }}
        className={cellClassName}
      >
        {wordStart && (
          <View className="absolute top-0.5 left-0.5 flex-row items-center bg-white/80 p-0.5 rounded z-10">
            <Text className="text-[8px] font-bold text-black mr-0.5">{questionNumber}</Text>
            <Text className="text-[8px] text-black">
              {wordStart.orientation === 'horizontal' ? '→' : '↓'}
            </Text>
          </View>
        )}
        <Text className="w-full h-full text-center text-xl font-bold text-black uppercase leading-[45px]">
          {userAnswer}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <TouchableOpacity activeOpacity={1} onPress={handleCancel} className="flex-1">
        {/* Header */}
        <View className="p-4 border-b border-black flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-black">Çengel Bulmaca</Text>
          <TouchableOpacity
            onPress={() => {
              setUserAnswers({});
              setSelectedCell(null);
              setIsKeyboardVisible(false);
            }}
            className={cn('bg-black', 'px-3', 'py-2', 'rounded-lg')}
            activeOpacity={0.7}
          >
            <Text className="text-white font-medium text-sm">Sıfırla</Text>
          </TouchableOpacity>
        </View>

        {/* Puzzle Grid */}
        <View className={cn('flex-1', 'p-4', 'bg-white')}>
          <View className="items-center justify-center flex-1">
            {activeQuestion && (
              <View className="bg-white p-4 rounded-lg shadow-lg mb-4 w-full">
                <Text className="text-lg font-bold text-black mb-2">
                  Soru {activeQuestion.index}
                </Text>
                <Text className="text-black">{activeQuestion.word.description}</Text>
                {showHint && (
                  <Text className="text-blue-500 mt-2">
                    İpucu: {activeQuestion.word.answer.length} harf
                  </Text>
                )}
              </View>
            )}
            <View className="bg-white border-2 border-black">
              {[...Array(PUZZLE_DATA.rows)].map((_, rowIndex) => (
                <View key={`row-${rowIndex}`} className="flex-row">
                  {[...Array(PUZZLE_DATA.columns)].map((_, colIndex) =>
                    renderCell(rowIndex, colIndex)
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Keyboard and Controls */}
        <Animated.View className="absolute bottom-0 left-0 right-0">
          {isKeyboardVisible && (
            <>
              <View className="flex-row justify-between bg-gray-100 px-4 py-2">
                <TouchableOpacity
                  onPress={handleCancel}
                  className="bg-orange-500 px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleHint}
                  className="bg-orange-500 px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">İpucu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleComplete}
                  className="bg-green-500 px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Tamam</Text>
                </TouchableOpacity>
              </View>
              <Keyboard onKeyPress={handleKeyPress} onBackspace={handleBackspace} />
            </>
          )}
        </Animated.View>
        <StatusBar style="dark" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function Home() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Game />
    </SafeAreaProvider>
  );
}
