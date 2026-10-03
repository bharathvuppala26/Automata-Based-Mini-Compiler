// ==========================================
// AUTOMATA-BASED MINI COMPILER
// Lexical Analyzer
// ==========================================

// Check whether a character is a letter
function isLetter(ch) {
  return /[A-Za-z_]/.test(ch);
}

// Check whether a character is a digit
function isDigit(ch) {
  return /[0-9]/.test(ch);
}

// DFA for identifiers
// Identifier = letter/underscore followed by
// letters, digits or underscores
export function validateIdentifier(word) {
  if (!word || !isLetter(word[0])) {
    return false;
  }

  for (let i = 1; i < word.length; i++) {
    if (!isLetter(word[i]) && !isDigit(word[i])) {
      return false;
    }
  }

  return true;
}

// Keywords of our simple language
const keywords = new Set([
  "if",
  "else",
  "while",
  "print",
  "int"
]);

// Tokenize source code
export function tokenize(source) {
  const tokens = [];
  let i = 0;

  while (i < source.length) {

    // -----------------------------
    // Ignore spaces, tabs, newlines
    // -----------------------------
    if (/\s/.test(source[i])) {
      i++;
      continue;
    }

    // -----------------------------
    // Ignore single-line comments
    // -----------------------------
    if (source[i] === "/" && source[i + 1] === "/") {
      i += 2;

      while (i < source.length && source[i] !== "\n") {
        i++;
      }

      continue;
    }

    // -----------------------------
    // Ignore multi-line comments
    // -----------------------------
    if (source[i] === "/" && source[i + 1] === "*") {
      i += 2;

      while (
        i < source.length &&
        !(source[i] === "*" && source[i + 1] === "/")
      ) {
        i++;
      }

      i += 2;
      continue;
    }

    // -----------------------------
    // Identifier / Keyword
    // -----------------------------
    if (isLetter(source[i])) {

      let start = i;

      while (
        i < source.length &&
        (isLetter(source[i]) || isDigit(source[i]))
      ) {
        i++;
      }

      const lexeme = source.slice(start, i);

      if (keywords.has(lexeme)) {
        tokens.push({
          lexeme,
          token: "KEYWORD"
        });
      } else {
        tokens.push({
          lexeme,
          token: "IDENTIFIER"
        });
      }

      continue;
    }

    // -----------------------------
    // Number
    // -----------------------------
    if (isDigit(source[i])) {

      let start = i;

      while (i < source.length && isDigit(source[i])) {
        i++;
      }

      const lexeme = source.slice(start, i);

      tokens.push({
        lexeme,
        token: "NUMBER"
      });

      continue;
    }

    // -----------------------------
    // Operators
    // -----------------------------

    const operators = {
      "+": "PLUS",
      "-": "MINUS",
      "*": "MULTIPLY",
      "/": "DIVIDE",
      "=": "ASSIGN",
      ">": "GREATER",
      "<": "LESS"
    };

    if (operators[source[i]]) {

      tokens.push({
        lexeme: source[i],
        token: operators[source[i]]
      });

      i++;
      continue;
    }

    // -----------------------------
    // Symbols
    // -----------------------------

    const symbols = {
      ";": "SEMICOLON",
      "(": "LPAREN",
      ")": "RPAREN",
      "{": "LBRACE",
      "}": "RBRACE"
    };

    if (symbols[source[i]]) {

      tokens.push({
        lexeme: source[i],
        token: symbols[source[i]]
      });

      i++;
      continue;
    }

    // -----------------------------
    // Unknown character
    // -----------------------------

    tokens.push({
      lexeme: source[i],
      token: "UNKNOWN"
    });

    i++;
  }

  return tokens;
}