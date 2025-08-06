export class State {
  constructor(game) {
    this.game = game;
    this.name = '';
  }

  async init() {
    // Override in subclasses for initialization
  }

  enter(data) {
    // Override in subclasses for state entry logic
  }

  exit() {
    // Override in subclasses for state exit logic
  }

  update(deltaTime) {
    // Override in subclasses for update logic
  }

  render(renderer, interpolation) {
    // Override in subclasses for render logic
  }
}