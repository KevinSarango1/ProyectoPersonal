export const validation = {
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: string) => /^09\d{8}$/.test(value),
  onlyLetters: (value: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value),
  password: (value: string) => value.length >= 6 && value.length <= 20,
  dateNotFuture: (value: string) => new Date(value) <= new Date(),
  dateMinYear: (value: string, min = 1900) => new Date(value).getFullYear() >= min,
};
