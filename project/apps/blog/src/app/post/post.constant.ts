export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 25;
export const SEARCH_LIMIT = 20;

// Требования к тегам (раздел «Теги к публикациям»): одно слово без пробелов,
// начинается с буквы, длина 3–10 символов. Регистр и дубли нормализует сервис.
export const MAX_TAGS_COUNT = 8;
export const TAG_PATTERN = /^\p{L}[^\s]{2,9}$/u;
export const TAG_VALIDATION_MESSAGE =
  'each tag must be a single word of 3-10 characters starting with a letter';
