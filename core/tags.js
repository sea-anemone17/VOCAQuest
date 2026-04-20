export const POS_OPTIONS = [
  { value: 'noun', label: '명사' },
  { value: 'verb', label: '동사' },
  { value: 'adj', label: '형용사' },
  { value: 'adv', label: '부사' },
  { value: 'phrase', label: '표현' },
  { value: 'other', label: '기타' }
];

export const TONE_OPTIONS = [
  { value: 'neutral', label: '중립' },
  { value: 'formal', label: '격식' },
  { value: 'casual', label: '구어' },
  { value: 'literary', label: '문어' }
];

export const TAG_OPTIONS = [
  { value: 'exam', label: '시험' },
  { value: 'daily', label: '일상' },
  { value: 'academic', label: '학술' },
  { value: 'emotion', label: '감정' },
  { value: 'logic', label: '논리' },
  { value: 'story', label: '서사' }
];

export function getPosLabel(value) {
  return POS_OPTIONS.find((item) => item.value === value)?.label || '기타';
}

export function getToneLabel(value) {
  return TONE_OPTIONS.find((item) => item.value === value)?.label || '중립';
}

export function getTagLabel(_pos, value) {
  return TAG_OPTIONS.find((item) => item.value === value)?.label || value || '태그';
}
