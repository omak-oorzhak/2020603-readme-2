export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 25;
export const SEARCH_LIMIT = 20;

// Требования к тегам (раздел «Теги к публикациям») дублируются локально:
// кросс-импорты между приложениями запрещены, как и в common/upload.constant.ts.
export const MAX_TAGS_COUNT = 8;
export const TAG_PATTERN = /^\p{L}[^\s]{2,9}$/u;
export const TAG_VALIDATION_MESSAGE =
  'each tag must be a single word of 3-10 characters starting with a letter';
