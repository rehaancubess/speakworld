export class GuideNarration {
  constructor({ button, status, guideName }) {
    this.button = button;
    this.status = status;
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.manifests = new Map();
    this.current = null;
    this.guideName = guideName;
    this.enabled = false;
    this.button.addEventListener('click', () => this.toggle());
    this.audio.addEventListener('ended', () => this.render(false));
    this.audio.addEventListener('error', () => {
      this.status.textContent = 'Narration unavailable · tutorial text remains below';
      this.button.hidden = true;
    });
  }

  async manifest(worldId) {
    if (this.manifests.has(worldId)) return this.manifests.get(worldId);
    try {
      const response = await fetch(`/assets/audio/${worldId}/manifest.json`, { cache: 'no-store' });
      const manifest = response.ok ? await response.json() : { generated: [] };
      this.manifests.set(worldId, manifest);
      return manifest;
    } catch {
      return { generated: [] };
    }
  }

  async prepare({ worldId, guideName, lessonId, autoplay = false, forceAutoplay = false }) {
    this.stop();
    this.guideName = guideName;
    if (forceAutoplay) this.enabled = true;
    const manifest = await this.manifest(worldId);
    const filename = manifest.generated?.find((item) => item.lessonId === lessonId)?.file;
    this.current = filename ? `/assets/audio/${worldId}/${filename}` : null;
    this.button.hidden = !this.current;
    this.status.hidden = false;
    this.status.textContent = this.current
      ? `AI voice · ${guideName} can read this tutorial`
      : 'Tutorial text · narration assets have not been generated yet';
    if (this.current && autoplay && this.enabled) this.play();
  }

  async toggle() {
    if (!this.current) return;
    if (!this.audio.paused) {
      this.audio.pause();
      this.render(false);
      return;
    }
    this.enabled = true;
    await this.play();
  }

  async play() {
    if (!this.current) return;
    if (!this.audio.src.endsWith(this.current)) this.audio.src = this.current;
    try {
      await this.audio.play();
      this.render(true);
    } catch {
      this.render(false);
    }
  }

  render(playing) {
    this.button.textContent = playing ? `Pause ${this.guideName}` : `Listen to ${this.guideName}`;
    this.button.setAttribute('aria-pressed', String(playing));
    globalThis.dispatchEvent?.(new CustomEvent('sayscape:narration-state', { detail: { active: playing } }));
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.render(false);
  }
}
