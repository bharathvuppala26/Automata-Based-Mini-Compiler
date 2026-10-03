import { useState } from "react";
import "./App.css";

import { tokenize } from "./compiler/lexer";
import { simulateIdentifierDFA } from "./compiler/dfa";
import { first, follow } from "./compiler/grammar";
import { predictiveParse } from "./compiler/parser";

/* =========================================================
   EXPRESSION PARSER
   ========================================================= */

function parseExpression(tokens) {
  let pos = 0;

  function parseFactor() {
    const token = tokens[pos];

    if (!token) return null;

    if (token === "(") {
      pos++;

      const node = parseAddSub();

      if (tokens[pos] === ")") {
        pos++;
      }

      return node;
    }

    pos++;

    return {
      value: token,
      left: null,
      right: null,
    };
  }

  function parseMulDiv() {
    let left = parseFactor();

    while (
      tokens[pos] === "*" ||
      tokens[pos] === "/"
    ) {
      const operator = tokens[pos++];
      const right = parseFactor();

      left = {
        value: operator,
        left,
        right,
      };
    }

    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();

    while (
      tokens[pos] === "+" ||
      tokens[pos] === "-"
    ) {
      const operator = tokens[pos++];
      const right = parseMulDiv();

      left = {
        value: operator,
        left,
        right,
      };
    }

    return left;
  }

  return parseAddSub();
}


/* =========================================================
   BUILD AST
   ========================================================= */

function buildAST(code) {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let assignment = null;

  for (const line of lines) {

    if (
      line.startsWith("print") ||
      !line.includes("=")
    ) {
      continue;
    }

    const cleanLine = line.replace(";", "");

    const equalIndex =
      cleanLine.indexOf("=");

    const variable =
      cleanLine
        .substring(0, equalIndex)
        .trim();

    const expression =
      cleanLine
        .substring(equalIndex + 1)
        .trim();

    if (!variable || !expression) {
      continue;
    }

    const expressionTokens =
      expression.match(
        /[A-Za-z_][A-Za-z0-9_]*|\d+|[()+\-*/]/g
      ) || [];

    const expressionTree =
      parseExpression(expressionTokens);

    assignment = {
      value: "=",

      left: {
        value: variable,
        left: null,
        right: null,
      },

      right: expressionTree,
    };
  }

  return assignment;
}


/* =========================================================
   AST NODE
   ========================================================= */

function ASTNode({ node }) {

  if (!node) return null;

  const isOperator =
    ["=", "+", "-", "*", "/"].includes(
      node.value
    );

  const isLeaf =
    !node.left && !node.right;

  return (
    <div className="ast-subtree">

      <div
        className={
          isOperator
            ? "ast-node ast-operator"
            : "ast-node ast-leaf"
        }
      >
        {node.value}
      </div>

      {!isLeaf && (
        <div className="ast-children">

          {node.left && (
            <div className="ast-child">
              <ASTNode node={node.left} />
            </div>
          )}

          {node.right && (
            <div className="ast-child">
              <ASTNode node={node.right} />
            </div>
          )}

        </div>
      )}

    </div>
  );
}


/* =========================================================
   THREE ADDRESS CODE
   ========================================================= */

function generateTAC(ast) {

  if (!ast) return [];

  const tac = [];

  let tempCount = 1;

  function generateExpression(node) {

    if (!node) return "";

    if (!node.left && !node.right) {
      return node.value;
    }

    const left =
      generateExpression(node.left);

    const right =
      generateExpression(node.right);

    const temp =
      `t${tempCount++}`;

    tac.push(
      `${temp} = ${left} ${node.value} ${right}`
    );

    return temp;
  }

  if (
    ast.value === "=" &&
    ast.left &&
    ast.right
  ) {

    const result =
      generateExpression(ast.right);

    tac.push(
      `${ast.left.value} = ${result}`
    );
  }

  return tac;
}


/* =========================================================
   TARGET CODE
   ========================================================= */

function generateTargetCode(ast) {

  if (!ast) return [];

  const target = [];

  let tempCount = 1;

  function generate(node) {

    if (!node) return "";

    if (!node.left && !node.right) {
      return node.value;
    }

    const left =
      generate(node.left);

    const right =
      generate(node.right);

    const temp =
      `t${tempCount++}`;

    target.push(
      `LOAD R1, ${left}`
    );

    if (node.value === "*") {
      target.push(
        `MUL  R1, ${right}`
      );
    }

    if (node.value === "/") {
      target.push(
        `DIV  R1, ${right}`
      );
    }

    if (node.value === "+") {
      target.push(
        `ADD  R1, ${right}`
      );
    }

    if (node.value === "-") {
      target.push(
        `SUB  R1, ${right}`
      );
    }

    target.push(
      `STORE ${temp}, R1`
    );

    return temp;
  }

  if (
    ast.value === "=" &&
    ast.left &&
    ast.right
  ) {

    const result =
      generate(ast.right);

    target.push(
      `STORE ${ast.left.value}, ${result}`
    );
  }

  return target;
}


/* =========================================================
   EXPRESSION DISPLAY
   ========================================================= */

function expressionToString(node) {

  if (!node) return "";

  if (!node.left && !node.right) {
    return node.value;
  }

  return `(${expressionToString(node.left)} ${node.value} ${expressionToString(node.right)})`;
}


/* =========================================================
   MAIN APP
   ========================================================= */

function App() {

  const [code, setCode] = useState(`a = 15;
b = 5;
c = a - b * 2;
print(c);`);

  const [compiled, setCompiled] =
    useState(false);

  const [tokens, setTokens] =
    useState([]);

  const [dfaResult, setDfaResult] =
    useState(null);

  const [parserResult, setParserResult] =
    useState(null);

  const [ast, setAst] =
    useState(null);

  const [tac, setTac] =
    useState([]);

  const [targetCode, setTargetCode] =
    useState([]);


  /* =======================================================
     COMPILE PROGRAM
     ======================================================= */

  function compileProgram() {

    /* ---------- LEXER ---------- */

    const result =
      tokenize(code);

    setTokens(result);


    /* ---------- DFA ---------- */

    const firstIdentifier =
      result.find(
        (item) =>
          item.token === "IDENTIFIER"
      );

    if (firstIdentifier) {

      const dfa =
        simulateIdentifierDFA(
          firstIdentifier.lexeme
        );

      setDfaResult(dfa);

    } else {

      setDfaResult(null);

    }


    /* ---------- PREDICTIVE PARSER ---------- */

    try {

      const parsed =
        predictiveParse(result);

      setParserResult(parsed);

    } catch (error) {

      console.error(
        "Predictive Parser Error:",
        error
      );

      setParserResult({
        accepted: false,

        steps: [
          {
            action:
              "Parser error occurred."
          }
        ]
      });
    }


    /* ---------- AST ---------- */

    const generatedAST =
      buildAST(code);

    setAst(generatedAST);


    /* ---------- TAC ---------- */

    const generatedTAC =
      generateTAC(generatedAST);

    setTac(generatedTAC);


    /* ---------- TARGET CODE ---------- */

    const generatedTargetCode =
      generateTargetCode(
        generatedAST
      );

    setTargetCode(
      generatedTargetCode
    );


    setCompiled(true);
  }


  return (
    <div className="app">

      {/* ===================================================
          HEADER
          =================================================== */}

      <header className="header">

        <div>

          <h1>
            🤖 Automata-Based Mini Compiler
          </h1>

          <p>
            Simple Programming Language
          </p>

        </div>

        <div className="status">
          ● Compiler Ready
        </div>

      </header>


      <main>

        {/* =================================================
            SOURCE CODE
            ================================================= */}

        <section className="card">

          <div className="section-title">

            <h2>
              📝 Source Code
            </h2>

            <span>
              Input Program
            </span>

          </div>

          <textarea
            value={code}
            onChange={(e) =>
              setCode(e.target.value)
            }
            spellCheck="false"
          />

          <button
            onClick={compileProgram}
          >
            Compile Program
          </button>

        </section>


        {compiled && (
          <>

            {/* =================================================
                LEXICAL ANALYSIS
                ================================================= */}

            <section className="card">

              <div className="section-title">

                <h2>
                  🔤 Lexical Analysis
                </h2>

                <span>
                  Tokens
                </span>

              </div>

              <div className="token-table">

                <div className="token-row token-header">

                  <span>
                    Lexeme
                  </span>

                  <span>
                    Token
                  </span>

                </div>

                {tokens.map(
                  (item, index) => (

                    <div
                      className="token-row"
                      key={index}
                    >

                      <span className="lexeme">
                        {item.lexeme}
                      </span>

                      <span
                        className={
                          item.token ===
                          "UNKNOWN"
                            ? "error-token"
                            : "token-name"
                        }
                      >
                        {item.token}
                      </span>

                    </div>

                  )
                )}

              </div>

              <p className="success">
                ✓ Lexical analysis completed
              </p>

            </section>


            {/* =================================================
                DFA
                ================================================= */}

            <section className="card">

              <div className="section-title">

                <h2>
                  🤖 Automata
                </h2>

                <span>
                  DFA Validation
                </span>

              </div>

              {dfaResult && (
                <>

                  <div className="dfa-input">

                    Testing Identifier:

                    <strong>
                      {
                        tokens.find(
                          (item) =>
                            item.token ===
                            "IDENTIFIER"
                        )?.lexeme
                      }
                    </strong>

                  </div>


                  <div className="dfa-visual">

                    <div className="dfa-state start-state">
                      q0
                      <small>
                        START
                      </small>
                    </div>

                    <div className="dfa-transition">

                      <div className="transition-label">
                        letter / _
                      </div>

                      <div className="transition-arrow">
                        ─────────→
                      </div>

                    </div>

                    <div className="dfa-state-wrapper">

                      <div className="loop-label">
                        letter / digit / _
                      </div>

                      <div className="dfa-loop">
                        ↻
                      </div>

                      <div className="dfa-state accepting">
                        q1
                        <small>
                          ACCEPT
                        </small>
                      </div>

                    </div>

                  </div>


                  <h3>
                    DFA State Transition
                  </h3>


                  <div className="dfa-table">

                    <div className="dfa-row dfa-header">

                      <span>
                        Current State
                      </span>

                      <span>
                        Input
                      </span>

                      <span>
                        Next State
                      </span>

                    </div>

                    {dfaResult.steps.map(
                      (step, index) => (

                        <div
                          className="dfa-row"
                          key={index}
                        >

                          <span>
                            {step.state}
                          </span>

                          <span className="dfa-input-char">
                            {step.input}
                          </span>

                          <span
                            className={
                              step.nextState ===
                              "REJECT"
                                ? "reject"
                                : "accept"
                            }
                          >
                            {step.nextState}
                          </span>

                        </div>

                      )
                    )}

                  </div>


                  <div
                    className={
                      dfaResult.accepted
                        ? "dfa-result accepted-result"
                        : "dfa-result rejected-result"
                    }
                  >

                    {dfaResult.accepted
                      ? "✓ ACCEPTED — Identifier is valid"
                      : "✗ REJECTED — Invalid identifier"}

                  </div>


                  <p className="dfa-message">
                    {dfaResult.message}
                  </p>

                </>
              )}

            </section>


            {/* =================================================
                FIRST & FOLLOW
                ================================================= */}

            <section className="card">

              <div className="section-title">

                <h2>
                  📐 FIRST & FOLLOW
                </h2>

                <span>
                  Grammar Analysis
                </span>

              </div>

              <div className="first-follow-table">

                <div className="ff-row ff-header">

                  <span>
                    Non-Terminal
                  </span>

                  <span>
                    FIRST
                  </span>

                  <span>
                    FOLLOW
                  </span>

                </div>

                {Object.keys(first).map(
                  (symbol) => (

                    <div
                      className="ff-row"
                      key={symbol}
                    >

                      <span className="non-terminal">
                        {symbol}
                      </span>

                      <span>
                        {first[symbol]}
                      </span>

                      <span>
                        {follow[symbol]}
                      </span>

                    </div>

                  )
                )}

              </div>

              <p className="success">
                ✓ FIRST and FOLLOW sets generated
              </p>

            </section>


            {/* =================================================
                PREDICTIVE PARSER
                ================================================= */}

            <section className="card">

              <div className="section-title">

                <h2>
                  📋 Predictive Parser
                </h2>

                <span>
                  Syntax Analysis
                </span>

              </div>


              {parserResult && (
                <>

                  <div
                    className={
                      parserResult.accepted
                        ? "dfa-result accepted-result"
                        : "dfa-result rejected-result"
                    }
                  >

                    {parserResult.accepted
                      ? "✓ Input accepted by Predictive Parser"
                      : "✗ Input rejected by Predictive Parser"}

                  </div>


                  {/* PARSER TRACE */}

                  <pre className="parser-output">

                    {Array.isArray(
                      parserResult.steps
                    ) &&
                    parserResult.steps.length > 0

                      ? parserResult.steps
                          .map((step) =>
                            typeof step === "string"
                              ? step
                              : step.action || ""
                          )
                          .join("\n")

                      : "Predictive parsing completed successfully.\n\nInput accepted by the grammar."}

                  </pre>


                  {parserResult.accepted && (
                    <p className="success">
                      ✓ Input accepted
                    </p>
                  )}

                </>
              )}

            </section>


            {/* =================================================
                ABSTRACT SYNTAX TREE
                ================================================= */}

            <section className="card ast-card">

              <div className="section-title">

                <h2>
                  🌳 Abstract Syntax Tree
                </h2>

                <span>
                  AST
                </span>

              </div>


              {ast ? (

                <>

                  <div className="ast-container">

                    <ASTNode
                      node={ast}
                    />

                  </div>


                  <div className="ast-expression">

                    <strong>
                      Expression:
                    </strong>{" "}

                    {expressionToString(
                      ast.left
                    )}

                    {" = "}

                    {expressionToString(
                      ast.right
                    )}

                  </div>


                  <p className="success">
                    ✓ Abstract Syntax Tree generated
                  </p>

                </>

              ) : (

                <p className="error-message">
                  No valid assignment found.
                </p>

              )}

            </section>


            {/* =================================================
                THREE ADDRESS CODE
                ================================================= */}

            <section className="card">

              <div className="section-title">

                <h2>
                  ⚙️ Intermediate Code
                </h2>

                <span>
                  Three Address Code
                </span>

              </div>


              <pre className="code-output">
                {tac.length > 0
                  ? tac.join("\n")
                  : "No intermediate code generated."}
              </pre>


              <p className="success">
                ✓ Three Address Code generated
              </p>

            </section>


            {/* =================================================
                TARGET CODE
                ================================================= */}

            <section className="card">

              <div className="section-title">

                <h2>
                  💻 Target Code
                </h2>

                <span>
                  Machine-like Code
                </span>

              </div>


              <pre className="code-output">
                {targetCode.length > 0
                  ? targetCode.join("\n")
                  : "No target code generated."}
              </pre>

            </section>

          </>
        )}

      </main>


      <footer>
        Compiler Design Project • Automata + Parsing + Code Generation
      </footer>

    </div>
  );
}

export default App;