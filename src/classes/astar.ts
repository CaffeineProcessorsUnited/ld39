import {GameState} from "../states/game"
import {range} from "../sgl/util"

export class AStar {
    private gamestate: GameState
    private from: Phaser.Point
    private to: Phaser.Point
    private maxIter: number
    private curIter: number
    private callback: Function
    private collider: Function


    private completedNodes: Phaser.Point[] = []
    private currentNodes: Phaser.Point[] = []

    private cameFrom: { [index: string]: Phaser.Point } = {}
    private gScore: { [index: string]: number } = {} // Not in dict = inf
    private fScore: { [index: string]: number } = {}// Not in dict = inf


    constructor(gamestate: GameState, from: Phaser.Point, to: Phaser.Point, maxIter: number, collider: Function, callback: Function) {
        this.gamestate = gamestate
        this.from = from
        this.to = to
        this.maxIter = maxIter
        this.curIter = 0
        this.collider = collider
        this.callback = callback

        this.currentNodes.push(from)
        this.gScore[from.toString()] = 0
        this.fScore[from.toString()] = AStar.estimateDistance(from, to)

        this.RAF()
    }

    private static estimateDistance(from: Phaser.Point, to: Phaser.Point) {
        return from.distance(to)
    }

    private static inList(elem: Phaser.Point, list: Phaser.Point[]): boolean {
        for (const e of list) {
            if (elem.x === e.x && elem.y === e.y) {
                return true
            }
        }
        return false
    }

    private reconstructPath(cameFrom: { [index: string]: Phaser.Point }, current: Phaser.Point): Phaser.Point[] {
        let path = [current]
        let prev = current
        // console.log("#######", current, cameFrom)
        while (prev !== undefined && cameFrom[prev.toString()] !== undefined) {
            prev = cameFrom[prev.toString()]
            path.unshift(prev)
        }
        // console.log("???????")

        return path
    }

    private getFScore(a: Phaser.Point) {
        if (!this.fScore.hasOwnProperty(a.toString())) {
            return 9999999
        } else {
            return this.fScore[a.toString()]
        }
    }

    private calcPathStep() {
        let next = true
        let current
        for (let _ of range(0, 20)) {
            if (this.currentNodes.length === 0) {
                next = false
                break
            }

            let curMinNode = this.currentNodes[0]
            let curMinValue = 999999
            this.currentNodes.forEach((node: Phaser.Point) => {
                let val = this.getFScore(node)
                if (val < curMinValue) {
                    curMinNode = node
                    curMinValue = val
                }
            })

            current = curMinNode
            // console.log("mmmm", current)
            this.reconstructPath(this.cameFrom, this.to)
            if (current.equals(this.to) || this.curIter > this.maxIter || this.curIter % 500 == 0) {
                this.callback(this.reconstructPath(this.cameFrom, current))
                if (current.equals(this.to) || this.curIter > this.maxIter) {
                    return
                }
            }

            let idx = this.currentNodes.indexOf(curMinNode)
            this.currentNodes.splice(idx, 1)
            this.completedNodes.push(current)

            this.currentNodes.forEach((n) => {
                this.gamestate.game.debug.rectangle(
                    new Phaser.Rectangle(
                        64 * n.x,
                        64 * n.y,
                        20,
                        20),
                    "#00ff00")
            })


            for (const neighbor of this.getNeighbors(current)) {
                // this.gamestate.game.debug.rectangle(
                //     new Phaser.Rectangle(
                //         64 * neighbor.x,
                //         64 * neighbor.y,
                //         20,
                //         20),
                //     "#0000ff")

                if (AStar.inList(neighbor, this.completedNodes)) {
                    continue
                }

                if (!AStar.inList(neighbor, this.currentNodes)) {
                    this.currentNodes.push(neighbor)
                }

                const _gScore = this.gScore[current.toString()] + current.distance(neighbor)
                if (_gScore > this.gScore[neighbor.toString()]) {
                    continue
                }

                this.cameFrom[neighbor.toString()] = current
                this.gScore[neighbor.toString()] = _gScore
                this.fScore[neighbor.toString()] = _gScore + AStar.estimateDistance(neighbor, this.to)

            }

            this.curIter += 1
        }
        if (next) {
            this.RAF()
        }
        this.callback(this.reconstructPath(this.cameFrom, current!))
    }

    private RAF() {
        window.setTimeout(() => {
            this.calcPathStep()
        }, 1)

    }

    private getNeighbors(from: Phaser.Point): Phaser.Point[] {
        let ret = []
        for (const delta of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ]) {
            let collide = this.collider(from.x + delta[0], from.y + delta[1])
//            this.gamestate.game.debug.rectangle(
                // new Phaser.Rectangle(
                //     64 * (from.x + delta[0]),
                //     64 * (from.y + delta[1]),
                //     20,
                //     20),
                // collide ? "#ff0000" : "#00ff00")
            if (!collide) {
                ret.push(new Phaser.Point(from.x + delta[0], from.y + delta[1]))
            }
        }
        return ret
    }

}
