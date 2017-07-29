/// <reference path="../../typings/index.d.ts" />
import {State} from "./state"

export class Loader {

    private _bootStateClass = class extends State {

        _preload = () => {
            if (this.loader.validScaling()) {
                this.loader.game.scale.scaleMode = this.loader.scaling
            }
        }

        _create = () => {
        }

    }
    private _bootState: State

    constructor() {
        this._width = 800
        this._height = 600
        this._renderer = Phaser.AUTO
        this._scaling = Phaser.ScaleManager.NO_SCALE
    }

    private _game: Phaser.Game

    get game(): Phaser.Game {
        if (this._game !== undefined) {
            return this._game
        }
        if (!this.validParent()) {
            throw new Error("Invalid id enterd! Make sure the id is set and the element exists.")
        }
        if (!this.validWidth()) {
            throw new Error("Invalid width enterd! Make sure the width is greater than zero.")
        }
        if (!this.validHeight()) {
            throw new Error("Invalid height enterd! Make sure the height is greater than zero.")
        }
        if (!this.validRenderer()) {
            throw new Error("Invalid renderer seleted!")
        }
        console.log("Create new game instace")
        this._game = new Phaser.Game(this._width, this.height, this.renderer, this._parent)
        if (this._game === undefined) {
            throw new Error("Something went terribly wrong! Couldn't initialize game instance.")
        }
        this._bootState = new this._bootStateClass(this)
        return this._game
    }

    private _parent: string

    set parent(parent: string) {
        this._parent = parent
    }

    private _width: number

    set width(width: number) {
        this._width = width
    }

    private _height: number

    set height(height: number) {
        this._height = height
    }

    private _renderer: number

    set renderer(renderer: number) {
        this._renderer = renderer
    }

    private _scaling: number

    set scaling(scaling: number) {
        this._scaling = scaling
    }

    get ready(): boolean {
        return this._game !== undefined
    }

    requireReady() {
        if (!this.ready) {
            throw new Error("Game was not initialized when a function required it to be!")
        }
    }

    // states with key == "boot" will be appended to custom boot state and executed after the internal state
    addStates(states: any) {
        Object.getOwnPropertyNames(states).forEach((key: string) => {
            this.addState(key, states[key] as State)
        })
    }

    addState(key: string, state: State) {
        if (!this.ready) {
            this.game
        }
        if (key === "boot") {
            this._bootState.sub(state)
            state = this._bootState
        }
        this.game.state.add(key, state, false)
    }

    start() {
        if ((typeof this.game.state.states.boot) === "undefined") {
            console.log("Adding boot state")
            this.game.state.add("boot", this._bootState, false)
        }
        this.game.state.start("boot")
    }

    private validParent(): boolean {
        return this._parent !== undefined && this._parent !== "" && document.getElementById(this._parent) !== undefined
    }

    private validWidth(): boolean {
        return this._width !== undefined && this._width > 0
    }

    private validHeight(): boolean {
        return this._height !== undefined && this._height > 0
    }

    private validRenderer(): boolean {
        return this._renderer !== undefined && (
            this._renderer === Phaser.AUTO ||
            this._renderer === Phaser.CANVAS ||
            this._renderer === Phaser.WEBGL
        )
    }

    private validScaling(): boolean {
        return this._scaling !== undefined && (
            this._scaling === Phaser.ScaleManager.EXACT_FIT ||
            this._scaling === Phaser.ScaleManager.NO_SCALE ||
            this._scaling === Phaser.ScaleManager.RESIZE ||
            this._scaling === Phaser.ScaleManager.SHOW_ALL ||
            this._scaling === Phaser.ScaleManager.USER_SCALE
        )
    }

}
