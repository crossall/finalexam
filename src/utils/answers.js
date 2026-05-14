export const normalizeAnswer = (value = '') =>
  String(value)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

export const getAcceptedAnswers = (question) =>
  [question.answer, ...(question.aliases ?? [])]
    .map(normalizeAnswer)
    .filter(Boolean);

export const isAcceptedAnswer = (value, question) => {
  const normalizedValue = normalizeAnswer(value);

  if (!normalizedValue) {
    return false;
  }

  return getAcceptedAnswers(question).includes(normalizedValue);
};

export const getLiveAnswerState = (value, question) => {
  const normalizedValue = normalizeAnswer(value);

  if (!normalizedValue) {
    return 'idle';
  }

  const acceptedAnswers = getAcceptedAnswers(question);

  if (acceptedAnswers.includes(normalizedValue)) {
    return 'correct';
  }

  if (acceptedAnswers.some((answer) => answer.startsWith(normalizedValue))) {
    return 'partial';
  }

  return 'incorrect';
};

