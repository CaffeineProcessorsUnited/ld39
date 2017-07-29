export class IncRand {
    incPerSec: number
    minDuration: number
    maxDuration: number
    start: Date
    last: Date
    chance: number

    constructor(incPerSec: number, minDuration: number, maxDuration: number) {
        this.incPerSec = incPerSec
        this.minDuration = minDuration
        this.maxDuration = maxDuration

        this.reset()
    }

    reset() {
        this.start = Date.now()
        this.chance = 0
    }

    getRand(): boolean {
        let now = Date.now()
        let delta = (now - this.start) / 1000
        if (this.minDuration > delta) {
            return false
        }
        else if (this.maxDuration < delta) {
            return true
        } else {
            let deltaLast = (now - this.last) / 1000
            this.last = now
            this.chance = Math.min(this.chance + deltaLast * this.incPerSec, 1)
            return Math.random() < this.chance
        }
    }
}