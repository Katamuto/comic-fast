import { describe, expect, it } from 'vitest';
import { History, type Command } from './history';

function counterCmd(state: { n: number }, delta: number, mergeKey?: string): Command & { delta: number } {
  const cmd: Command & { delta: number } = {
    label: `+${delta}`,
    mergeKey,
    delta,
    redo: () => {
      state.n += cmd.delta;
    },
    undo: () => {
      state.n -= cmd.delta;
    },
    merge: (next) => {
      cmd.delta += (next as Command & { delta: number }).delta;
      return true;
    }
  };
  return cmd;
}

describe('History', () => {
  it('ejecuta, deshace y rehace', () => {
    const s = { n: 0 };
    const h = new History();
    h.run(counterCmd(s, 5));
    h.run(counterCmd(s, 2));
    expect(s.n).toBe(7);
    expect(h.undo()).toBe(true);
    expect(s.n).toBe(5);
    expect(h.redo()).toBe(true);
    expect(s.n).toBe(7);
    expect(h.redo()).toBe(false);
  });

  it('una acción nueva descarta el rehacer', () => {
    const s = { n: 0 };
    const h = new History();
    h.run(counterCmd(s, 1));
    h.run(counterCmd(s, 1));
    h.undo();
    expect(h.canRedo).toBe(true);
    h.run(counterCmd(s, 10));
    expect(h.canRedo).toBe(false);
    expect(s.n).toBe(11);
  });

  it('fusiona comandos con la misma clave dentro de la ventana de tiempo', () => {
    const s = { n: 0 };
    const h = new History(() => {}, 800);
    h.run(counterCmd(s, 1, 'k'), 1000);
    h.run(counterCmd(s, 1, 'k'), 1200);
    h.run(counterCmd(s, 1, 'k'), 1500);
    expect(s.n).toBe(3);
    h.undo(); // una sola entrada
    expect(s.n).toBe(0);
    expect(h.canUndo).toBe(false);
  });

  it('no fusiona si pasó demasiado tiempo o cambia la clave', () => {
    const s = { n: 0 };
    const h = new History(() => {}, 800);
    h.run(counterCmd(s, 1, 'k'), 1000);
    h.run(counterCmd(s, 1, 'k'), 5000);
    h.run(counterCmd(s, 1, 'otra'), 5100);
    h.undo();
    h.undo();
    h.undo();
    expect(s.n).toBe(0);
    expect(h.canUndo).toBe(false);
  });

  it('seal() corta la fusión', () => {
    const s = { n: 0 };
    const h = new History(() => {}, 800);
    h.run(counterCmd(s, 1, 'k'), 1000);
    h.seal();
    h.run(counterCmd(s, 1, 'k'), 1100);
    h.undo();
    expect(s.n).toBe(1);
    expect(h.canUndo).toBe(true);
  });

  it('push() registra sin volver a ejecutar', () => {
    const s = { n: 3 }; // el efecto ya se aplicó
    const h = new History();
    h.push(counterCmd(s, 3));
    expect(s.n).toBe(3);
    h.undo();
    expect(s.n).toBe(0);
  });

  it('respeta el límite y avisa los cambios', () => {
    const s = { n: 0 };
    let changes = 0;
    const h = new History(() => changes++, 800, 3);
    for (let i = 0; i < 5; i++) h.run(counterCmd(s, 1), i * 10_000);
    let undone = 0;
    while (h.undo()) undone++;
    expect(undone).toBe(3);
    expect(changes).toBeGreaterThanOrEqual(5);
  });

  it('expone las etiquetas de deshacer y rehacer', () => {
    const s = { n: 0 };
    const h = new History();
    expect(h.undoLabel).toBeNull();
    h.run(counterCmd(s, 4));
    expect(h.undoLabel).toBe('+4');
    h.undo();
    expect(h.redoLabel).toBe('+4');
  });
});
