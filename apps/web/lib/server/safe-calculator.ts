/**
 * Evaluates a restricted arithmetic expression (+ - * / parentheses, unary minus).
 * Rejects any character outside digits, operators, dots, and whitespace.
 */
export function evaluateArithmeticExpression(expression: string): number {
  const s = expression.replace(/\s+/g, "");
  if (!s.length) {
    throw new Error("Empty expression");
  }
  if (!/^[0-9+\-*/().]+$/.test(s)) {
    throw new Error("Only digits, + - * / ( ) and . are allowed");
  }

  let i = 0;

  function peek(): string {
    return s[i] ?? "";
  }

  function eat(ch?: string): void {
    if (ch !== undefined && peek() !== ch) {
      throw new Error("Syntax error");
    }
    i += 1;
  }

  function parseNumber(): number {
    const start = i;
    if (peek() === ".") {
      eat(".");
      if (!/\d/.test(peek())) throw new Error("Invalid number");
      while (/\d/.test(peek())) eat();
      return parseFloat(s.slice(start, i));
    }
    if (!/\d/.test(peek())) throw new Error("Expected number");
    while (/\d/.test(peek())) eat();
    if (peek() === ".") {
      eat(".");
      while (/\d/.test(peek())) eat();
    }
    return parseFloat(s.slice(start, i));
  }

  function parseFactor(): number {
    if (peek() === "(") {
      eat("(");
      const v = parseExpr();
      eat(")");
      return v;
    }
    if (peek() === "-") {
      eat("-");
      return -parseFactor();
    }
    if (peek() === "+") {
      eat("+");
      return parseFactor();
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = peek();
      eat();
      const rhs = parseFactor();
      if (op === "*") {
        v *= rhs;
      } else {
        if (rhs === 0) throw new Error("Division by zero");
        v /= rhs;
      }
    }
    return v;
  }

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = peek();
      eat();
      const rhs = parseTerm();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }

  const result = parseExpr();
  if (i !== s.length) {
    throw new Error("Unexpected trailing characters");
  }
  if (!Number.isFinite(result)) {
    throw new Error("Result is not a finite number");
  }
  return result;
}
