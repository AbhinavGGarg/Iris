export type Question = {
  text: string;
  accept: string[];
};

export const QUESTIONS: Question[] = [
  { text: "What is the big yellow thing in the sky during the day?", accept: ["sun"] },
  { text: "How many legs does a spider have?", accept: ["8", "eight"] },
  { text: "What do plants need to grow?", accept: ["water", "sunlight", "sun", "light"] },
  { text: "What do bees make?", accept: ["honey"] },
  { text: "Is ice hot or cold?", accept: ["cold"] },
  { text: "What animal says moo?", accept: ["cow"] },
  { text: "What is H2O?", accept: ["water"] },
  { text: "How many wings does a bird have?", accept: ["2", "two"] },
];
