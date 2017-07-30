import {GameState} from "../states/game"
import {AI, AIState, AIType} from "./ai"
import {nou, log} from "../sgl/util"
import {Pathfinder} from "./pathfinder"

export class Simulator {
    gameState: GameState
    entities: { [index: string]: AI[] } = {}
    reservedTiles: { [index: string]: AI } = {}

    constructor(gameState: GameState) {
        this.gameState = gameState
    }

    spawn(type: AIType, state: AIState, spawn?: Phaser.Point, reserved?: Phaser.Point) {
        if (nou(this.entities[type.valueOf()])) {
            this.entities[type.valueOf()] = []
        }
        let i = this.entities[type.valueOf()].push(new AI(this, type)) - 1
        this.entities[type.valueOf()][i].state = state
        this.respawn(this.entities[type.valueOf()][i], spawn, reserved)

    }

    respawn(object: AI, spawn?: Phaser.Point, reserved?: Phaser.Point) {
        let type = object.type
        let state = object.state
        switch (type) {
            case AIType.LEARNING:
            case AIType.EATING:
            case AIType.SLEEPING:
            case AIType.WORKING:
            case AIType.VEHICLE:
                let tile = object.reserveTile(reserved)
                if (!nou(tile)) {
                    this.reservedTiles[tile!.toString()] = object
                }
                break
            default:
                // No static place
                break
        }
        let path = this.getPath(type)
        if (!nou(spawn)) {
            path.spawn = spawn
        } else if (!nou(object.spawnPoint)) {
            path.spawn = object.spawnPoint
        }
        log(path)
        switch (state) {
            case AIState.DRIVING:
                object.reservedTile = undefined
                object.setTilePosition(path.spawn)
                object.newTargets(path.targets)
                object.onPathCompleteHandler = () => {
                    this.respawn(object)
                }
                break
            default:
                object.setTilePosition(path.spawn)
                break
        }
        object.newSound()
    }

    getPath(type: AIType) {
        let paths: any[] = []
        if (type === AIType.VEHICLE) {
            paths = [
                {
                    "spawn": new Phaser.Point(0, 0),
                    "targets": [
                        Pathfinder.tile2pos(this.gameState, new Phaser.Point(0, 1)),
                        Pathfinder.tile2pos(this.gameState, new Phaser.Point(4, 1)),
                        Pathfinder.tile2pos(this.gameState, new Phaser.Point(4, 3)),
                        Pathfinder.tile2pos(this.gameState, new Phaser.Point(5, 3)),
                        Pathfinder.tile2pos(this.gameState, new Phaser.Point(5, 0)),
                    ],
                },
            ]
        } else {
            paths = [
                {
                    "spawn": new Phaser.Point(77, 59),
                },
                {
                    "spawn": new Phaser.Point(78, 59),
                },
                {
                    "spawn": new Phaser.Point(79, 59),
                },
            ]
        }
        if (paths.length === 0) {
            throw new Error("No path implemented")
        }
        return paths[Math.floor(Math.random() * paths.length)]
    }

    update() {
        Object.getOwnPropertyNames(this.entities).forEach((type: string) => {
            this.entities[type].forEach((entity: AI) => {
                entity.onPlayerMove(this.gameState.ref("player", "player").position)
                entity.update()
            })
        })
    }

    pickPocket() {
        Object.getOwnPropertyNames(this.entities).forEach((type: string) => {
            this.entities[type].forEach((entity: AI) => {
                let dx = entity.position.x - this.gameState.currentTile.worldX
                let dy = entity.position.y - this.gameState.currentTile.worldY
                if (dx * dx + dy * dy < 4 * this.gameState.map.tileWidth * this.gameState.map.tileWidth) {
                    entity.pickPocket()
                }
            })
        })
    }

}
