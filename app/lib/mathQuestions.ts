export type MathQuestion = {
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  category: string;
  problem: string;
  solutionSteps: string[];
  answer: string;
};

export const MATH_QUESTIONS: MathQuestion[] = [
  {
    difficulty: "Easy",
    category: "Arithmetic",
    problem: "(24 + 16) / 8 + 5",
    solutionSteps: [
      "24 + 16 = 40",
      "40 / 8 = 5",
      "5 + 5 = 10",
    ],
    answer: "10",
  },
  {
    difficulty: "Medium",
    category: "Basic Algebra",
    problem: "Solve for x: 3x + 7 = 22",
    solutionSteps: [
      "Subtract 7 from both sides: 3x = 22 - 7",
      "Simplify: 3x = 15",
      "Divide both sides by 3: x = 15 / 3",
      "Simplify: x = 5",
    ],
    answer: "x = 5",
  },
  {
    difficulty: "Hard",
    category: "Algebra / Quadratics",
    problem: "Solve for x: x^2 - 5x + 6 = 0",
    solutionSteps: [
      "Factor: find two numbers that multiply to 6 and add to -5",
      "Those numbers are -2 and -3",
      "Rewrite as (x - 2)(x - 3) = 0",
      "Set each factor to zero: x - 2 = 0 or x - 3 = 0",
      "Solve: x = 2 or x = 3",
    ],
    answer: "x = 2 or x = 3",
  },
  {
    difficulty: "Expert",
    category: "Calculus",
    problem: "Find f'(4) where f(x) = 3x^2 + 2x",
    solutionSteps: [
      "Power rule on 3x^2: 6x",
      "Power rule on 2x: 2",
      "f'(x) = 6x + 2",
      "f'(4) = 6(4) + 2",
      "f'(4) = 24 + 2 = 26",
    ],
    answer: "f'(4) = 26",
  },
];
