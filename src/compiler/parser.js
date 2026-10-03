export function predictiveParse(tokens) {
  const steps = [];
  let pos = 0;
  let error = "";

  // Convert lexer tokens into parser symbols
  const input = tokens.map((token) => {
    if (token.token === "IDENTIFIER") return "id";
    if (token.token === "NUMBER") return "num";

    if (token.token === "ASSIGN") return "=";
    if (token.token === "SEMICOLON") return ";";
    if (token.token === "PLUS") return "+";
    if (token.token === "MINUS") return "-";
    if (token.token === "MULTIPLY") return "*";
    if (token.token === "DIVIDE") return "/";
    if (token.token === "LPAREN") return "(";
    if (token.token === "RPAREN") return ")";

    return token.lexeme;
  });

  // MATCH function
  function match(symbol) {
    if (input[pos] === symbol) {
      steps.push(`MATCH ${symbol}`);
      pos++;
      return true;
    }

    error = `Expected '${symbol}'`;
    return false;
  }

  // FACTOR
  function factor() {

    if (input[pos] === "id") {
      steps.push("Factor → id");
      return match("id");
    }

    if (input[pos] === "num") {
      steps.push("Factor → num");
      return match("num");
    }

    if (input[pos] === "(") {

      steps.push("Factor → ( Expr )");

      if (!match("(")) return false;

      if (!expr()) return false;

      if (!match(")")) return false;

      return true;
    }

    error = "Invalid factor";
    return false;
  }

  // TERM
  function term() {

    steps.push("Term → Factor Term'");

    if (!factor()) return false;

    while (
      input[pos] === "*" ||
      input[pos] === "/"
    ) {

      const op = input[pos];

      steps.push(`Term' → ${op} Factor Term'`);

      if (!match(op)) return false;

      if (!factor()) return false;
    }

    return true;
  }

  // EXPRESSION
  function expr() {

    steps.push("Expr → Term Expr'");

    if (!term()) return false;

    while (
      input[pos] === "+" ||
      input[pos] === "-"
    ) {

      const op = input[pos];

      steps.push(`Expr' → ${op} Term Expr'`);

      if (!match(op)) return false;

      if (!term()) return false;
    }

    return true;
  }

  // ASSIGNMENT STATEMENT
  function assignmentStatement() {

    steps.push("Statement → id = Expr ;");

    if (!match("id")) return false;

    if (!match("=")) return false;

    if (!expr()) return false;

    if (!match(";")) return false;

    return true;
  }

  // PRINT STATEMENT
  function printStatement() {

    steps.push("Statement → print ( Expr ) ;");

    // The lexer identifies print as an IDENTIFIER
    if (
      !tokens[pos] ||
      tokens[pos].lexeme !== "print"
    ) {
      error = "Expected 'print'";
      return false;
    }

    // Consume print
    steps.push("MATCH print");
    pos++;

    // (
    if (!match("(")) return false;

    // Expression
    if (!expr()) return false;

    // )
    if (!match(")")) return false;

    // ;
    if (!match(";")) return false;

    return true;
  }

  // STATEMENT
  function statement() {

    // Check actual lexeme because print is an IDENTIFIER
    if (
      tokens[pos] &&
      tokens[pos].lexeme === "print"
    ) {
      return printStatement();
    }

    return assignmentStatement();
  }

  // PROGRAM
  while (pos < input.length) {

    if (!statement()) {
      return {
        accepted: false,
        steps,
        error
      };
    }
  }

  return {
    accepted: true,
    steps,
    error: "Input accepted"
  };
}