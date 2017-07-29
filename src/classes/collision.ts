export class Trigger {
  x: number
  y: number
  action: string

  constructor(x: number, y: number, action: string) {
    this.x = x
    this.y = y
    this.action = action
  }

  private trigger() {
    eval(this.action)
  }

  test(x: number, y: number) {
    if (this.x == x && this.y == y) {
      this.trigger()
    }
  }
}
