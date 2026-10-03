function isLetter(ch) {
  return /^[A-Za-z]$/.test(ch);
}

function isDigit(ch) {
  return /^[0-9]$/.test(ch);
}

function isValidNextCharacter(ch) {
  return isLetter(ch) || isDigit(ch) || ch === "_";
}

export function simulateIdentifierDFA(input) {
  const steps = [];

  let state = "q0";

  steps.push({
    state: "q0",
    input: "START",
    nextState: "q0"
  });

  if (!input) {
    return {
      accepted: false,
      steps,
      message: "Identifier cannot be empty."
    };
  }

  if (!isLetter(input[0]) && input[0] !== "_") {
    steps.push({
      state: "q0",
      input: input[0],
      nextState: "REJECT"
    });

    return {
      accepted: false,
      steps,
      message: "Identifier must begin with a letter or underscore."
    };
  }

  state = "q1";

  steps.push({
    state: "q0",
    input: input[0],
    nextState: "q1"
  });

  for (let i = 1; i < input.length; i++) {
    const ch = input[i];

    if (!isValidNextCharacter(ch)) {
      steps.push({
        state: "q1",
        input: ch,
        nextState: "REJECT"
      });

      return {
        accepted: false,
        steps,
        message: `Invalid character '${ch}' in identifier.`
      };
    }

    steps.push({
      state: "q1",
      input: ch,
      nextState: "q1"
    });
  }

  return {
    accepted: true,
    steps,
    message: "Identifier accepted by DFA."
  };
}