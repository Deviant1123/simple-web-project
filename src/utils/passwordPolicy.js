// Требование варианта 10: наличие латиницы, кириллицы и цифр
const latinRegex = /[A-Za-z]/;
const cyrillicRegex = /[\u0400-\u04FF]/;
const digitRegex = /[0-9]/;

function passwordMeetsPolicy(password) {
  if (!password) return false;
  return (
    latinRegex.test(password) &&
    cyrillicRegex.test(password) &&
    digitRegex.test(password)
  );
}

module.exports = { passwordMeetsPolicy };


