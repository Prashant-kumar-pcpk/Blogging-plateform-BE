const bannedPatterns = [/buy now/i, /free money/i, /http(s)?:\/\/\S+/i, /whatsapp number/i];

const evaluateSpam = (text = "") => {
  const score = bannedPatterns.reduce(
    (count, pattern) => (pattern.test(text) ? count + 1 : count),
    0
  );

  return {
    isSpam: score >= 2 || text.length < 2,
    score,
  };
};

module.exports = evaluateSpam;
