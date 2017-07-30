export class IncRand {
    incPerSec: number
    minDuration: number
    maxDuration: number
    start: number
    last: number
    chance: number
    stopped: boolean

    constructor(incPerSec: number, minDuration: number, maxDuration: number, stopped: boolean = false) {
        this.incPerSec = incPerSec
        this.minDuration = minDuration
        this.maxDuration = maxDuration
        this.stopped = stopped

        this.reset()
    }

    reset(stopped: boolean = false) {
        this.start = Date.now()
        this.chance = 0
        this.stopped = stopped
    }

    getRand(): boolean {
        if (this.stopped) {
            return false
        }
        let now = Date.now()
        let delta = (now - this.start) / 1000
        if (this.minDuration > delta) {
            return false
        } else if (this.maxDuration < delta) {
            return true
        } else {
            let deltaLast = (now - this.last) / 1000
            this.last = now
            this.chance = Math.min(this.chance + deltaLast * this.incPerSec, 1)
            return Math.random() < this.chance
        }
    }
}