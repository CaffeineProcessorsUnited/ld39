import {error, Layer, LayerManager, log, State, Dialog} from "../sgl/sgl"
import {Trigger} from "../classes/trigger"
import {AI, AIType} from "../classes/ai"

export class GameState extends State {

    energyReserve: number = 100
    energyLossPerSecond: number = 0.1

    layers: { [layer: string]: Phaser.TilemapLayer } = {}

    map: Phaser.Tilemap
    cursors: Phaser.CursorKeys
    triggers: Array<Trigger> = []
    lastTile: Phaser.Tile
    currentTile: Phaser.Tile
    layerManager: LayerManager
    ai: AI

    _init = (map: string) => {
        // TODO: Select map to load
    }

    _preload = () => {
        this.game.load.image("logo", "assets/logo.png")
        this.game.load.image("player", "assets/Unit/medievalUnit_24.png")
        this.game.load.image("dialog", "assets/dialog/box.png")
        this.game.load.tilemap("tilemap", "assets/MapLib.json", null, Phaser.Tilemap.TILED_JSON)
        this.game.load.image("tilesheet_city", "assets/tilesheet_city.png")
        this.game.load.image("tilesheet_shooter", "assets/tilesheet_shooter.png")
        this.game.load.image("tilesheet_indoor", "assets/tilesheet_indoor.png")
        this.game.load.image("tilesheet_collision", "assets/tilesheet_collision.png")
        this.game.load.json("trigger", "assets/trigger.json")
    }

    _create = () => {
        this.game.physics.startSystem(Phaser.Physics.ARCADE)

        this.setupTilemap()
        this.loadTrigger(this.game.cache.getJSON("trigger"))
        this.setupInput()


        this.cursors = this.game.input.keyboard.createCursorKeys()

        this.game.camera.follow(this.ref("player", "player"))
        this.currentTile = this.map.getTileWorldXY(this.ref("player", "player").position.x, this.ref("player", "player").position.y)
        this.lastTile = this.currentTile

        this.ai = new AI(AIType.GUARD, this)
        this.ai.pickPocket()
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
        this.ai.update()
    }
    _render = () => {
        this.game.debug.body(this.ref("player", "player"))
    }

    setupTilemap() {
        this.map = this.game.add.tilemap("tilemap")
        this.map.addTilesetImage("Collision", "tilesheet_collision")
        this.map.addTilesetImage("Indoor", "tilesheet_indoor")
        this.map.addTilesetImage("City", "tilesheet_city")
        this.map.addTilesetImage("Shooter", "tilesheet_shooter")

        const _layers = [
            "Collision",
            "Ground",
            "Roadmarker",
            "Roadmarker2",
            "Environment",
            "Doors",
            "Carpet",
            "Tables",
            "Shelves",
        ]
        _layers.forEach((layer: string) => {
            const idx = layer.toLowerCase()
            const _layer = this.map.createLayer(layer)
            if (_layer !== undefined) {
                this.layers[idx] = _layer
                this.layers[idx].resizeWorld()
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
            if (event.code.toLowerCase() === "space") {
                let dx = this.ai.sprite.position.x - this.currentTile.worldX
                let dy = this.ai.sprite.position.y - this.currentTile.worldY
                if (dx * dx + dy * dy < 4 * this.map.tileWidth * this.map.tileWidth) {
                    this.ai.pickPocket()
                }
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
        return this.map.getTileWorldXY(this.ref("player", "player").position.x, this.ref("player", "player").position.y)
    }

    ref(layer: string, key: string) {
        return this.layerManager.layer(layer).ref(key)
    }

    questStuff() {
        log("A quest?")
    }

    gameOver() {
        console.log("GAME OVER")
    }

    clubPlayer() {
        this.energyReserve -= 10
    }

}
