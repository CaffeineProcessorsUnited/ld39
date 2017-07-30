import {error, log, nou} from "../sgl/sgl"
import {GameState} from "../states/game"
import {IncRand} from "./incrand"
import {Pathfinder} from "./pathfinder"

export enum AIState {
    IDLE,
    STROLL,
    TALKING,
    CHASING,
    SITTING,
    DRIVING,
    PARKING,
}

export enum AIType {
    DUMMY,
    STANDING,
    GUARD,
    PROF,
    EATING,
    LEARNING,
    WORKING,
    SLEEPING,
    VEHICLE,
}

export class AI {
    sprite: Phaser.Sprite
    speed: number
    maxSpeed: number
    reactionDelay: number
    state: AIState
    type: AIType
    alert: number
    reservedTile?: Phaser.Point
    onPathCompleteHandler: () => void
    spriteSound: Phaser.Sound
    private gameState: GameState
    private player: any
    private tileSize: number
    private giveUp: IncRand
    private speedUp: IncRand
    private timeout?: number
    private pathfinder: Pathfinder
    private plannedPoints: Phaser.Point[]
    private currentPoint: number
    private targetX: number
    private targetY: number
    private armLength: number
    private maxWalkDistance: number

    constructor(type: AIType, gameState: GameState) {
        this.gameState = gameState
        this.pathfinder = new Pathfinder(this, this.gameState)
        this.plannedPoints = []
        this.currentPoint = 0

        this.type = type
        this.speed = 0
        this.state = AIState.IDLE
        let spriteKey = ""
        this.giveUp = new IncRand(0.02, 5, 20)
        this.speedUp = new IncRand(0.2, 10, 20)

        this.tileSize = this.gameState.map.tileWidth

        switch (type) {
            case AIType.DUMMY:
                this.maxSpeed = 0
                this.reactionDelay = 0
                this.alert = 0
                this.armLength = 0
                this.maxWalkDistance = 0
                this.giveUp = new IncRand(0, 0, 0)
                spriteKey = "dummy"
                break
            case AIType.STANDING:
                this.maxSpeed = 1
                this.reactionDelay = 0.5
                this.state = AIState.STROLL
                this.alert = 20
                this.armLength = 30
                this.maxWalkDistance = 20
                this.giveUp = new IncRand(0.02, 8, 30)
                spriteKey = "standing"
                break
            case AIType.GUARD:
                this.maxSpeed = 2
                this.reactionDelay = 0.2
                this.state = AIState.STROLL
                this.alert = 90
                this.armLength = 40
                this.maxWalkDistance = 30
                this.giveUp = new IncRand(0.01, 10, 50)
                spriteKey = "guard"
                break
            case AIType.PROF:
                this.maxSpeed = 0.7
                this.reactionDelay = 1.2
                this.state = AIState.STROLL
                this.alert = 50
                this.armLength = 25
                this.maxWalkDistance = 15
                this.giveUp = new IncRand(0.04, 6, 20)
                spriteKey = "prof"
                break
            case AIType.EATING:
                this.maxSpeed = 1
                this.reactionDelay = 1
                this.alert = 30
                this.armLength = 30
                this.maxWalkDistance = 8
                this.giveUp = new IncRand(0.04, 6, 10)
                spriteKey = "eating"
                break
            case AIType.LEARNING:
                this.maxSpeed = 1
                this.reactionDelay = 0.5
                this.alert = 10
                this.armLength = 30
                this.maxWalkDistance = 17
                this.giveUp = new IncRand(0.03, 10, 20)
                spriteKey = "learning"
                break
            case AIType.WORKING:
                this.maxSpeed = 1
                this.reactionDelay = 1
                this.alert = 70
                this.armLength = 30
                this.maxWalkDistance = 10
                this.giveUp = new IncRand(0.03, 10, 16)
                spriteKey = "working"
                break
            case AIType.SLEEPING:
                this.maxSpeed = 0.5
                this.reactionDelay = 2
                this.alert = 10
                this.armLength = 25
                this.maxWalkDistance = 5
                this.giveUp = new IncRand(0.05, 2, 10)
                spriteKey = "sleeping"
                break
            case AIType.VEHICLE:
                this.maxSpeed = 2
                this.reactionDelay = 0
                this.alert = 0
                this.armLength = 10
                this.maxWalkDistance = 0
                this.giveUp = new IncRand(0, 0, 0)
                spriteKey = "vehicle"
                break
            default:
                throw new Error("Unknown AIType. Fix your shit!")
        }
        this.newSound()
        this.maxSpeed *= this.tileSize
        this.sprite = this.gameState.game.add.sprite(200, 200, spriteKey)
        this.sprite.anchor.set(0.5)
        this.gameState.game.physics.enable(this.sprite)
        this.sprite.body.collideWorldBounds = true
        this.player = this.gameState.ref("player", "player")
    }

    get position(): Phaser.Point {
        return this.sprite.position
    }

    update() {
        this.gameState.game.physics.arcade.collide(this.sprite)
        this.gameState.game.physics.arcade.collide(this.sprite, this.gameState.layers["collision"])
        this.pathfinder.setCurrent(this.position)

        if (this.state === AIState.CHASING) {
            if (this.plannedPoints.length > this.maxWalkDistance) {
                this.setStroll()
            }

            if (this.canReach()) {
                log("CLUB")
                if (this.type === AIType.VEHICLE) {
                    this.gameState.clubPlayer(40)
                } else {
                    this.gameState.clubPlayer(10)
                }
                this.setStroll()
                return
            }

            // Chance to give up chace
            if (this.giveUp.getRand()) {
                this.setStroll()
            }
            // Chance to sprint / slow down
            if (this.speedUp.getRand()) {
                this.speed += 0.1 * (Math.random() * 2 - 1)
            }
        } else if (this.state === AIState.STROLL) {
            if (this.sprite.body.blocked.left ||
                this.sprite.body.blocked.right ||
                this.sprite.body.blocked.top ||
                this.sprite.body.blocked.down

            ) {
                console.log("BLOCKED")
                this.doStroll(0)
                return
            }

            if (this.nearTarget() || Math.random() < 0.001) {
                this.setStroll()
                return
            }
        } else if (this.state === AIState.TALKING) {
            this.clearTimeout()
            this.speed = 0
        } else {
            if (this.sprite.position.x !== this.targetX && this.sprite.position.y !== this.targetY) {
                this.clearTimeout()
                if (!nou(this.reservedTile)) {
                    let newTarget = this.pathfinder.tile2pos(this.reservedTile!)
                    this.speed = this.maxSpeed
                    this.setTarget(newTarget.x, newTarget.y)
                } else if (this.type === AIType.VEHICLE && !nou(this.plannedPoints) && this.plannedPoints.length > 0) {
                    this.speed = this.maxSpeed
                } else {
                    this.setStroll()
                }
            } else {
                this.speed = 0
            }
        }

        if (this.nearCurrentPoint()) {
            this.currentPoint += 1
            if (this.currentPoint >= this.plannedPoints.length) {
                this.plannedPoints = []
                this.currentPoint = 0
                this.onPathComplete()
            }
        }

        this.sound()

        this.move()
    }

    nearCurrentPoint(): boolean {
        if (this.currentPoint >= this.plannedPoints.length) {
            return false
        }

        const dx = this.plannedPoints[this.currentPoint].x - this.position.x
        const dy = this.plannedPoints[this.currentPoint].y - this.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        return dist < this.speed * this.gameState.game.time.elapsedMS / 1000.
    }

    distanceToPlayer(): number {
        const dx = this.player.x - this.position.x
        const dy = this.player.y - this.position.y
        return Math.sqrt(dx * dx + dy * dy)
    }

    move() {
        if (this.nearTarget()) {
            this.sprite.position.x = this.targetX
            this.sprite.position.y = this.targetY
            this.sprite.body.velocity.x = 0
            this.sprite.body.velocity.y = 0
        } else {
            if (this.plannedPoints && this.plannedPoints.length > 0 && this.currentPoint < this.plannedPoints.length) {
                const dx = this.plannedPoints[this.currentPoint].x - this.position.x
                const dy = this.plannedPoints[this.currentPoint].y - this.position.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                this.sprite.body.velocity.x = dx / dist * this.speed
                this.sprite.body.velocity.y = dy / dist * this.speed

                // this.plannedPoints.forEach(value => {
                //     this.gameState.game.debug.rectangle(
                //         new Phaser.Rectangle(
                //             value.x,
                //             value.y,
                //             20,
                //             20),
                //         "#0000ff")
                // })
                //
                // this.gameState.game.debug.rectangle(
                //     new Phaser.Rectangle(
                //         this.plannedPoints[this.currentPoint].x,
                //         this.plannedPoints[this.currentPoint].y,
                //         20,
                //         20),
                //     "#ff00ff")
            } else {
                const dx = this.targetX - this.position.x
                const dy = this.targetY - this.position.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                this.sprite.body.velocity.x = dx / dist * this.speed
                this.sprite.body.velocity.y = dy / dist * this.speed
            }
        }

    }

    sound() {
        if (!nou(this.spriteSound)) {
            if (this.type === AIType.VEHICLE) {
                if (this.speed > 0) {
                    if (!this.spriteSound.isPlaying) {
                        this.spriteSound.loop = true
                        this.spriteSound.play()
                    }
                } else {
                    this.spriteSound.fadeOut(1000)
                }
            }
            this.spriteSound.volume = Phaser.Math.clamp(1 - (this.distanceToPlayer() / (8 * this.tileSize)), 0, 1)
        }
    }

    newSound() {
        log("new sound")
        if (!nou(this.spriteSound)) {
            this.spriteSound.stop()
            this.spriteSound.destroy()
        }
        switch (this.type) {
            case AIType.VEHICLE:
                this.spriteSound = this.gameState.game.sound.add(`car${Math.floor(Math.random() * 4)}`)
                break
            default:
                log("This type has no sound!")
                break
        }
    }

    pickPocket() {
        const rand = Math.random() * 100
        if (rand < this.alert) {
            this.setChasing()
        }
    }

    punch() {
        this.speed = 0
        this.doChase(3)
    }

    setStroll() {
        this.clearTimeout()
        this.state = AIState.IDLE
        if (this.type !== AIType.VEHICLE) {
            this.doStroll(1)
        }
    }

    setTalking() {
        this.clearTimeout()
        this.state = AIState.TALKING
    }

    setChasing() {
        this.speed = 0
        this.state = AIState.CHASING
        this.doChase(this.reactionDelay)
    }

    nearTarget(): boolean {
        const dx = this.position.x - this.targetX
        const dy = this.position.y - this.targetY
        const dist = Math.sqrt(dx * dx + dy * dy)
        return dist < this.speed * this.gameState.game.time.elapsedMS / 1000.
    }

    canReach(): boolean {
        const dx = this.position.x - this.targetX
        const dy = this.position.y - this.targetY
        const dist = Math.sqrt(dx * dx + dy * dy)

        log(this.position, this.targetX, this.targetY, dx, dy, dist, this.armLength)
        return dist < this.armLength
    }

    getTileId() {
        return 943 // TODO: Calculate with custom Tilesheet
    }

    sitDown(x: number, y: number) {
        let tile = this.gameState.getTileAt(x, y, "Tables")
        if (nou(tile)) {
            error(`Can't sit down at ${x}, ${y} because it has no tile to replace`)
            return
        }
        this.position.x = tile.worldX + tile.centerX
        this.position.y = tile.worldY + tile.centerY
        this.state = AIState.SITTING
        log(`Replace tile id ${tile.index} with ${this.getTileId()} at ${tile.x}, ${tile.y}`)
        this.gameState.map.replace(tile.index, this.getTileId(), tile.x, tile.y, 1, 1, "Tables")
    }

    clearTimeout() {
        if (this.timeout !== undefined) {
            clearTimeout(this.timeout)
        }
    }

    async(func: Function, delta: number) {
        this.clearTimeout()
        this.timeout = window.setTimeout(() => {
            this.timeout = undefined
            func()
        }, delta)
    }

    setTarget(x: number, y: number): boolean {
        if (x < 0 || y < 0 || x > this.gameState.map.widthInPixels || y > this.gameState.map.heightInPixels) {
            return false
        }
        const tile = this.pathfinder.pos2tile(new Phaser.Point(x, y))
        if (this.gameState.hasCollision(tile.x, tile.y)) {
            return false
        }
        const dx = this.position.x - x
        const dy = this.position.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        // console.log("++++", dx, dy, norm, this.tileSize)

        this.targetX = x
        this.targetY = y
        if (dist < this.tileSize) {
            this.plannedPoints = [new Phaser.Point(x, y)]
            this.currentPoint = 0
        } else {
            this.pathfinder.setTarget(new Phaser.Point(x, y))
        }
        return true
    }

    onPlayerMove(pos: Phaser.Point) {
        if (this.state === AIState.CHASING) {
            this.setTarget(pos.x, pos.y)
            this.pathfinder.setTarget(pos)
        }
    }

    newTargets(pos: Phaser.Point[]) {
        this.plannedPoints = pos
        this.currentPoint = 0
    }

    reserveTile() {
        switch (this.type) {
            case AIType.LEARNING:
            case AIType.EATING:
            case AIType.SLEEPING:
            case AIType.WORKING:

                break
            case AIType.VEHICLE:
                if (this.state === AIState.PARKING) {
                    //this.gameState.getTilesForType(1, "Road")
                    this.reservedTile = new Phaser.Point(6, 6)
                    log(this.reservedTile)
                }
                break
            default:
                // No static place
                break
        }
    }

    setTilePosition(tile: Phaser.Point) {
        this.sprite.position = this.pathfinder.tile2pos(tile)
    }

    onPathComplete() {
        log("PATH DONE")
        if (!nou(this.onPathCompleteHandler)) {
            this.onPathCompleteHandler()
        }
    }

    private doChase(delay: number) {
        this.async(() => {
            this.speed = this.maxSpeed
            this.giveUp.reset()
            this.speedUp.reset()
        }, delay * 1000)
    }

    private doStroll(delay: number) {
        this.async(() => {
            this.state = AIState.STROLL
            this.speed = (0.5 + 0.1 * Math.random()) * this.maxSpeed
            while (!this.setTarget(
                this.position.x + Math.round(Math.random() * 10 - 5) * this.tileSize / 2,
                this.position.y + Math.round(Math.random() * 10 - 5) * this.tileSize / 2)) {
                console.log("Cannot find suitable location for stroll")
            }
        }, delay * 1000)
    }
}
