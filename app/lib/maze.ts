export type Cell = {
  x: number;
  y: number;
  walls: { n: boolean; s: boolean; e: boolean; w: boolean };
  visited?: boolean;
};

export type Maze = {
  width: number;
  height: number;
  cells: Cell[][];
  start: { x: number; y: number };
  goal: { x: number; y: number };
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMaze(width: number, height: number, seed = 1): Maze {
  const rng = mulberry32(seed);
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      walls: { n: true, s: true, e: true, w: true },
      visited: false,
    })),
  );

  const stack: Cell[] = [];
  const start = cells[0][0];
  start.visited = true;
  stack.push(start);

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const neighbors: { c: Cell; dir: "n" | "s" | "e" | "w" }[] = [];
    if (cur.y > 0 && !cells[cur.y - 1][cur.x].visited)
      neighbors.push({ c: cells[cur.y - 1][cur.x], dir: "n" });
    if (cur.y < height - 1 && !cells[cur.y + 1][cur.x].visited)
      neighbors.push({ c: cells[cur.y + 1][cur.x], dir: "s" });
    if (cur.x < width - 1 && !cells[cur.y][cur.x + 1].visited)
      neighbors.push({ c: cells[cur.y][cur.x + 1], dir: "e" });
    if (cur.x > 0 && !cells[cur.y][cur.x - 1].visited)
      neighbors.push({ c: cells[cur.y][cur.x - 1], dir: "w" });

    if (!neighbors.length) {
      stack.pop();
      continue;
    }

    const pick = neighbors[Math.floor(rng() * neighbors.length)];
    const opp = { n: "s", s: "n", e: "w", w: "e" } as const;
    cur.walls[pick.dir] = false;
    pick.c.walls[opp[pick.dir]] = false;
    pick.c.visited = true;
    stack.push(pick.c);
  }

  // Reset visited flags for game-time use.
  for (const row of cells) for (const c of row) c.visited = false;

  return {
    width,
    height,
    cells,
    start: { x: 0, y: 0 },
    goal: { x: width - 1, y: height - 1 },
  };
}

export type Facing = "n" | "s" | "e" | "w";
export type Direction = "forward" | "back" | "left" | "right";

const TURN_LEFT: Record<Facing, Facing> = { n: "w", w: "s", s: "e", e: "n" };
const TURN_RIGHT: Record<Facing, Facing> = { n: "e", e: "s", s: "w", w: "n" };
const TURN_BACK: Record<Facing, Facing> = { n: "s", s: "n", e: "w", w: "e" };

export function resolveDirection(facing: Facing, dir: Direction): Facing {
  switch (dir) {
    case "forward":
      return facing;
    case "left":
      return TURN_LEFT[facing];
    case "right":
      return TURN_RIGHT[facing];
    case "back":
      return TURN_BACK[facing];
  }
}

export function step(
  pos: { x: number; y: number },
  facing: Facing,
): { x: number; y: number } {
  switch (facing) {
    case "n":
      return { x: pos.x, y: pos.y - 1 };
    case "s":
      return { x: pos.x, y: pos.y + 1 };
    case "e":
      return { x: pos.x + 1, y: pos.y };
    case "w":
      return { x: pos.x - 1, y: pos.y };
  }
}

export function isOpen(maze: Maze, x: number, y: number, dir: Facing): boolean {
  if (x < 0 || y < 0 || x >= maze.width || y >= maze.height) return false;
  return !maze.cells[y][x].walls[dir];
}

function bfsDistances(maze: Maze, start: { x: number; y: number }): number[][] {
  const dist = Array.from({ length: maze.height }, () =>
    Array<number>(maze.width).fill(-1),
  );
  dist[start.y][start.x] = 0;
  const queue: { x: number; y: number }[] = [{ ...start }];
  while (queue.length) {
    const { x, y } = queue.shift()!;
    const cell = maze.cells[y][x];
    const moves: { nx: number; ny: number; dir: Facing }[] = [
      { nx: x, ny: y - 1, dir: "n" },
      { nx: x, ny: y + 1, dir: "s" },
      { nx: x + 1, ny: y, dir: "e" },
      { nx: x - 1, ny: y, dir: "w" },
    ];
    for (const { nx, ny, dir } of moves) {
      if (nx < 0 || ny < 0 || nx >= maze.width || ny >= maze.height) continue;
      if (cell.walls[dir]) continue;
      if (dist[ny][nx] !== -1) continue;
      dist[ny][nx] = dist[y][x] + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

/**
 * Pick a goal cell whose shortest-path distance from `start` falls in [minDist, maxDist].
 * Prefer the larger end of the band; fall back to the farthest reachable cell if none qualify.
 */
export function findGoalAtDistance(
  maze: Maze,
  start: { x: number; y: number },
  minDist: number,
  maxDist: number,
): { x: number; y: number } {
  const dist = bfsDistances(maze, start);
  for (let d = maxDist; d >= minDist; d--) {
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        if (dist[y][x] === d) return { x, y };
      }
    }
  }
  let best = { x: start.x, y: start.y, d: 0 };
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (dist[y][x] > best.d) best = { x, y, d: dist[y][x] };
    }
  }
  return { x: best.x, y: best.y };
}
