import {error, Layer, LayerManager, log, State, Dialog, minmax} from "../sgl/sgl"
import {Trigger} from "../classes/trigger"
import {AI, AIType} from "../classes/ai"
import {AStar} from "../classes/astar"

export class GameState extends State {

    _energyReserve: number = 100
    energyLossPerSecond: number = 5

    layers: { [layer: string]: Phaser.TilemapLayer } = {}

    zoom: number = 1

    map: Phaser.Tilemap
    cursors: Phaser.CursorKeys
    triggers: Array<Trigger> = []
    lastTile: Phaser.Tile
    currentTile: Phaser.Tile
    layerManager: LayerManager
    ai: AI
    music: Phaser.Sound
    unlockedLevel: boolean[] = [false, false, false]

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

        this.ai = new AI(AIType.GUARD, this)
        this.ai.pickPocket()

        setTimeout(() => {
            this.ai.sitDown(125, 125)
        }, 5000)

        window.document.getElementById("led3")!.style.animationDuration = "4s"
        this.game.forceSingleUpdate = true
    }

    _update = () => {
        this.currentTile = this.getCurrentTile()
        this.ref("dialog", "dialog").above(this.ref("player", "player").position.x, this.ref("player", "player").position.y)
        this.game.physics.arcade.collide(this.ref("player", "player"), this.layers["ground"])
        this.game.physics.arcade.collide(this.ref("player", "player"), this.layers["collision"])
        this.energyReserve -= this.energyLossPerSecond * this.game.time.elapsedMS / 1000.
        if (this.energyReserve < 0) {
            this.gameOver()
        }


        this.ref("player", "player").body.velocity.x = 0
        this.ref("player", "player").body.velocity.y = 0

        if (this.cursors.left.isDown) {
            this.ref("player", "player").body.velocity.x = -200
            // this.ref("player", "player").animations.play("left")
        } else if (this.cursors.right.isDown) {
            this.ref("player", "player").body.velocity.x = 200
            // this.ref("player", "player").animations.play("right")
        }
        if (this.cursors.up.isDown) {
            this.ref("player", "player").body.velocity.y = -200
            // this.ref("player", "player").animations.play("up")
        } else if (this.cursors.down.isDown) {
            this.ref("player", "player").body.velocity.y = 200
            // this.ref("player", "player").animations.play("down")
        } else {
            // this.ref("player", "player").animations.stop()
            // this.ref("player", "player").frame = 4
        }

        this.trigger()
        this.lastTile = this.currentTile
        this.ai.onPlayerMove(this.ref("player", "player").position)
        this.ai.update()
        let tile = this.map.getTile(this.lastTile.x, this.lastTile.y)
        //this.game.debug.text("CurrentTile: x:" + this.lastTile.x + ", y:" + this.lastTile.y + ", id:" + tile.index + ", layer:" + tile.layer.name, 30, 115)
        //this.game.debug.text("Energy remaining: " + this.energyReserve, 30, 135)


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
    }

    _render = () => {
        //this.game.debug.body(this.ref("player", "player"))
        //this.game.debug.cameraInfo(this.game.camera, 32, 32)
    }

    setupTilemap() {
        this.map = this.game.add.tilemap("tilemap")
        this.map.addTilesetImage("Collision", "tilesheet_collision")
        this.map.addTilesetImage("Indoor", "tilesheet_indoor")
        this.map.addTilesetImage("City", "tilesheet_city")
        this.map.addTilesetImage("Shooter", "tilesheet_shooter")
        this.map.addTilesetImage("Custom", "tilesheet_custom")

        const _layers = [
            "Collision",
            "Ground",
            "Glass",
            "Roadmarker",
            "Roadmarker2",
            "Environment",
            "Carpet",
            "Doors",
            "Tables",
            "Shelves",
            "Ontop",
        ]
        _layers.forEach((layer: string) => {
            const idx = layer.toLowerCase()
            const _layer = this.map.createLayer(layer)
            if (_layer !== undefined) {
                this.layers[idx] = _layer
                this.layers[idx].resizeWorld()
                this.layers[idx].autoCull = false
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

        this.layerManager.layer("player").addRef("player", this.game.add.sprite(32, 32, "player"))
        this.ref("player", "player").anchor.set(0.5)
        this.game.physics.enable(this.ref("player", "player"))
        this.ref("player", "player").body.collideWorldBounds = true

        this.layerManager.layer("lights").addRef("logo", this.game.add.sprite(32, 32, "logo"))
        this.ref("lights", "logo").anchor.set(0.5)
        this.ref("lights", "logo").width = 64
        this.ref("lights", "logo").height = 64

        this.layerManager.layer("dialog").addRef("dialog", new Dialog(this, 100, 40, "dialog"))
        this.ref("dialog", "dialog").x = 100
        this.ref("dialog", "dialog").y = 100
        this.ref("dialog", "dialog").say("Hello")
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
            this.triggers.forEach((trigger: Trigger) => {
                actor("keydown", trigger, event)
            })
        }

        this.game.input.keyboard.onUpCallback = (event: KeyboardEvent) => {
            this.triggers.forEach((trigger: Trigger) => {
                actor("keyup", trigger, event)
            })
        }

        this.game.input.keyboard.onPressCallback = (input: string, event: KeyboardEvent) => {
            console.log("press")
            if (event.code.toLowerCase() === "space") {
                let dx = this.ai.sprite.position.x - this.currentTile.worldX
                let dy = this.ai.sprite.position.y - this.currentTile.worldY
                //if (dx * dx + dy * dy < 4 * this.map.tileWidth * this.map.tileWidth) {
                this.ai.pickPocket()
                //}
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
            trigger.trigger("position", {x: tile.x, y: tile.y}, this)
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
    }

    get energyReserve() {
        return this._energyReserve
    }

    set energyReserve(energyReserve: number) {
        this._energyReserve = energyReserve
        this.updateBatteryIcon()
    }

    clubPlayer() {
        this.energyReserve -= 10
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
        return this.map.getTile(x, y, "Collision") !== null
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
}
