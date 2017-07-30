import {Loader} from "./loader"
import {log} from "./util"

export interface IState {
    game?: Phaser.Game
    init: () => void
    preload: () => void
    create: () => void
    update: () => void
    render: () => void
    stateResize: (width: number, height: number) => void
}

export abstract class State extends Phaser.State implements IState {

    loader: Loader
    protected _init = (...additionalParameters: any[]) => {
    }
    protected _preload = () => {
    }
    protected _create = () => {
    }
    protected _update = () => {
    }
    protected _render = () => {
    }
    protected _resize = (width: number, height: number) => {
    }
    private _substates: State[] = new Array()
    private running: boolean

    constructor(loader: Loader, fadeDuration?: { [index: string]: number }) {
        super()
        this.loader = loader
        this.fadeDuration = fadeDuration || {
            "in": 0,
            "out": 0,
        }
        this.running = false
    }

    _fadeDuration: { [index: string]: number }

    get fadeDuration(): { [index: string]: number } {
        return this._fadeDuration
    }

    set fadeDuration(fadeDuration: { [index: string]: number }) {
        this._fadeDuration = fadeDuration
    }

    init(...additionalParameters: any[]) {
        this._init.apply(this, additionalParameters)
        this._substates.forEach((state: State) => {
            state.init.apply(state, additionalParameters)
        })
    }

    preload() {
        this._preload()
        this._substates.forEach((state: State) => {
            state.preload()
        })
    }

    create() {
        this.fadeIn(() => {
            log("faded in")
            this.running = true
        })
        this._create()
        this._substates.forEach((state: State) => {
            state.create()
        })
    }

    update() {
        if (!this.running) {
            log("not running")
            return
        }
        this._update()
        this._substates.forEach((state: State) => {
            state.update()
        })
    }

    render() {
        this._render()
        this._substates.forEach((state: State) => {
            state.render()
        })
    }

    stateResize(width: number, height: number) {
        this._resize(width, height)
        this._substates.forEach((state: State) => {
            state.stateResize(width, height)
        })
    }

    sub(substate: State) {
        this._substates.push(substate)
    }

    fadeIn(callback: Function) {
        if (!!this.fadeDuration.in && this.fadeDuration.in > 0) {
            this.loader.game.camera.onFadeComplete.addOnce(() => {
                this.loader.game.camera.resetFX()
                this.loader.game.camera.onFlashComplete.addOnce(() => {
                    this.loader.game.camera.resetFX()
                    callback()
                }, this)
                this.loader.game.camera.flash(0x000000, this.fadeDuration.in)
            }, this)
            this.loader.game.camera.fade(0x000000, 1)
        } else {
            callback()
        }
    }

    fadeOut(callback: Function) {
        if (!!this.fadeDuration.out && this.fadeDuration.out > 0) {
            this.loader.game.camera.resetFX()
            this.loader.game.camera.onFadeComplete.addOnce(() => {
                this.loader.game.camera.resetFX()
                callback()
            }, this)
            this.loader.game.camera.fade(0x000000, this.fadeDuration.out)
        } else {
            log("fadeOut")
            callback()
        }
    }

    /**
     Additional parameters will be passed to init function of the state
     **/
    changeState(name: string, ...additionalParameters: any[]) {
        log("changing state to " + name)
        this.fadeOut(() => {
            let args = [
                name,
                true,
                false,
            ]
            if (!!additionalParameters) {
                additionalParameters.forEach((param) => {
                    args.push(param)
                })
            }
            this.loader.game.state.start.apply(this.loader.game.state, args)
        })
    }
}
