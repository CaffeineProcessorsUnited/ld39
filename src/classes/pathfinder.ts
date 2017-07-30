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
    private interval: number

    constructor(npc: AI, gs: GameState) {
        this.npc = npc
        this.gs = gs
        this.interval = setInterval(this.onUpdate.bind(this), 100)
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
        return new Phaser.Point(
            tile.x * this.gs.map.tileWidth + this.gs.map.tileWidth / 2,
            tile.y * this.gs.map.tileHeight + this.gs.map.tileHeight / 2
        )
    }

    pos2tile(pos: Phaser.Point): Phaser.Point {
        return new Phaser.Point(
            Math.floor(pos.x / this.gs.map.tileWidth),
            Math.floor(pos.y / this.gs.map.tileHeight)
        )
    }

    private onUpdate() {
        if (!this.dirty) {
            // console.log("GOT TO UPDATE, BUT NO CHANGES")
            return
        }
        if (!this.curPos || !this.targetPos) {
            // console.log("SHOULD CALCULATE PATH. MISSING VALUES")
            return
        }

        let astar = new AStar(this.gs)

        let plannedTile = astar.getPath(this.curTile, this.targetTile)

        if (nou(this.plannedTile) || !Pathfinder.pathEquals(this.plannedTile, plannedTile)) {
            this.plannedTile = plannedTile
            this.plannedPos = this.plannedTile.map(value => this.tile2pos(value))
            this.plannedPos.push(this.targetPos)

            this.npc.newTargets(this.plannedPos)
            this.dirty = false
        }
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

}