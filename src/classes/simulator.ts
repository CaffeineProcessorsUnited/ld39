import {GameState} from "../states/game"
import {AI, AIState, AIType} from "./ai"
import {nou, log} from "../sgl/util"
import {Pathfinder} from "./pathfinder"

export class Simulator {
    gameState: GameState
    entities: { [index: number]: AI[] } = {}

    constructor(gameState: GameState) {
        this.gameState = gameState
    }

    spawn(type: AIType, state: AIState) {
        if (nou(this.entities[type.valueOf()])) {
            this.entities[type.valueOf()] = []
        }
        let i = this.entities[type.valueOf()].push(new AI(type, this.gameState)) - 1
        switch (type) {
            case AIType.LEARNING:
            case AIType.EATING:
            case AIType.SLEEPING:
            case AIType.WORKING:
            case AIType.VEHICLE:
                this.entities[type.valueOf()][i].reserveTile()
                break
            default:
                // No static place
                break
        }
        let path = this.getPath(type)
        log(path)
        switch (state) {
            case AIState.DRIVING:
                this.entities[type.valueOf()][i].setTilePosition(path.spawn)
                this.entities[type.valueOf()][i].newTargets(path.targets)
                this.entities[type.valueOf()][i].onPathCompleteHandler = () => {
                    this.entities[type.valueOf()][i].kill()
                    this.entities[type.valueOf()].splice(i, 1)
                    this.spawn(AIType.VEHICLE, AIState.DRIVING)
                }
                break
            default:
                this.entities[type.valueOf()][i].setTilePosition(path.spawn)
                //this.entities[type.valueOf()][i].goToReservedTile()
                break
        }
    }

    getPath(type: AIType) {
        let paths: any[] = []
        if (type === AIType.VEHICLE) {
            paths = [
                {
                    "spawn": new Phaser.Point(0, 0),
                    "targets": [
                        Pathfinder.tile2pos(this.gameState, new Phaser.Point(0, 4)),
                        Pathfinder.tile2pos(this.gameState, new Phaser.Point(4, 4)),
                        Pathfinder.tile2pos(this.gameState, new Phaser.Point(4, 0)),
                    ],
                },
            ]
        } else {
            paths = [
                {
                    "spawn": new Phaser.Point(0, 0),
                },
                {
                    "spawn": new Phaser.Point(1, 0),
                },
                {
                    "spawn": new Phaser.Point(2, 0),
                },
            ]
        }
        if (paths.length === 0) {
            throw new Error("No path implemented")
        }
        return paths[Math.floor(Math.random() * paths.length)]
    }

    update() {
        Object.getOwnPropertyNames(this.entities).forEach((type: number) => {
            this.entities[type].forEach((entity: AI) => {
                entity.update()
            })
        })
    }

}
