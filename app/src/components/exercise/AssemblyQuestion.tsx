import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from '../ui/Chip';
import { colors, spacing, radii } from '../../theme';
import { hapticTap } from '../../services/haptics';

interface AssemblyQuestionProps {
  fragments: string[];
  distractors: string[];
  answer: string[];
  onAnswer: (correct: boolean) => void;
}

/** 碎片式的拖拽组装题型，从 diagnostic.tsx 中抽出。 */
export function AssemblyQuestion({ fragments, distractors, answer, onAnswer }: AssemblyQuestionProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [usedFragments, setUsedFragments] = React.useState<Set<string>>(new Set());
  const answeredRef = useRef(false);

  const allFragments = React.useMemo(
    () => [...fragments, ...distractors].sort(() => Math.random() - 0.5),
    [fragments.join(','), distractors.join(',')]
  );

  const handleSelect = async (frag: string) => {
    if (usedFragments.has(frag) || answeredRef.current) return;
    await hapticTap();

    const newSelected = [...selected, frag];
    const newUsed = new Set(usedFragments);
    newUsed.add(frag);
    setSelected(newSelected);
    setUsedFragments(newUsed);

    if (newSelected.length === answer.length) {
      answeredRef.current = true;
      const isCorrect = newSelected.every((s, i) => s === answer[i]);
      setTimeout(() => onAnswer(isCorrect), 300);
    }
  };

  const handleRemove = (index: number) => {
    if (answeredRef.current) return;
    const removed = selected[index];
    const newSelected = [...selected];
    newSelected.splice(index, 1);
    const newUsed = new Set(usedFragments);
    newUsed.delete(removed);
    setSelected(newSelected);
    setUsedFragments(newUsed);
  };

  return (
    <>
      {/* 答案区域：弥散阴影底色分隔，不使用 border */}
      <View style={styles.answerArea}>
        {selected.map((frag, i) => (
          <Chip
            key={`sel-${i}`}
            label={frag}
            variant="inAnswer"
            onPress={() => handleRemove(i)}
          />
        ))}
      </View>

      {/* 碎片池 */}
      <View style={styles.fragmentsPool}>
        {allFragments.map((frag, i) => (
          <Chip
            key={`frag-${i}`}
            label={frag}
            variant="fragment"
            disabled={usedFragments.has(frag)}
            onPress={() => handleSelect(frag)}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  answerArea: {
    minHeight: 56,
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fragmentsPool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 340,
  },
});
