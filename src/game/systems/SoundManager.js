export class SoundManager {
  constructor() {
    this.sounds = new Map();
    this.musicTracks = new Map();
    this.currentMusic = null;
    this.masterVolume = 0.7;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.6;
  }

  async loadSound(name, path) {
    const audio = new Audio(path);
    audio.volume = this.sfxVolume * this.masterVolume;
    this.sounds.set(name, audio);
  }

  async loadMusic(name, path) {
    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = this.musicVolume * this.masterVolume;
    this.musicTracks.set(name, audio);
  }

  playSound(name, volume = 1) {
    const sound = this.sounds.get(name);
    if (sound) {
      const clone = sound.cloneNode();
      clone.volume = this.sfxVolume * this.masterVolume * volume;
      clone.play().catch(e => console.log('Sound play failed:', e));

      // Clean up after playing
      clone.addEventListener('ended', () => {
        clone.remove();
      });
    }
  }

  playMusic(name) {
    // Stop current music
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
    }

    // Play new music
    const music = this.musicTracks.get(name);
    if (music) {
      this.currentMusic = music;
      music.play().catch(e => console.log('Music play failed:', e));
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
  }
}

export const soundManager = new SoundManager();