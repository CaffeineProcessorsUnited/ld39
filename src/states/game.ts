import {error, Layer, LayerManager, log, State} from "../sgl/sgl"
import {Trigger} from "../classes/trigger"

export class GameState extends State {

    map: Phaser.Tilemap
    cursors: Phaser.CursorKeys
    score: number
    gravityFactor: number = 100
    triggers: Array<Trigger> = []
    layerGround: Phaser.TilemapLayer
    layerEnvironment: Phaser.TilemapLayer
    layerBuildings: Phaser.TilemapLayer
    layerBuildings2: Phaser.TilemapLayer
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
        this.map = this.game.add.tilemap("tilemap")
        this.map.addTilesetImage("Medieval", "tilesheet")

        this.layerGround = this.map.createLayer("Ground")
        this.layerGround.resizeWorld()
        this.layerEnvironment = this.map.createLayer("Environment")
        this.layerEnvironment.resizeWorld()
        this.layerBuildings = this.map.createLayer("Buildings")
        this.layerBuildings.resizeWorld()
        this.layerBuildings2 = this.map.createLayer("Buildings2")
        this.layerBuildings2.resizeWorld()

        // Needs to be initialized after map for the layers to be on top of the map
        this.layerManager = new LayerManager(this.game)
        this.layerManager.add("player", new Layer(this.game))
        this.layerManager.add("lights", new Layer(this.game))
        this.layerManager.add("dialog", new Layer(this.game))

        // TODO: Add remaining blocking tile IDs
        this.map.setCollision([15, 16, 17, 18, 33, 34, 35, 36, 51, 52, 53, 54, 55, 65, 57, 58, 73, 74, 75, 76], true, "Environment", false)

        this.loadTrigger(this.game.cache.getJSON("trigger"))

        // this.map.setCollision([2,3,4,6,7,102,103,104,106,107,203,204,205], true, this.layerEnvironment)
        // let layerBuildings = this.map.createLayer("Buildings")
        // layerBuildings.resizeWorld()
        // let layerBuildings2 = this.map.createLayer("Buildings2")
        // layerBuildings2.resizeWorld()

        // let logo = this.game.add.sprite(this.game.world.width - 16 - 32, 16, "logo")
        // logo.anchor.setTo(0.5, 0.5)
        // logo.width = 32
        // logo.height = 32

        this.game.input.keyboard.onDownCallback = (event: KeyboardEvent) => {
            this.triggers.forEach((trigger: Trigger) => {
                trigger.trigger("keydown", {
                    x: this.currentTile.x,
                    y: this.currentTile.y,
                    keyCode: event.code.toLowerCase(),
                }, this)
            })
        }

        this.game.input.keyboard.onUpCallback = (event: KeyboardEvent) => {
            this.triggers.forEach((trigger: Trigger) => {
                trigger.trigger("keyup", {
                    x: this.currentTile.x,
                    y: this.currentTile.y,
                    keyCode: event.code.toLowerCase(),
                }, this)
            })
        }

        this.game.input.keyboard.onPressCallback = (input: string, event: KeyboardEvent) => {
            this.triggers.forEach((trigger: Trigger) => {
                trigger.trigger("keypress", {
                    x: this.currentTile.x,
                    y: this.currentTile.y,
                    keyCode: event.code.toLowerCase(),
                }, this)
            })
        }

        this.layerManager.layer("player").addRef("player", this.game.add.sprite(32, 32, "player"))
        this.ref("player", "player").anchor.set(0.5)
        this.game.physics.enable(this.ref("player", "player"))
        this.ref("player", "player").body.collideWorldBounds = true

        this.layerManager.layer("lights").addRef("logo", this.game.add.sprite(32, 32, "logo"))
        this.ref("lights", "logo").anchor.set(0.5)
        this.ref("lights", "logo").width = 64
        this.ref("lights", "logo").height = 64

        this.cursors = this.game.input.keyboard.createCursorKeys()

        this.game.camera.follow(this.ref("player", "player"))
        this.currentTile = this.map.getTileWorldXY(this.ref("player", "player").position.x, this.ref("player", "player").position.y)
        this.lastTile = this.currentTile
    }
    _update = () => {
        this.currentTile = this.getCurrentTile()
        this.game.physics.arcade.collide(this.ref("player", "player"), this.layerEnvironment)

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

    collectStar(player: Phaser.Sprite, star: Phaser.Sprite): void {
        log("star")
        star.kill()
        this.score += 10
    }

    ref(layer: string, key: string) {
        return this.layerManager.layer(layer).ref(key)
    }

    questStuff() {
        log("A quest?")
    }

}
