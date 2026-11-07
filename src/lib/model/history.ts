/**
 * Historial deshacer/rehacer con el patrón Command.
 *
 * Es TypeScript puro (sin Svelte) para poder probarlo de forma aislada.
 * Cada acción del editor que modifica el documento es un Command con
 * redo() y undo() simétricos.
 */

export interface Command {
  label: string;
  /** Comandos consecutivos con la misma clave se fusionan (p. ej. al arrastrar un control). */
  mergeKey?: string;
  redo(): void;
  undo(): void;
  /** Absorbe un comando posterior ya aplicado. Devuelve true si lo fusionó. */
  merge?(next: Command): boolean;
}

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private lastTime = 0;

  constructor(
    private onChange: () => void = () => {},
    private mergeWindowMs = 800,
    private limit = 300
  ) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  get undoLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null;
  }
  get redoLabel(): string | null {
    return this.redoStack.at(-1)?.label ?? null;
  }

  /** Ejecuta el comando y lo registra. */
  run(cmd: Command, now = Date.now()): void {
    cmd.redo();
    this.record(cmd, now);
  }

  /** Registra un comando cuyo efecto YA fue aplicado (p. ej. tras un gesto de arrastre). */
  push(cmd: Command, now = Date.now()): void {
    this.record(cmd, now);
  }

  private record(cmd: Command, now: number): void {
    const top = this.undoStack.at(-1);
    const canMerge =
      top !== undefined &&
      this.redoStack.length === 0 &&
      cmd.mergeKey !== undefined &&
      top.mergeKey === cmd.mergeKey &&
      now - this.lastTime <= this.mergeWindowMs &&
      top.merge?.(cmd) === true;

    this.lastTime = now;
    if (!canMerge) {
      this.undoStack.push(cmd);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack = [];
    }
    this.onChange();
  }

  /** Corta la fusión: el próximo comando empezará una entrada nueva. */
  seal(): void {
    this.lastTime = 0;
  }

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo();
    this.redoStack.push(cmd);
    this.lastTime = 0;
    this.onChange();
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.redo();
    this.undoStack.push(cmd);
    this.lastTime = 0;
    this.onChange();
    return true;
  }

  /** Vacía el historial sin avisar a onChange (p. ej. al abrir otro proyecto). */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastTime = 0;
  }
}
