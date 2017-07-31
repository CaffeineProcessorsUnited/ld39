import {Dialog, error, Layer, LayerManager, log, State} from "../sgl/sgl"
import {Trigger} from "../classes/trigger"
import {AIState, AIType} from "../classes/ai"
import {choose, nou, range} from "../sgl/util"
import {Simulator} from "../classes/simulator"
import {Pathfinder} from "../classes/pathfinder"

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
    walking: boolean = false
    sprinting: boolean = false
    walkingSound: Phaser.Sound
    hasKeys: boolean = false

    _init = (map: string) => {
        // TODO: Select map to load
    }
    _preload = () => {
        this.game.load.image("logo", "assets/logo.png")
        //this.game.load.image("player", "assets/Unit/medievalUnit_24.png")
        this.game.load.image("dialog", "assets/dialog.png")
        this.game.load.tilemap("tilemap", "assets/MapLib.json", null, Phaser.Tilemap.TILED_JSON)
        this.game.load.image("tilesheet_city", "assets/tilesheet_city.png")
        this.game.load.image("tilesheet_shooter", "assets/tilesheet_shooter.png")
        this.game.load.image("tilesheet_indoor", "assets/tilesheet_indoor.png")
        this.game.load.image("tilesheet_collision", "assets/tilesheet_collision.png")
        this.game.load.image("tilesheet_custom", "assets/tilesheet_custom.png")
        this.game.load.image("tilesheet_level", "assets/tilesheet_level.png")
        this.game.load.image("tilesheet_road", "assets/tilesheet_road.png")
        this.game.load.json("trigger", "assets/trigger.json")
        this.game.load.audio("dark_mix", "assets/audio/dark_mix.ogg")
        range(0, 4).forEach((i: number) => {
            this.loader.game.load.audio(`car${i}`, `assets/audio/car${i}.ogg`)
        })
        range(0, 4).forEach((i: number) => {
            this.loader.game.load.audio(`snoring${i}`, `assets/audio/snoring${i}.ogg`)
        })
        range(0, 6).forEach((i: number) => {
            this.loader.game.load.audio(`walk${i}`, `assets/audio/walk${i}.ogg`)
        })
        range(0, 2).forEach((i: number) => {
            this.loader.game.load.audio(`run${i}`, `assets/audio/run${i}.ogg`)
        })
        range(0, 8).forEach((i: number) => {
            this.loader.game.load.audio(`piano${i}`, `assets/audio/piano${i}.ogg`)
        })
        range(0, 2).forEach((i: number) => {
            this.loader.game.load.audio(`club${i}`, `assets/audio/club${i}.ogg`)
        })
        this.game.load.spritesheet("player", "assets/human/adventurer_tilesheet.png", 80, 110)
        this.game.load.spritesheet("npc0", "assets/human/adventurer_tilesheet.png", 80, 110)
        this.game.load.spritesheet("npc1", "assets/human/female_tilesheet.png", 80, 110)
        this.game.load.spritesheet("npc2", "assets/human/soldier_tilesheet.png", 80, 110)
        this.game.load.spritesheet("npc3", "assets/human/zombie_tilesheet.png", 80, 110)
        range(0, 3).forEach((i: number) => {
            this.loader.game.load.spritesheet(`car${i}`, `assets/car/car${i}.png`, 144, 144)
        })
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
        //let t = this.simulator.spawn(AIType.GUARD, AIState.IDLE, new Phaser.Point(0, 0))

        this.simulator.spawn(AIType.VEHICLE, AIState.PARKING)
        //this.simulator.spawn(AIType.VEHICLE, AIState.PARKING)
        //this.simulator.spawn(AIType.VEHICLE, AIState.PARKING)
        //this.simulator.spawn(AIType.VEHICLE, AIState.PARKING)
        //this.simulator.spawn(AIType.VEHICLE, AIState.PARKING)
        //this.simulator.spawn(AIType.VEHICLE, AIState.PARKING)
        // this.simulator.spawn(AIType.VEHICLE, AIState.DRIVING)
        // this.simulator.spawn(AIType.VEHICLE, AIState.DRIVING)
        // this.simulator.spawn(AIType.VEHICLE, AIState.DRIVING)


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
        if (!this.sprinting) {
            this.game.physics.arcade.collide(this.ref("player", "player"), this.layers["collision"])
        }
        this.energyReserve -= this.energyLossPerSecond * this.game.time.elapsedMS / 1000.

        // movement
        let damping = 100
        let max = 200
        let rate = 80
        if (this.sprinting) {
            max = 1000
            rate = 900
        }

        //this.ref("player", "player").rotation = this.ref("player", "player").body.angle

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

        let walking = false
        let animationPLayed = false

        if (this.cursors.up.isDown) {
            this.ref("player", "player").body.velocity.y -= rate
            this.ref("player", "player").animations.play("up")
            walking = true
            animationPLayed = true
        } else if (this.cursors.down.isDown) {
            this.ref("player", "player").body.velocity.y += rate
            this.ref("player", "player").animations.play("down")
            walking = true
            animationPLayed = true
        } else {
            if (this.ref("player", "player").body.velocity.y >= damping) {
                this.ref("player", "player").body.velocity.y -= damping
            } else if (this.ref("player", "player").body.velocity.y <= damping * -1) {
                this.ref("player", "player").body.velocity.y += damping
            } else {
                this.ref("player", "player").body.velocity.y = 0
            }
        }

        if (this.cursors.left.isDown) {
            this.ref("player", "player").body.velocity.x -= rate
            if (!animationPLayed) {
                this.ref("player", "player").animations.play("left")
            }
            walking = true
        } else if (this.cursors.right.isDown) {
            this.ref("player", "player").body.velocity.x += rate
            if (!animationPLayed) {
                this.ref("player", "player").animations.play("right")
            }
            walking = true
        } else {
            if (this.ref("player", "player").body.velocity.x >= damping) {
                this.ref("player", "player").body.velocity.x -= damping
            } else if (this.ref("player", "player").body.velocity.x <= damping * -1) {
                this.ref("player", "player").body.velocity.x += damping
            } else {
                this.ref("player", "player").body.velocity.x = 0
            }
        }

        if (walking) {
            if (!this.walking) {
                // started walking
                this.walkSound(true)
            }
        } else {
            if (this.walking) {
                // stopped walking
                this.walkSound(false)
            }
            this.ref("player", "player").animations.stop()
            // this.ref("player", "player").frame = 4
        }
        this.walking = walking

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
            this.gameOver()

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
        this.map.addTilesetImage("Level", "tilesheet_level")
        this.map.addTilesetImage("Road", "tilesheet_road")

        const _layers = [
            {
                "name": "Collision",
                "renderable": false,
            },
            {
                "name": "Level",
                "renderable": false,
            },
            {
                "name": "Road",
                "renderable": false,
            },
            {
                "name": "Ground",
                "renderable": false,
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
                this.layers[idx].visible = layer.visible || true
                this.layers[idx].autoCull = true
            }
        })

        const managedLayers = [
            "npc",
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

        this.layerManager.layer("player").addRef("player", this.game.add.sprite(0 * this.map.tileWidth + 32, 5 * this.map.tileHeight + 32, "player"))
        this.ref("player", "player").scale.set(0.5)
        this.ref("player", "player").anchor.set(0.5)
        this.addAnimations(this.ref("player", "player"))
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
            })
        }
        this.game.input.keyboard.onDownCallback = (event: KeyboardEvent) => {
            window.document.getElementById("led4")!.style.animationDuration = "500ms"
            if (event.shiftKey) {
                if (!this.sprinting) {
                    this.sprinting = true
                    this.updateWalkingSound()
                }
            }
            this.triggers.forEach((trigger: Trigger) => {
                actor("keydown", trigger, event)
            })

        }

        this.game.input.keyboard.onUpCallback = (event: KeyboardEvent) => {
            window.document.getElementById("led4")!.style.animationDuration = "0s"
            if (!event.shiftKey) {
                if (this.sprinting) {
                    this.sprinting = false
                    this.updateWalkingSound()
                }
            }
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
                    this.triggers.push(new Trigger(this, triggerData))
                }
            })
        } else {
            error("Couldn't load trigger data!")
        }
    }

    trigger() {
        let tile = this.currentTile

        this.triggers.forEach((trigger: Trigger) => {
            trigger.trigger("exit", {x: tile.x, y: tile.y})
        })

        this.triggers.forEach((trigger: Trigger) => {
            trigger.trigger("enter", {x: tile.x, y: tile.y})
        })

        this.triggers.forEach((trigger: Trigger) => {
            trigger.trigger("each", {x: tile.x, y: tile.y})
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
        this.playSound("club", `club${choose([0, 1])}`)
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

    hasCollision(x: number, y: number, layer: string = "Collision") {
        if (x < 0 || y < 0 || x > this.map.width || y > this.map.height) {
            return true
        }
        const coll = this.map.getTile(x, y, layer) !== null
        // this.game.debug.rectangle(
        //     new Phaser.Rectangle(
        //         x*this.map.tileWidth,
        //         y*this.map.tileHeight,
        //         20,
        //         20),
        //     coll ? "#ff00ff" : "#ffff00")
        return coll
    }

    playSound(name: string, key: string, loop: boolean = false) {
        if (this.music !== undefined) {
            this.music.fadeOut(1)
        }
        this.music = this.game.add.audio(key)
        this.music.loop = loop
        this.music.play()
    }

    stopSound(key: string, duration: number = 1000) {
        if (this.music !== undefined) {
            this.music.fadeOut(duration)
        }
    }

    replaceTile(x: number, y: number, tid: number, layer?: string) {
        this.map.putTile(tid, x, y, layer)
    }

    openDoor(x: number, y: number, success: number, level: number) {
        if (this.unlockedLevel[level]) {
            this.replaceTile(x, y, success, "Doors")
            this.replaceTile(x, y, -1, "Collision")
        }
    }

    destroyWindow(x: number, y: number, success: number) {
        console.log("FUUUUUUU")
        this.replaceTile(x, y, success, "Environment")
    }

    unlockLevel(idx: number) {
        if (!this.unlockedLevel[idx]) {
            this.spreadPlayers(idx)
        }
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

    story(t: Trigger, key: string) {
        switch (key) {
            case "hide-dialog":
                this.hideDialog("dialog")
                break
            case "tutorial0-enter":
                this.showDialogAbove("dialog", t.x, t.y, "Welcome to the game!")
                break
            case "tutorial1-enter":
                this.showDialogAbove("dialog", t.x, t.y, "Papers on the floor can be very usefull ;)")
                break
            case "message-under-construction-enter":
                this.showDialogAbove("dialog", t.x, t.y, "Under construction")
                break
            case "destroy-window-1":
                this.destroyWindow(37, 14, 2136)
                break
            case "destroy-window-2":
                this.destroyWindow(37, 16, 2148)
                break
            case "destroy-window-3":
                this.destroyWindow(45, 19, 1375)
                break
            case "destroy-window-4":
                this.destroyWindow(47, 19, 1340)
                break
            case "opendoor-mensa-upper":
                this.openDoor(40, 19, 1280, LEVEL.MENSA)
                this.openDoor(41, 19, 1279, LEVEL.MENSA)
                this.showDialogAbove("dialog", t.x, t.y, "HODOR")
                break
            case "opendoor-mensa-lower":
                this.openDoor(51, 27, 1242, LEVEL.MENSA)
                this.openDoor(51, 28, 1243, LEVEL.MENSA)
                this.showDialogAbove("dialog", t.x, t.y, "HODOR")
                break
            case "opendoor-mensa-inner":
                this.openDoor(65, 9, 1242, LEVEL.MENSA)
                this.openDoor(65, 10, 1243, LEVEL.MENSA)
                this.showDialogAbove("dialog", t.x, t.y, "HODOR")
                break
            case "opendoor-mensa-exit":
                this.openDoor(79, 36, 1242, LEVEL.MENSA)
                this.openDoor(79, 37, 1243, LEVEL.MENSA)
                this.showDialogAbove("dialog", t.x, t.y, "HODOR")
                break
            case "opendoor-library-upper":
                this.openDoor(92, 39, 1280, LEVEL.LIBRARY)
                this.openDoor(93, 39, 1279, LEVEL.LIBRARY)
                this.showDialogAbove("dialog", t.x, t.y, "HODOR")
                break
            case "opendoor-library-top":
                this.openDoor(111, 11, 1280, LEVEL.LIBRARY)
                this.openDoor(112, 11, 1279, LEVEL.LIBRARY)
                this.showDialogAbove("dialog", t.x, t.y, "HODOR")
                break
            case "opendoor-library-lower":
                this.openDoor(90, 41, 1242, LEVEL.LIBRARY)
                this.openDoor(90, 42, 1243, LEVEL.LIBRARY)
                this.showDialogAbove("dialog", t.x, t.y, "HODOR")
                break
            case "teleport":
                this.ref("player", "player").position.x = 79 * this.map.tileWidth
                this.ref("player", "player").position.y = 37 * this.map.tileHeight
                break
            case "message-leaves-enter":
                this.showDialogAbove("dialog", t.x, t.y, "Leaves blowing in the wind")
                break
            case "message-mensa-banner-enter":
                this.showDialogAbove("dialog", t.x, t.y, "Only today: 1L beer only 4.20€")
                break
            case "message-garden-enter":
                if (!this.hasKeys) {
                    if (Math.random() < 0.1) {
                        this.hasKeys = true
                        this.showDialogAbove("dialog", t.x, t.y, "I found some keys")
                    } else {
                        this.showDialogAbove("dialog", t.x, t.y, "Just some greens growing here")
                    }
                } else {
                    this.showDialogAbove("dialog", t.x, t.y, "Just some greens growing here")
                }
                break
            case "message-eismann-enter":
                if (!this.hasKeys) {
                    this.showDialogAbove("dialog", t.x, t.y, "I lost my keys. Can you find them?")
                } else {
                    this.showDialogAbove("dialog", t.x, t.y, "Thank you for finding them! Enjoy your dinner.")

                    this.unlockLevel(LEVEL.MENSA)
                }
                break
            case "message-eismann-library-enter":
                this.showDialogAbove("dialog", t.x, t.y, "How are exams going?")
                break
            case "message-toilet-enter":
                this.showDialogAbove("dialog", t.x, t.y, "It's so beautiful in here")
                break
            case "message-exam-enter":
                this.showDialogAbove("dialog", t.x, t.y, "Fib(0)=1;Fib(1)=1;Fib(n)=Fib(n-1)+Fib(n-2)\n\nWhat does that mean?\nI should go and learn...")
                this.unlockLevel(LEVEL.LIBRARY)
                break
            default:
                error(`Unhandled story action ${key} at ${t.x}, ${t.y}`)
        }
    }

    play(t: Trigger, key: string) {
        switch (key) {
            case "piano-low":
                this.playSound("piano", `piano${choose([4, 5, 6, 7])}`, true)
                break
            case "piano-high":
                this.playSound("piano", `piano${choose([0, 1, 2, 3])}`, true)
                break
            default:
                error(`Unhandled story action ${key} at ${t.x}, ${t.y}`)
        }
    }

    stop(t: Trigger, key: string) {
        switch (key) {
            case "piano-low":
            case "piano-high":
                this.stopSound("piano")
                break
            default:
                error(`Unhandled story action ${key} at ${t.x}, ${t.y}`)
        }
    }

    getTilesForType(id: number, layer: string): Phaser.Point[] {
        const layerID = this.map.getLayer(layer)
        const _layer = this.map.layers[layerID]

        let data: Phaser.Point[] = []
        for (let y of range(0, this.map.height)) {
            for (let x of range(0, this.map.width)) {
                if (_layer.data[y][x].index === id) {
                    data.push(new Phaser.Point(x, y))
                }
            }
        }
        return data
    }

    getChairTiles(tiles: Phaser.Point[]): Phaser.Point[] {
        return tiles.filter((pos: Phaser.Point) => {
            let tile = this.map.getTile(pos.x, pos.y, "Tables")
            if (tile == null) {
                return false
            }
            // TODO: Set correct ID
            switch (tile.index) {
                case 1630:
                case 1631:
                case 1632:
                case 1655:
                case 1681:
                case 1684:
                case 1707:
                case 1708:
                case 1710:
                case 1717:
                case 1718:
                case 1735:
                case 1763:
                case 1764:
                case 1766:
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
                return this.getTilesForType(2148, "Level")
            case LEVEL.MENSA:
                return this.getTilesForType(2149, "Level")
            case LEVEL.LIBRARY:
                return this.getTilesForType(2150, "Level")
            case LEVEL.PCPOOL:
                return this.getTilesForType(9999, "Level")
            default:
                return []
        }
    }

    spawnPlayer(tiles: Phaser.Point[], types: AIType[], state: AIState) {
        let tile = choose(tiles)
        let type = choose(types)
        let pos = Pathfinder.tile2pos(this, tile)

        if (type === AIType.STANDING) {
            this.simulator.spawn(type, state, tile.clone(), tile.clone())
        } else {
            let npc = this.simulator.spawn(type, state, undefined, tile.clone())
            if (state === AIState.SITTING) {
                npc.sitDown(Math.floor(pos.x), Math.floor(pos.y))
            }
        }
    }

    spreadPlayers(level: number) {
        let points = this.getTilesForLevel(level)
        if (points.length > 0) {
            const type = [
                // AIType.GUARD,
                // AIType.PROF,
                AIType.EATING,
            ]

            // Spawn generic people
            range(0, 10).forEach((id) => {
                window.setTimeout(() => {
                    this.spawnPlayer(points, [AIType.STANDING], AIState.IDLE)
                }, id * 1000)
            })

            range(0, 20).forEach((id) => {
                window.setTimeout(() => {
                    this.spawnPlayer(points, type, AIState.IDLE)
                }, id * 5000)
            })


            if (level === LEVEL.PARKINGLOT) {

            } else if (level === LEVEL.MENSA ||
                level === LEVEL.LIBRARY ||
                level === LEVEL.PCPOOL) {
                let chairs = this.getChairTiles(points)
                //console.log("++*+", chairs)
                range(0, 20).forEach(() => this.spawnPlayer(chairs, [AIType.EATING], AIState.SITTING))
            }
        }
    }

    pickUp(device: number) {
        this.energyReserve += device
    }

    updateWalkingSound() {
        let playing = false
        if (!nou(this.walkingSound)) {
            playing = this.walkingSound.isPlaying
            this.walkingSound.stop()
        }
        this.walkingSound = this.game.add.audio(`${this.sprinting ? "run" : "walk"}${choose(range(0, this.sprinting ? 2 : 6))}`)
        this.walkingSound.loop = true
        if (playing) {
            this.walkingSound.play()
        }
    }

    walkSound(enable: boolean) {
        if (enable) {
            if (nou(this.walkingSound)) {
                this.updateWalkingSound()
            }
            this.walkingSound.play()
        } else {
            if (!nou(this.walkingSound)) {
                this.walkingSound.stop()
            }
        }
    }

    addAnimations(sprite: Phaser.Sprite, isCar: boolean = false) {
        if (isCar) {
            sprite.animations.add("left", [3])
            sprite.animations.add("right", [1])
            sprite.animations.add("up", [0])
            sprite.animations.add("down", [2])
        } else {
            sprite.animations.add("left", [24, 25, 26, 25], 10, true)
            sprite.animations.add("right", [0, 10, 9, 10], 10, true)
            sprite.animations.add("up", [22, 5, 22, 6], 10, true)
            sprite.animations.add("down", [0, 17], 8, true)
        }
        log("ANIMATION", sprite.animations.isLoaded)
    }
}
