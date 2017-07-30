import {GameState} from "../states/game"

export class AStar {
    private gamestate: GameState

    constructor(gamestate: GameState) {
        this.gamestate = gamestate
    }

    getPath(from: Phaser.Point, to: Phaser.Point): Phaser.Point[] {
        // console.log("FROM", from)
        // console.log("TO", to)
        let completedNodes: Phaser.Point[] = []
        let currentNodes: Phaser.Point[] = [from]

        let cameFrom: { [index: string]: Phaser.Point } = {}
        let gScore: { [index: string]: number } = {} // Not in dict = inf
        gScore[from.toString()] = 0
        let fScore: { [index: string]: number } = {}// Not in dict = inf
        fScore[from.toString()] = AStar.estimateDistance(from, to)

        let iter = 0
        while (currentNodes.length > 0) {
            currentNodes = currentNodes.sort((a, b) => {
                let valueA, valueB
                if (!fScore.hasOwnProperty(a.toString())) {
                    valueA = 9999999
                } else {
                    valueA = fScore[a.toString()]
                }
                if (!fScore.hasOwnProperty(b.toString())) {
                    valueB = 9999999
                } else {
                    valueB = fScore[b.toString()]
                }
                return  valueA - valueB
            })

            let current = currentNodes.shift()!
            // console.log("mmmm", current)
            if (current.equals(to) || iter > 500) {
                return this.reconstructPath(cameFrom, to)
            }
            completedNodes.push(current)
            for (const neighbor of this.getNeighbors(current)) {
                // this.gamestate.game.debug.rectangle(
                //     new Phaser.Rectangle(
                //         64*neighbor.x,
                //         64*neighbor.y,
                //         20,
                //         20),
                //     "#0000ff")

                // console.log("neighbor", neighbor)
                if (AStar.inList(neighbor, completedNodes)) {
                    continue
                }

                if (!AStar.inList(neighbor, currentNodes)) {
                    currentNodes.push(neighbor)
                }

                const _gScore = gScore[current.toString()] + current.distance(neighbor)
                if (_gScore > gScore[neighbor.toString()]) {
                    continue
                }

                cameFrom[neighbor.toString()] = current
                gScore[neighbor.toString()] = _gScore
                fScore[neighbor.toString()] = _gScore + AStar.estimateDistance(neighbor, to)

            }
            iter += 1
        }

        console.log("FUUUUUUUUU", iter, cameFrom)
        return []
    }

    private reconstructPath(cameFrom: { [index: string]: Phaser.Point }, current: Phaser.Point): Phaser.Point[] {
        let path = [current]
        let prev = current
        // console.log("#######", current, cameFrom)
        while (cameFrom[prev.toString()] !== undefined) {
            prev = cameFrom[prev.toString()]
            path.unshift(prev)
            // console.log("+++", prev)
            // this.gamestate.game.debug.rectangle(
            //     new Phaser.Rectangle(
            //         prev.x,
            //         prev.y,
            //         1,
            //         1),
            //     "#ff00ff")
        }
        // console.log("???????")
        return path
    }

    private static estimateDistance(from: Phaser.Point, to: Phaser.Point) {
        return from.distance(to)
    }

    private static inList(elem: Phaser.Point, list: Phaser.Point[]): boolean {
        for (const e of list) {
            if (elem.equals(e)) {
                return true
            }
        }
        return false
    }

    private getNeighbors(from: Phaser.Point): Phaser.Point[] {
        let ret = []
        for (const delta of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ]) {
            if (!this.gamestate.hasCollision(from.x + delta[0], from.y + delta[1])) {
                ret.push(new Phaser.Point(from.x + delta[0], from.y + delta[1]))
            }
        }
        return ret
    }

}
