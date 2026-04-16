export const POS_OPTIONS = [
  { value: "noun", label: "명사" },
  { value: "verb", label: "동사" },
  { value: "adjective", label: "형용사" },
  { value: "adverb", label: "부사" }
];

export const TONE_OPTIONS = [
  { value: "positive", label: "긍정적" },
  { value: "neutral", label: "중립적" },
  { value: "negative", label: "부정적" }
];

export const TAG_OPTIONS = {
  noun: [
    { value: "object", label: "사물" },
    { value: "place", label: "장소" },
    { value: "person", label: "인물" },
    { value: "emotion", label: "감정" },
    { value: "concept", label: "개념" }
  ],
  verb: [
    { value: "action", label: "행동" },
    { value: "movement", label: "이동" },
    { value: "change", label: "변화" },
    { value: "thinking", label: "사고" },
    { value: "relation", label: "관계" }
  ],
  adjective: [
    { value: "quality", label: "성질" },
    { value: "feeling", label: "감정" },
    { value: "state", label: "상태" },
    { value: "atmosphere", label: "분위기" }
  ],
  adverb: [
    { value: "manner", label: "방식" },
    { value: "degree", label: "정도" },
    { value: "time", label: "시간" }
  ]
};

export function getTagLabel(pos, tagValue) {
  const options = TAG_OPTIONS[pos] || [];
  const found = options.find((item) => item.value === tagValue);
  return found ? found.label : tagValue;
}

export function getPosLabel(value) {
  return POS_OPTIONS.find((item) => item.value === value)?.label || value;
}

export function getToneLabel(value) {
  return TONE_OPTIONS.find((item) => item.value === value)?.label || value;
}
