/**
 * Coordenador centralizado de requestAnimationFrame da Limiar.
 * Evita múltiplos loops rAF concorrentes no Hero, Scroll Damper e animações,
 * contabiliza loops ativos reais para telemetria e pausa automaticamente em aba oculta.
 */

export type FrameTaskCallback = (nowMs: number, dtMs: number) => boolean | void;

interface RegisteredTask {
  id: string;
  callback: FrameTaskCallback;
  active: boolean;
}

class CentralizedFrameScheduler {
  private readonly tasks = new Map<string, RegisteredTask>();
  private rafId = 0;
  private lastTickMs = 0;
  private externalRafCount = 0;
  private onFrameSample: ((dtMs: number, nowMs: number, tabVisible: boolean) => void) | null = null;
  private visibilityListenerAttached = false;

  public setFrameSampleHook(
    hook: ((dtMs: number, nowMs: number, tabVisible: boolean) => void) | null
  ): void {
    this.onFrameSample = hook;
  }

  public registerExternalRaf(): () => void {
    this.externalRafCount += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.externalRafCount = Math.max(0, this.externalRafCount - 1);
    };
  }

  public getActiveRafCount(): number {
    let scheduledActive = 0;
    this.tasks.forEach((task) => {
      if (task.active) scheduledActive += 1;
    });
    return (this.rafId !== 0 ? 1 : 0) + this.externalRafCount + (scheduledActive > 0 && this.rafId === 0 ? 1 : 0);
  }

  public getActiveTaskCount(): number {
    let count = 0;
    this.tasks.forEach((task) => {
      if (task.active) count += 1;
    });
    return count;
  }

  public scheduleTask(id: string, callback: FrameTaskCallback): void {
    this.ensureVisibilityHook();
    const existing = this.tasks.get(id);
    if (existing) {
      existing.callback = callback;
      existing.active = true;
    } else {
      this.tasks.set(id, { id, callback, active: true });
    }
    this.ensureLoop();
  }

  public stopTask(id: string): void {
    const existing = this.tasks.get(id);
    if (existing) {
      existing.active = false;
    }
    if (this.getActiveTaskCount() === 0 && this.rafId !== 0 && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.lastTickMs = 0;
    }
  }

  public removeTask(id: string): void {
    this.tasks.delete(id);
    if (this.getActiveTaskCount() === 0 && this.rafId !== 0 && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.lastTickMs = 0;
    }
  }

  private ensureVisibilityHook(): void {
    if (this.visibilityListenerAttached || typeof document === 'undefined') return;
    this.visibilityListenerAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (this.rafId !== 0 && typeof window !== 'undefined') {
          window.cancelAnimationFrame(this.rafId);
          this.rafId = 0;
          this.lastTickMs = 0;
        }
      } else if (this.getActiveTaskCount() > 0) {
        this.lastTickMs = 0;
        this.ensureLoop();
      }
    });
  }

  private ensureLoop(): void {
    if (typeof window === 'undefined' || this.rafId !== 0) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (this.getActiveTaskCount() === 0) return;
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  private tick = (nowMs: number): void => {
    this.rafId = 0;
    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (isHidden) {
      this.lastTickMs = 0;
      return;
    }

    const dtMs = this.lastTickMs > 0 ? Math.max(0.5, nowMs - this.lastTickMs) : 16.6667;
    if (this.lastTickMs > 0) {
      this.onFrameSample?.(dtMs, nowMs, true);
    }
    this.lastTickMs = nowMs;

    let anyRemaining = false;
    this.tasks.forEach((task) => {
      if (!task.active) return;
      try {
        const keepRunning = task.callback(nowMs, dtMs);
        if (keepRunning === false) {
          task.active = false;
        } else {
          anyRemaining = true;
        }
      } catch {
        task.active = false;
      }
    });

    if (anyRemaining) {
      this.rafId = window.requestAnimationFrame(this.tick);
    } else {
      this.lastTickMs = 0;
    }
  };
}

export const frameScheduler = new CentralizedFrameScheduler();
