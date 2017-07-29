import {error, Layer, LayerManager, log, State} from "../sgl/sgl"
import {Trigger} from "../classes/trigger"

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

    _init = (map: string) => {
        // TODO: Select map to load
    }

    _preload = () => {
        this.game.load.image("logo", "assets/logo.png")
        this.game.load.image("sky", "assets/sky.png")
        this.game.load.image("ground", "assets/platform.png")
        this.game.load.image("star", "assets/star.png")
        this.game.load.image("player", "assets/Unit/medievalUnit_24.png")
        // this.game.load.spritesheet("dude", "assets/dude.png", 32, 48)
        this.game.load.tilemap("tilemap", "assets/Map02.json", null, Phaser.Tilemap.TILED_JSON)
        this.game.load.image("tilesheet", "assets/medieval_tilesheet.png")
        this.game.load.json("trigger", "assets/trigger.json")
    }

    _create = () => {
        this.game.physics.startSystem(Phaser.Physics.ARCADE)
        // this.game.add.sprite(0, 0, "sky")

        this.setupTilemap()
        this.loadTrigger(this.game.cache.getJSON("trigger"))
        this.setupInput()


        this.cursors = this.game.input.keyboard.createCursorKeys()

        this.game.camera.follow(this.ref("player", "player"))
        this.currentTile = this.map.getTileWorldXY(this.ref("player", "player").position.x, this.ref("player", "player").position.y)
        this.lastTile = this.currentTile
    }
    _update = () => {
        this.currentTile = this.getCurrentTile()
        this.game.physics.arcade.collide(this.ref("player", "player"), this.layers["ground"])
        this.energyReserve -= this.energyLossPerSecond * this.game.time.elapsedMS / 1000.
        console.log(this.energyReserve)
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
    }
    _render = () => {
        this.game.debug.body(this.ref("player", "player"))
    }

    setupTilemap() {
        this.map = this.game.add.tilemap("tilemap")
        this.map.addTilesetImage("Medieval", "tilesheet")

        const _layers = [
            "Ground",
            "Walls",
            "Doors",
            "Carpet",
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

        this.layerManager.layer("player").addRef("player", this.game.add.sprite(32, 32, "player"))
        this.ref("player", "player").anchor.set(0.5)
        this.game.physics.enable(this.ref("player", "player"))
        this.ref("player", "player").body.collideWorldBounds = true

        this.layerManager.layer("lights").addRef("logo", this.game.add.sprite(32, 32, "logo"))
        this.ref("lights", "logo").anchor.set(0.5)
        this.ref("lights", "logo").width = 64
        this.ref("lights", "logo").height = 64
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

}
