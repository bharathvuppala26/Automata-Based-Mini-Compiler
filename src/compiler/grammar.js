// Simple grammar for our mini compiler

export const grammar = {
  Program: ["Statements"],

  Statements: ["Statement Statements'"],

  "Statements'": [
    "Statement Statements'",
    "ε"
  ],

  Statement: ["id = Expr ;"],

  Expr: ["Term Expr'"],

  "Expr'": [
    "+ Term Expr'",
    "- Term Expr'",
    "ε"
  ],

  Term: ["Factor Term'"],

  "Term'": [
    "* Factor Term'",
    "/ Factor Term'",
    "ε"
  ],

  Factor: [
    "id",
    "num",
    "( Expr )"
  ]
};

// FIRST sets

export const first = {
  Program: "{ id }",
  Statements: "{ id }",
  "Statements'": "{ id, ε }",
  Statement: "{ id }",
  Expr: "{ id, num, ( }",
  "Expr'": "{ +, -, ε }",
  Term: "{ id, num, ( }",
  "Term'": "{ *, /, ε }",
  Factor: "{ id, num, ( }"
};

// FOLLOW sets

export const follow = {
  Program: "{ $ }",
  Statements: "{ $ }",
  "Statements'": "{ $ }",
  Statement: "{ id, $ }",
  Expr: "{ ;, ) }",
  "Expr'": "{ ;, ) }",
  Term: "{ +, -, ;, ) }",
  "Term'": "{ +, -, ;, ) }",
  Factor: "{ *, /, +, -, ;, ) }"
};