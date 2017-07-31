import {error, log, nou} from "../sgl/sgl"
import {GameState} from "../states/game"
import {IncRand} from "./incrand"
import {Pathfinder} from "./pathfinder"
import {Simulator} from "./simulator"
import {between, direction, random} from "../sgl/util"

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
    simulator: Simulator
    maxSpeed: number
    reactionDelay: number
    state: AIState
    type: AIType
    alert: number
    onPathCompleteHandler: () => void
    spriteSound: Phaser.Sound
    canBeRobbed: boolean
    private gameState: GameState
    private player: any
    private tileSize: number
    private giveUp: IncRand
    private speedUp: IncRand
    private timeout?: number
    private pathfinder: Pathfinder
    private currentPoint: number
    private targetX: number
    private targetY: number
    private reservedX: number
    private reservedY: number
    private armLength: number
    private maxWalkDistance: number
    private replacedTile: number
    private goHome: IncRand
    private alertRadSq: number
    private device: number
    private spawned: boolean = false
    private findingPath = false
    private _speed: number
    private speedInTiles: number
    private static directionN: number[] = [-Math.PI * 3 / 4, -Math.PI * 1 / 4]
    private static directionE: number[] = [-Math.PI * 1 / 4, Math.PI * 1 / 4]
    private static directionS: number[] = [Math.PI * 1 / 4, Math.PI * 3 / 4]
    private static directionW: number[] = [Math.PI * 3 / 4, -Math.PI * 3 / 4]

    constructor(simulator: Simulator, type: AIType) {
        this.simulator = simulator
        this.gameState = this.simulator.gameState
        this.pathfinder = new Pathfinder(this, this.gameState)
        this.plannedPoints = []
        this.currentPoint = 0
        this.canBeRobbed = true

        this.type = type
        this.speed = 0
        this.state = AIState.IDLE
        let spriteKey = ""
        this.giveUp = new IncRand(0.02, 5, 20)
        this.speedUp = new IncRand(0.2, 10, 20)

        this.tileSize = this.gameState.map.tileWidth

        this.device = random(5, 40)

        switch (type) {
            case AIType.DUMMY:
                this.maxSpeed = 0
                this.reactionDelay = 0
                this.alert = 0
                this.armLength = 0
                this.maxWalkDistance = 0
                this.giveUp = new IncRand(0, 0, 0, true)
                this.goHome = new IncRand(0, 0, 0, true)
                this.alertRadSq = 0
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
                this.goHome = new IncRand(0.02, 20, 300)
                this.alertRadSq = 8
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
                this.goHome = new IncRand(0, 0, 0, true)
                this.alertRadSq = 25
                this.device = 0
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
                this.goHome = new IncRand(0.01, 120, 600)
                this.alertRadSq = 12
                spriteKey = "prof"
                break
            case AIType.EATING:
                this.maxSpeed = 1
                this.reactionDelay = 1
                this.alert = 30
                this.armLength = 30
                this.maxWalkDistance = 8
                this.giveUp = new IncRand(0.04, 6, 10)
                this.goHome = new IncRand(0.01, 100, 300)
                this.alertRadSq = 6
                spriteKey = "eating"
                break
            case AIType.LEARNING:
                this.maxSpeed = 1
                this.reactionDelay = 0.5
                this.alert = 10
                this.armLength = 30
                this.maxWalkDistance = 17
                this.giveUp = new IncRand(0.03, 10, 20)
                this.goHome = new IncRand(0.03, 100, 300)
                this.alertRadSq = 5
                spriteKey = "learning"
                break
            case AIType.WORKING:
                this.maxSpeed = 1
                this.reactionDelay = 1
                this.alert = 70
                this.armLength = 30
                this.maxWalkDistance = 10
                this.giveUp = new IncRand(0.03, 10, 16)
                this.goHome = new IncRand(0.02, 120, 300)
                this.alertRadSq = 7
                spriteKey = "working"
                break
            case AIType.SLEEPING:
                this.maxSpeed = 0.5
                this.reactionDelay = 2
                this.alert = 10
                this.armLength = 25
                this.maxWalkDistance = 5
                this.giveUp = new IncRand(0.05, 2, 10)
                this.goHome = new IncRand(0.02, 100, 300)
                this.alertRadSq = 2
                spriteKey = "sleeping"
                break
            case AIType.VEHICLE:
                this.maxSpeed = 4
                this.reactionDelay = 0
                this.alert = 0
                this.armLength = 10
                this.maxWalkDistance = 0
                this.giveUp = new IncRand(0, 0, 0)
                this.goHome = new IncRand(0.06, 5, 6)
                this.alertRadSq = 0
                spriteKey = `car${random(0, 3)}`
                break
            default:
                throw new Error("Unknown AIType. Fix your shit!")
        }
        this.newSound()
        this.maxSpeed *= this.tileSize
        this.sprite = this.gameState.layerManager.layer("npc").add(this.gameState.game.add.sprite(0, 0, spriteKey))
        this.gameState.addAnimations(this.sprite, (this.type === AIType.VEHICLE))
        this.sprite.anchor.set(0.5)
        this.gameState.game.physics.enable(this.sprite)
        this.sprite.body.collideWorldBounds = true

        this.player = this.gameState.ref("player", "player")
    }

    private _reservedTile?: Phaser.Point

    get reservedTile() {
        return this._reservedTile!
    }

    set reservedTile(point: Phaser.Point | undefined) {
        this._reservedTile = point
        if (!nou(point)) {
            let pos = this.pathfinder.tile2pos(point!)
            this.reservedX = pos.x
            this.reservedY = pos.y
        }
    }

    get speed() {
        return this._speed
    }

    set speed(speed: number) {
        this._speed = speed
        this.speedInTiles = speed / this.tileSize
    }

    _spawnPoint: Phaser.Point

    get spawnPoint() {
        return this._spawnPoint
    }

    set spawnPoint(point: Phaser.Point) {
        this._spawnPoint = point
        this.startPoint = point
    }

    _startPoint: Phaser.Point

    get startPoint() {
        return this._startPoint
    }

    set startPoint(point: Phaser.Point) {
        this._startPoint = point
        let pos = this.pathfinder.tile2pos(this.startPoint).clone()
        this.sprite.x = pos.x
        this.sprite.y = pos.y
    }

    private _plannedPoints: Phaser.Point[]

    get plannedPoints(): Phaser.Point[] {
        return this._plannedPoints
    }

    set plannedPoints(pos: Phaser.Point[]) {
        // console.trace(pos, this._plannedPoints)
        this._plannedPoints = pos
    }

    get position(): Phaser.Point {
        return this.sprite.position
    }

    update() {
        // console.log("UPDATE", this.type, this.state)
        this.plannedPoints.forEach(value => {
            this.gameState.game.debug.rectangle(
                new Phaser.Rectangle(
                    value.x,
                    value.y,
                    20,
                    20),
                "#00ffff")
        })
        // if (!this.spawned && false) {
        //     let pos = this.pathfinder.tile2pos(this.startPoint).clone()
        //     log("SPAWNED", pos)
        //     this.sprite.x = pos.x
        //     this.sprite.y = pos.y
        //     this.spawned = true
        // }

        if (this.state === AIState.SITTING) {
            if (this.goHome.getRand()) {
                log("STANDUP")
                this.standUp()
            }
        }

        if (this.type === AIType.VEHICLE) {
            // this.gameState.game.physics.arcade.collide(this.sprite, this.gameState.layers["road"])
        } else {
            this.gameState.game.physics.arcade.collide(this.sprite)
            // this.gameState.game.physics.arcade.collide(this.sprite, this.gameState.layers["collision"])
        }
        this.pathfinder.setCurrent(this.position)
        this.sound()

        if (this.findingPath) {
            return
        }

        if (this.state === AIState.CHASING) {
            if (this.plannedPoints.length > this.maxWalkDistance) {
                this.setStroll()
            }

            if (this.canReach()) {
                log("CLUB")
                this.giveUp.reset()
                this.canBeRobbed = true
                if (this.type === AIType.VEHICLE) {
                    this.gameState.clubPlayer(40 + this.device)
                } else {
                    this.gameState.clubPlayer(10 + this.device)
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
            if (!nou(this.targetX) &&
                !nou(this.targetY) &&
                this.sprite.x !== this.targetX &&
                this.sprite.y !== this.targetY) {
                this.clearTimeout()
                this.speed = 0

                if (!nou(this.plannedPoints) && this.plannedPoints.length > 0) {
                    if (this.type === AIType.VEHICLE) {
                        this.speed = this.maxSpeed
                    } else {
                        this.speed = this.maxSpeed
                    }
                } else {
                    this.setStroll()
                }
            } else if (!nou(this.reservedTile) && this.sprite.x !== this.reservedX &&
                this.sprite.y !== this.reservedY) {
                // log("GOT RESERVED")
                let newTarget = this.pathfinder.tile2pos(this.reservedTile!)
                this.speed = this.maxSpeed
                this.setTarget(newTarget.x, newTarget.y)
            } else if (nou(this.targetX) || nou(this.targetY)) {
                this.speed = 0
                switch (this.type) {
                    case AIType.LEARNING:
                    case AIType.EATING:
                    case AIType.SLEEPING:
                    case AIType.WORKING:
                        if (this.state !== AIState.SITTING) {
                            this.sitDown(this.position.x, this.position.y)
                        }
                        break
                    case AIType.VEHICLE:
                        if (this.state === AIState.PARKING) {
                        }
                        break
                    default:
                        break
                }
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
            this.sprite.x = this.targetX
            this.sprite.y = this.targetY
            this.sprite.body.velocity.x = 0
            this.sprite.body.velocity.y = 0
        } else {
            let dx: number
            let dy: number
            if (this.plannedPoints && this.plannedPoints.length > 0 && this.currentPoint < this.plannedPoints.length) {
                dx = this.plannedPoints[this.currentPoint].x - this.position.x
                dy = this.plannedPoints[this.currentPoint].y - this.position.y
                //
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
                dx = this.targetX - this.position.x
                dy = this.targetY - this.position.y
            }

            if (isNaN(dx) || isNaN(dy)) {
                this.sprite.body.velocity.x = 0
                this.sprite.body.velocity.y = 0
                return
            }
            const dist = Math.sqrt(dx * dx + dy * dy)

            const vx = dx / dist * this.speed
            const vy = dy / dist * this.speed

            this.sprite.body.velocity.x = vx
            this.sprite.body.velocity.y = vy

            if (this.speed === 0) {
                return
            }

            log(direction(this.sprite.body.angle))
            switch (direction(this.sprite.body.angle)) {
                case 0:
                    this.sprite.animations.play("up")
                    log("up")
                    break
                case 1:
                    this.sprite.animations.play("right")
                    log("right")
                    break
                case 2:
                    this.sprite.animations.play("down")
                    log("down")
                case 3:
                    this.sprite.animations.play("left")
                    log("left")
                    break
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
        if (!this.canBeRobbed && this.type !== AIType.GUARD) {
            return
        }
        const rand = Math.random() * 100
        if (rand < this.alert) {
            let dx = this.position.x - this.gameState.currentTile.worldX
            let dy = this.position.y - this.gameState.currentTile.worldY
            if (dx * dx + dy * dy < this.alertRadSq * this.gameState.map.tileWidth * this.gameState.map.tileWidth) {
                this.canBeRobbed = false
                if (this.type !== AIType.GUARD) {
                    this.gameState.pickUp(this.device)
                }
                this.setChasing()
            }
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

        return dist < this.armLength
    }

    getTileId() {
        return 943 // TODO: Calculate with custom Tilesheet
    }

    sitDown(x: number, y: number): boolean {
        log("SITDOWN")
        if (this.type !== AIType.VEHICLE) {
            let tile = this.gameState.getTileAt(x, y, "Tables")
            if (nou(tile)) {
                error(`Can't sit down at ${x}, ${y} because it has no tile to replace`)
                return false
            }
            this.sprite.x = tile.worldX + tile.centerX
            this.sprite.y = tile.worldY + tile.centerY
            this.replacedTile = tile.index
            log(`Replace tile id ${tile.index} with ${this.getTileId()} at ${tile.x}, ${tile.y}`)
            this.gameState.map.replace(tile.index, this.getTileId(), tile.x, tile.y, 1, 1, "Tables")
        }
        this.state = AIState.SITTING
        return true
    }

    standUp() {
        if (this.type !== AIType.VEHICLE) {
            let tile = this.pathfinder.pos2tile(this.position)
            this.state = AIState.IDLE
            this.canBeRobbed = false
            log(`Replace tile id ${this.getTileId()} with ${this.replacedTile} at ${tile.x}, ${tile.y}`)
            this.gameState.map.replace(this.getTileId(), this.replacedTile, tile.x, tile.y, 1, 1, "Tables")
        } else {
            this.state = AIState.PARKING
        }
        this.speed = this.maxSpeed
        let pos = this.pathfinder.tile2pos(this.spawnPoint)
        log(this.spawnPoint, pos)
        this.setTarget(pos.x, pos.y)
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
        if (this.findingPath) {
            return false
        }
        if (x < 0 || y < 0 || x > this.gameState.map.widthInPixels || y > this.gameState.map.heightInPixels) {
            return false
        }
        const tile = this.pathfinder.pos2tile(new Phaser.Point(x, y))

        if (this.getCollider()(tile.x, tile.y)) {
            return false
        }
        const dx = this.position.x - x
        const dy = this.position.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < this.tileSize) {
            this.plannedPoints = [new Phaser.Point(x, y)]
            this.currentPoint = 0
            this.targetX = x
            this.targetY = y
        } else {
            this.pathfinder.setTarget(new Phaser.Point(x, y))
            this.pathfinder.forceUpdate()
            this.findingPath = true
        }
        return true
    }

    onPlayerMove(pos: Phaser.Point) {
        if (this.state === AIState.CHASING) {
            this.setTarget(pos.x, pos.y)
            this.pathfinder.setTarget(pos)
        }
    }

    newTargets(pos: Phaser.Point[], done: boolean = false) {
        this.plannedPoints = pos
        this.currentPoint = 0
        if (done) {
            if (this.plannedPoints.length > 0) {
                this.targetX = this.plannedPoints[this.plannedPoints.length - 1].x
                this.targetY = this.plannedPoints[this.plannedPoints.length - 1].y
            }
            this.findingPath = false
        }
    }

    reserveTile(tile?: Phaser.Point): Phaser.Point | undefined {
        if (!nou(tile)) {
            this.reservedTile = tile!
            return tile
        }
        switch (this.type) {
            case AIType.LEARNING:
            case AIType.EATING:
            case AIType.SLEEPING:
            case AIType.WORKING:
                break
            case AIType.VEHICLE:
                if (this.state === AIState.PARKING) {
                    let tiles = this.gameState.getTilesForType(2158, "Road")
                    if (tiles.length > 0) {
                        let i = 0
                        do {
                            this.reservedTile = tiles[i]
                        } while (i++ < tiles.length && this.gameState.simulator.isReserved(this.reservedTile))
                        if (i >= tiles.length) {
                            throw new Error("You can't spawn more cars than parking lots available! Fegget")
                        }
                    }
                }
                break
            default:
                // No static place
                break
        }
        return this.reservedTile
    }

    onPathComplete() {
        if (!nou(this.onPathCompleteHandler)) {
            this.onPathCompleteHandler()
        }
    }

    getCollider(): Function {
        return (x: number, y: number) => {
            if (this.type === AIType.VEHICLE) {
                return !this.gameState.hasCollision(x, y, "Road")
            } else {
                return this.gameState.hasCollision(x, y) &&
                    !this.gameState.hasCollision(x, y, "Doors")
            }
        }
    }

    forcePathUpdate() {
        this.pathfinder.forceUpdate()
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
