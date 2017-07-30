import {Dialog, error, Layer, LayerManager, log, State} from "../sgl/sgl"
import {Trigger} from "../classes/trigger"
import {AI, AIState, AIType} from "../classes/ai"
import {choose, nou, range} from "../sgl/util"
import {Simulator} from "../classes/simulator"

enum LEVEL {
    PARKINGLOT,
    MENSA,
    LIBRARY,
    PCPOOL,
}

export class GameState extends State {

    energyLossPerSecond: number = 5
    layers: { [layer: string]: Phaser.TilemapLayer } = {}
    zoom: number = 1
    map: Phaser.Tilemap
    cursors: Phaser.CursorKeys
    triggers: Array<Trigger> = []
    lastTile: Phaser.Tile
    currentTile: Phaser.Tile
    layerManager: LayerManager
    music: Phaser.Sound
    unlockedLevel: boolean[] = [false, false, false]
    currentTrigger: Trigger
    simulator: Simulator
    _init = (map: string) => {
        // TODO: Select map to load
    }
    _preload = () => {
        this.game.load.image("logo", "assets/logo.png")
        this.game.load.image("player", "assets/Unit/medievalUnit_24.png")
        this.game.load.image("dialog", "assets/dialog.png")
        this.game.load.tilemap("tilemap", "assets/MapLib.json", null, Phaser.Tilemap.TILED_JSON)
        this.game.load.image("tilesheet_city", "assets/tilesheet_city.png")
        this.game.load.image("tilesheet_shooter", "assets/tilesheet_shooter.png")
        this.game.load.image("tilesheet_indoor", "assets/tilesheet_indoor.png")
        this.game.load.image("tilesheet_collision", "assets/tilesheet_collision.png")
        this.game.load.image("tilesheet_custom", "assets/tilesheet_custom.png")
        this.game.load.json("trigger", "assets/trigger.json")
        this.game.load.audio("dark_mix", "assets/audio/dark_mix.ogg")
        this.game.load.audio("car0", "assets/audio/car0.ogg")
        this.game.load.audio("car1", "assets/audio/car1.ogg")
        this.game.load.audio("car2", "assets/audio/car2.ogg")
        this.game.load.audio("car3", "assets/audio/car3.ogg")
        this.game.load.audio("walk0", "assets/audio/walk0.ogg")
        this.game.load.audio("walk1", "assets/audio/walk1.ogg")
        this.game.load.audio("walk2", "assets/audio/walk2.ogg")
        this.game.load.audio("walk3", "assets/audio/walk3.ogg")
        this.game.load.audio("walk4", "assets/audio/walk4.ogg")
    }
    _create = () => {

        this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL
        this.game.physics.startSystem(Phaser.Physics.ARCADE)

        this.setupTilemap()
        this.loadTrigger(this.game.cache.getJSON("trigger"))
        this.setupInput()

        this.cursors = this.game.input.keyboard.createCursorKeys()

        this.game.camera.follow(this.ref("player", "player"), Phaser.Camera.FOLLOW_TOPDOWN)
        this.currentTile = this.map.getTileWorldXY(this.ref("player", "player").position.x, this.ref("player", "player").position.y)
        this.lastTile = this.currentTile

        this.simulator = new Simulator(this)
        // this.simulator.spawn(AIType.VEHICLE, AIState.DRIVING)
        this.simulator.spawn(AIType.GUARD, AIState.IDLE)

        setTimeout(() => {
            //this.npc[0].sitDown(125, 125)
        }, 5000)

        window.document.getElementById("led3")!.style.animationDuration = "4s"
        this.game.forceSingleUpdate = true
    }
    _update = () => {
        this.currentTile = this.getCurrentTile()
        // this.ref("dialog", "dialog").above(this.ref("player", "player").position.x, this.ref("player", "player").position.y)
        this.game.physics.arcade.collide(this.ref("player", "player"), this.layers["ground"])
        this.game.physics.arcade.collide(this.ref("player", "player"), this.layers["collision"])
        this.energyReserve -= this.energyLossPerSecond * this.game.time.elapsedMS / 1000.


        //movement
        let damping = 100
        let max = 200
        let rate = 80

        if (this.ref("player", "player").body.velocity.x >= max) {
            this.ref("player", "player").body.velocity.x = max
        }
        if (this.ref("player", "player").body.velocity.y >= max) {
            this.ref("player", "player").body.velocity.y = max
        }
        if (this.ref("player", "player").body.velocity.x <= max * -1) {
            this.ref("player", "player").body.velocity.x = max * -1
        }
        if (this.ref("player", "player").body.velocity.y <= max * -1) {
            this.ref("player", "player").body.velocity.y = max * -1
        }


        if (this.cursors.left.isDown) {
            this.ref("player", "player").body.velocity.x -= rate
            // this.ref("player", "player").animations.play("left")
        } else if (this.cursors.right.isDown) {
            this.ref("player", "player").body.velocity.x += rate
            // this.ref("player", "player").animations.play("right")
        } else {
            if (this.ref("player", "player").body.velocity.x >= damping) {
                this.ref("player", "player").body.velocity.x -= damping
            } else if (this.ref("player", "player").body.velocity.x <= damping * -1) {
                this.ref("player", "player").body.velocity.x += damping
            } else {
                this.ref("player", "player").body.velocity.x = 0
            }
        }

        if (this.cursors.up.isDown) {
            this.ref("player", "player").body.velocity.y -= rate
            // this.ref("player", "player").animations.play("up")
        } else if (this.cursors.down.isDown) {
            this.ref("player", "player").body.velocity.y += rate
            // this.ref("player", "player").animations.play("down")
        } else {
            // this.ref("player", "player").animations.stop()
            // this.ref("player", "player").frame = 4
            if (this.ref("player", "player").body.velocity.y >= damping) {
                this.ref("player", "player").body.velocity.y -= damping
            } else if (this.ref("player", "player").body.velocity.y <= damping * -1) {
                this.ref("player", "player").body.velocity.y += damping
            } else {
                this.ref("player", "player").body.velocity.y = 0
            }
        }

        this.trigger()
        this.lastTile = this.currentTile

        this.simulator.update()

        this.game.debug.text("Energy remaining: " + this.energyReserve, 30, 115)


        this.game.debug.text("CurrentTile: x:" + this.lastTile.x + ", y:" + this.lastTile.y + ", layers:", 30, 135)
        let line = 155
        this.map.layers.forEach((_, lid) => {
            let tile = this.map.getTile(this.lastTile.x, this.lastTile.y, lid)
            if (tile != null) {
                this.game.debug.text("    id: " + tile.index + ", layer: " + tile.layer.name, 30, line)
                line += 20
            }
        })


        let batled = window.document.getElementById("led2")!
        if (this.energyReserve <= 0) {
            batled.style.fill = "#cccccc"
            batled.style.animationDuration = "0s"
            window.document.getElementById("led1")!.style.fill = "#cccccc"
            window.document.getElementById("led3")!.style.fill = "#cccccc"
            window.document.getElementById("led3")!.style.animationDuration = "0s"
            window.document.getElementById("led4")!.style.fill = "#cccccc"
            window.document.getElementById("led4")!.style.animationDuration = "0s"

        } else if (this.energyReserve < 10) {
            batled.style.animationName = "blink-red"
            batled.style.animationDuration = "1s"
        } else if (this.energyReserve < 20) {
            batled.style.fill = "orange"
            batled.style.animationDuration = "0s"

        } else {
            batled.style.fill = "lime"
            batled.style.animationDuration = "0s"
        }

        if (this.energyReserve <= 0) {
            this.gameOver()
        }
    }
    _render = () => {
        // this.game.debug.body(this.ref("player", "player"))
        // this.game.debug.cameraInfo(this.game.camera, 32, 32)
    }

    _energyReserve: number = 100

    get energyReserve() {
        return this._energyReserve
    }

    set energyReserve(energyReserve: number) {
        this._energyReserve = energyReserve
        this.updateBatteryIcon()
    }

    setupTilemap() {
        this.map = this.game.add.tilemap("tilemap")
        this.map.addTilesetImage("Collision", "tilesheet_collision")
        this.map.addTilesetImage("Indoor", "tilesheet_indoor")
        this.map.addTilesetImage("City", "tilesheet_city")
        this.map.addTilesetImage("Shooter", "tilesheet_shooter")
        this.map.addTilesetImage("Custom", "tilesheet_custom")

        const _layers = [
            {
                "name": "Collision",
                "renderable": false,
            },
            {
                "name": "Ground",
            },
            {
                "name": "Glass",
            },
            {
                "name": "Roadmarker",
                "renderable": false,
            },
            {
                "name": "Roadmarker2",
            },
            {
                "name": "Environment",
                "renderable": false,
            },
            {
                "name": "Carpet",
            },
            {
                "name": "Doors",
            },
            {
                "name": "Tables",
            },
            {
                "name": "Shelves",
            },
            {
                "name": "Ontop",
            },
        ]
        _layers.forEach((layer: any) => {
            const idx = layer.name.toLowerCase()
            const _layer = this.map.createLayer(layer.name)
            if (_layer !== undefined) {
                this.layers[idx] = _layer
                this.layers[idx].resizeWorld()
                this.layers[idx].renderable = layer.renderable || true
                this.layers[idx].autoCull = true
            }
        })

        const managedLayers = [
            "player",
            "lights",
            "dialog",
        ]
        // Needs to be initialized after map for the layers to be on top of the map
        this.layerManager = new LayerManager(this.game)
        managedLayers.forEach((layer: string) => {
            this.layerManager.add(layer, new Layer(this.game))
        })

        // TODO: Add remaining blocking tile IDs
        this.map.setCollision([15, 16, 17, 18, 33, 34, 35, 36, 51, 52, 53, 54, 55, 65, 57, 58, 73, 74, 75, 76], true, "Environment", false)
        this.map.setCollision([2045], true, "Collision", false)
        this.map.setCollisionBetween(2046, 2056/* TODO: Own Tilesheet */, true, "Tables", false)

        this.layerManager.layer("player").addRef("player", this.game.add.sprite(32, 5 * this.map.tileHeight + 32, "player"))
        this.ref("player", "player").anchor.set(0.5)
        this.game.physics.enable(this.ref("player", "player"))
        this.ref("player", "player").body.collideWorldBounds = true

        this.layerManager.layer("lights").addRef("logo", this.game.add.sprite(32, 32, "logo"))
        this.ref("lights", "logo").anchor.set(0.5)
        this.ref("lights", "logo").width = 64
        this.ref("lights", "logo").height = 64

        this.layerManager.layer("dialog").addRef("dialog", new Dialog(this, 100, 40, "dialog"))
        this.ref("dialog", "dialog").setVisible(false)
    }

    setupInput() {
        const actor = (action: string, trigger: Trigger, event: KeyboardEvent) => {
            trigger.trigger(action, {
                x: this.currentTile.x,
                y: this.currentTile.y,
                keyCode: event.code.toLowerCase(),
            }, this)
        }
        this.game.input.keyboard.onDownCallback = (event: KeyboardEvent) => {
            window.document.getElementById("led4")!.style.animationDuration = "500ms"
            this.triggers.forEach((trigger: Trigger) => {
                actor("keydown", trigger, event)
            })

        }

        this.game.input.keyboard.onUpCallback = (event: KeyboardEvent) => {
            window.document.getElementById("led4")!.style.animationDuration = "0s"
            this.triggers.forEach((trigger: Trigger) => {
                actor("keyup", trigger, event)
            })
        }

        this.game.input.keyboard.onPressCallback = (input: string, event: KeyboardEvent) => {
            console.log("press")
            if (event.code.toLowerCase() === "space") {
                this.simulator.pickPocket()
            }
            this.triggers.forEach((trigger: Trigger) => {
                actor("keypress", trigger, event)
            })
        }

    }

    loadTrigger(json: any) {
        if (json !== null && typeof json.trigger === "object") {
            json.trigger.forEach((triggerData: any) => {
                if (triggerData.x !== undefined && triggerData.y !== undefined) {
                    this.triggers.push(new Trigger(triggerData))
                }
            })
        } else {
            error("Couldn't load trigger data!")
        }
    }

    trigger() {
        let tile = this.currentTile

        this.triggers.forEach((trigger: Trigger) => {
            trigger.trigger("exit", {x: tile.x, y: tile.y}, this)
        })

        this.triggers.forEach((trigger: Trigger) => {
            trigger.trigger("enter", {x: tile.x, y: tile.y}, this)
        })

        this.triggers.forEach((trigger: Trigger) => {
            trigger.trigger("each", {x: tile.x, y: tile.y}, this)
        })
    }

    getCurrentTile() {
        return this.getTileAt(this.ref("player", "player").position.x, this.ref("player", "player").position.y, undefined, true)
    }

    getTileAt(x: number, y: number, layer?: string, nonNull?: boolean) {
        return this.map.getTileWorldXY(x, y, this.map.tileWidth, this.map.tileHeight, layer, nonNull)
    }

    ref(layer: string, key: string) {
        return this.layerManager.layer(layer).ref(key)
    }

    questStuff() {
        log("A quest?")
    }

    gameOver() {
        //console.log("GAME OVER")
        //this.changeState("menu")
    }

    clubPlayer(amount: number) {
        this.energyReserve -= amount
        this.game.camera.shake(0.01, 200)
    }

    stateResize(width: number, height: number) {
        log("Resize 2")
        Object.getOwnPropertyNames(this.layers).forEach((name: string) => {
            this.layers[name].resize(screen.width, screen.height)
            this.game.camera.unfollow()
            this.game.camera.follow(this.ref("player", "player"), Phaser.Camera.FOLLOW_TOPDOWN)
        })
    }

    updateBatteryIcon() {
        let i = Math.floor(this.energyReserve * 5 / 100)
        let css = `battery${i}`
        // log("Battery is", css)
        let dom = window.document.getElementById("battery")
        if (!!dom) {
            dom.className = css
        }
    }

    hasCollision(x: number, y: number) {
        if (x < 0 || y < 0 || x > this.map.width || y > this.map.height) {
            return true
        }
        const coll = this.map.getTile(x, y, "Collision") !== null
        // this.game.debug.rectangle(
        //     new Phaser.Rectangle(
        //         x*this.map.tileWidth,
        //         y*this.map.tileHeight,
        //         20,
        //         20),
        //     coll ? "#ff0000" : "#00ff00")
        return coll
    }

    playSound(key: string, loop: boolean = false) {
        if (this.music !== undefined) {
            this.music.fadeOut(1)
        }
        this.music = this.game.add.audio(key)
        this.music.loop = loop
        this.music.play()
    }

    replaceTile(x: number, y: number, tid: number, layer?: string) {
        const curTile = this.map.getTile(x, y, layer).index
        this.map.replace(curTile, tid, x, y, 1, 1, layer)
    }

    openDoor(x: number, y: number, tid: number, level: number) {
        if (this.unlockedLevel[level]) {
            this.replaceTile(x, y, tid, "Doors")
        }
    }

    unlockLevel(idx: number) {
        this.unlockedLevel[idx] = true
    }

    showDialogAbove(name: string, x: number, y: number, text: string) {
        this.ref("dialog", name).say(text)
        this.ref("dialog", name).aboveTileXY(x, y)
        this.ref("dialog", name).setVisible(true)
    }

    hideDialog(name: string) {
        this.ref("dialog", name).setVisible(false)
    }

    story(key: string) {
        log(key, this.currentTrigger)
        switch (key) {
            case "tutorial0-enter":
                this.showDialogAbove("dialog", this.currentTrigger.x, this.currentTrigger.y, "Welcome to the game!")
                break
            case "tutorial0-exit":
                this.hideDialog("dialog")
                break
            case "tutorial1-enter":
                this.showDialogAbove("dialog", this.currentTrigger.x, this.currentTrigger.y, "Papers on the floor can be very usefull ;)")
                break
            case "tutorial1-exit":
                this.hideDialog("dialog")
                break
            default:
                error(`Unhandled story action ${key} at ${this.currentTrigger.x}, ${this.currentTrigger.y}`)
        }
    }

    getTilesForType(id: number, layer?: string): Phaser.Point[] {
        return this.map.tiles
            .filter((tile: Phaser.Tile) => {
                return tile.index === id && nou(layer) ? true : tile.layer.name === layer
            })
            .map((tile: Phaser.Tile) => new Phaser.Point(tile.x, tile.y))
    }

    getChairTiles(tiles: Phaser.Point[]): Phaser.Point[] {
        return tiles.filter((pos: Phaser.Point) => {
            let tile = this.map.getTile(pos.x, pos.y, "Tables")
            if (tile == null) {
                return false
            }
            // TODO: Set correct ID
            switch (tile.index) {
                case 9999:
                    return true
                default:
                    return false
            }
        })
    }

    getTilesForLevel(level: LEVEL): Phaser.Point[] {
        // TODO: Set correct ID
        switch (level) {
            case LEVEL.PARKINGLOT:
                return this.getTilesForType(9996)
            case LEVEL.MENSA:
                return this.getTilesForType(9997)
            case LEVEL.LIBRARY:
                return this.getTilesForType(9998)
            case LEVEL.PCPOOL:
                return this.getTilesForType(9999)
            default:
                return []
        }
    }

    spawnPlayer(tiles: Phaser.Point[], types: AIType[]) {
        let tile = choose(tiles)
        let type = choose(types)
        let ai = new AI(type, this)
        ai.setTilePosition(tile)
        throw new Error("USE THE SIMULATOR")
    }

    spreadPlayers(level: number) {
        let points = this.getTilesForLevel(level)
        const type = [
            AIType.STANDING,
            AIType.GUARD,
            AIType.WORKING,
            AIType.PROF,
        ]

        // Spawn generic people
        range(0, 10).forEach(() => this.spawnPlayer(points, type))


        if (level === LEVEL.PARKINGLOT) {

        } else if (level === LEVEL.MENSA ||
            level === LEVEL.LIBRARY ||
            level === LEVEL.PCPOOL) {
            let chairs = this.getChairTiles(points)
            range(0, 10).forEach(() => this.spawnPlayer(chairs, [AIType.EATING]))
        }

    }
}
