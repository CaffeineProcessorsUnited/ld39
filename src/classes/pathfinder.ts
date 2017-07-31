import {AI} from "./ai"
import {GameState} from "../states/game"
import {AStar} from "./astar"
import {nou} from "../sgl/util"

export class Pathfinder {
    private curPos: Phaser.Point
    private curTile: Phaser.Point

    private targetPos: Phaser.Point
    private targetTile: Phaser.Point

    private plannedPos: Phaser.Point[]
    private plannedTile: Phaser.Point[]

    private npc: AI
    private gs: GameState

    private dirty: boolean
    private staticTarget: boolean
    private interval: number
    private astar: AStar

    constructor(npc: AI, gs: GameState, staticTarget: boolean = true) {
        this.npc = npc
        this.gs = gs
        this.staticTarget = staticTarget
        this.forceUpdate()
    }

    static tile2pos(gameState: GameState, tile: Phaser.Point): Phaser.Point {
        return new Phaser.Point(
            tile.x * gameState.map.tileWidth + gameState.map.tileWidth / 2,
            tile.y * gameState.map.tileHeight + gameState.map.tileHeight / 2,
        )
    }

    static pos2tile(gameState: GameState, pos: Phaser.Point): Phaser.Point {
        return new Phaser.Point(
            Math.floor(pos.x / gameState.map.tileWidth),
            Math.floor(pos.y / gameState.map.tileHeight),
        )
    }

    private static pathEquals(a: Phaser.Point[], b: Phaser.Point[]): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (let i = 0; i < a.length; i++) {
            if (!a[i].equals(b[i])) {
                return false
            }
        }
        return true
    }

    setCurrent(pos: Phaser.Point) {
        this.curPos = pos.clone()
        this.curTile = this.pos2tile(pos)
        this.dirty = true
    }

    setTarget(pos: Phaser.Point) {
        this.targetPos = pos.clone()
        this.targetTile = this.pos2tile(pos)
        this.dirty = true
    }

    tile2pos(tile: Phaser.Point): Phaser.Point {
        return Pathfinder.tile2pos(this.gs, tile)
    }

    pos2tile(pos: Phaser.Point): Phaser.Point {
        return Pathfinder.pos2tile(this.gs, pos)
    }

    forceUpdate() {
        if (this.interval) {
            window.clearTimeout(this.interval)
            window.clearInterval(this.interval)
        }
        if (this.staticTarget) {
            this.interval = setInterval(this.onUpdate.bind(this), 250)
        } else {
            this.interval = setInterval(this.onUpdate.bind(this), 250)
        }
    }

    private onUpdate() {
        if (!this.dirty) {
            console.log("GOT TO UPDATE, BUT NO CHANGES")
            return
        }
        if (!this.curPos || !this.targetPos) {
            console.log("SHOULD CALCULATE PATH. MISSING VALUES")
            return
        }
        this.astar = new AStar(this.gs, this.curTile, this.targetTile, this.staticTarget ? 10000 : 500, this.npc.getCollider(), (plannedTile: Phaser.Point[], done: boolean) => {

            // plannedTile.forEach((p) => {
            //     this.gs.game.debug.rectangle(
            //         new Phaser.Rectangle(
            //             p.x * this.gs.map.width,
            //             p.y * this.gs.map.height,
            //             20,
            //             20),
            //         "#ff0000")
            // })

            if (nou(this.plannedTile) || !Pathfinder.pathEquals(this.plannedTile, plannedTile)) {
                this.plannedTile = plannedTile
                this.plannedPos = this.plannedTile.map(value => this.tile2pos(value))
                this.plannedPos.push(this.targetPos)

                this.npc.newTargets(this.plannedPos.slice(1), done)
                this.dirty = false
            }
        })
        if (this.staticTarget) {
            window.clearInterval(this.interval)
        }
    }

}
