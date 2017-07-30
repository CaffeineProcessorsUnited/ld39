import {GameState} from "../states/game"
import {AI, AIState, AIType} from "./ai"
import {nou} from "../sgl/util"

export class Simulator {
    gameState: GameState
    entities: { [index: number]: AI[] } = {}

    constructor(gameState: GameState) {

    }

    spawn(type: AIType, state: AIState) {
        if (nou(this.entities[type.valueOf()])) {
            this.entities[type.valueOf()] = []
        }
        let i = this.entities[type.valueOf()].push(new AI(type, this.gameState))
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
        switch (state) {
            case AIState.DRIVING:
                this.entities[type.valueOf()][i].setTilePosition(path.spawn)
                this.entities[type.valueOf()][i].setTarget(path.target)
                break
            default:
                this.entities[type.valueOf()][i].setTilePosition(path.spawn)
                break
        }
    }

    getPath(type: AIType) {
        let paths: any[] = []
        if (type === AIType.VEHICLE) {
            paths = [
                {
                    "spawn": new Phaser.Point(0, 0),
                    "target": new Phaser.Point(8, 8),
                },
                {
                    "spawn": new Phaser.Point(8, 8),
                    "target": new Phaser.Point(0, 0),
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
        return paths[Math.random() * paths.length]
    }

    update() {
        Object.getOwnPropertyNames(this.entities).forEach((type: number) => {
            this.entities[type].forEach((entity: AI) => {
                entity.update()
            })
        })
    }

}
