import {GameState} from "../states/game";

export class Trigger {
    gs: GameState
    x: number
    y: number
    onEnter?: Function
    onExit?: Function
    onEach?: Function
    onKeyDown: { [index: string]: Function } = {}
    onKeyUp: { [index: string]: Function } = {}
    onKeyPress: { [index: string]: Function } = {}
    active: boolean

    constructor(gs: GameState, data: any) {
        this.gs = gs
        this.x = data.x
        this.y = data.y

        if (data.enter !== undefined && data.enter.length > 0) {
            this.onEnter = this.createMethod(data.enter)
        } else {
            this.onEnter = undefined
        }

        if (data.exit !== undefined && data.exit.length > 0) {
            this.onExit = this.createMethod(data.exit)
        } else {
            this.onExit = undefined
        }

        if (data.each !== undefined && data.each.length > 0) {
            this.onEach = this.createMethod(data.each)
        } else {
            this.onEach = undefined
        }

        if (data.keydown !== undefined && typeof data.keydown === "object") {
            Object.keys(data.keydown).forEach((key: string) => {
                this.onKeyDown[key.toLowerCase()] = this.createMethod(data.keydown[key])
            })
        }

        if (data.keyup !== undefined && typeof data.keyup === "object") {
            Object.keys(data.keyup).forEach((key: string) => {
                this.onKeyUp[key.toLowerCase()] = this.createMethod(data.keyup[key])
            })
        }

        if (data.keypress !== undefined && typeof data.keypress === "object") {
            Object.keys(data.keypress).forEach((key: string) => {
                this.onKeyPress[key.toLowerCase()] = this.createMethod(data.keypress[key])
            })
        }

        this.active = false
    }

    private createMethod(action: string): () => void {
        let s = action.indexOf(":")
        if (s >= 0) {
            let a = action.substr(0, s)
            let d = action.substr(s + 1)
            switch (a) {
                case "story":
                default:
                    return () => {
                        this.gs.story(this, d)
                    }
                case "play":
                    return () => {
                        this.gs.play(this, d)
                    }
                case "stop":
                    return () => {
                        this.gs.stop(this, d)
                    }
            }
        }
        return () => {
            this.gs.story(this, action)
        }
    }

    exit(): boolean {
        this.active = false
        return (this.onExit !== undefined) ? this.onExit() : false
    }

    enter(): boolean {
        this.active = true
        return (this.onEnter !== undefined) ? this.onEnter() : false
    }

    each(): boolean {
        return (this.onEach !== undefined) ? this.onEach() : false
    }

    test(x: number, y: number): boolean {
        return this.x === x && this.y === y
    }

    trigger(action: string, data: any): boolean {
        switch (action) {
            case "enter":
                if (this.test(data.x, data.y) && this.active !== true) {
                    return this.enter()
                }
                break
            case "exit":
                if (!this.test(data.x, data.y) && this.active === true) {
                    return this.exit()
                }
                break
            case "each":
                if (this.test(data.x, data.y) && this.active === true) {
                    return this.each()
                }
                break
            case "keydown":
                if (this.test(data.x, data.y) && this.onKeyDown.hasOwnProperty(data.keyCode)) {
                    return (this.onKeyDown[data.keyCode] !== undefined) ? this.onKeyDown[data.keyCode]() : false
                }
                break
            case "keyup":
                if (this.test(data.x, data.y) && this.onKeyUp.hasOwnProperty(data.keyCode)) {
                    return (this.onKeyUp[data.keyCode] !== undefined) ? this.onKeyUp[data.keyCode]() : false
                }
                break
            case "keypress":
                if (this.test(data.x, data.y) && this.onKeyPress.hasOwnProperty(data.keyCode)) {
                    return (this.onKeyPress[data.keyCode] !== undefined) ? this.onKeyPress[data.keyCode]() : false
                }
                break
            default:
                throw new Error("Invalid trigger action!")
        }
        return false
    }

}
