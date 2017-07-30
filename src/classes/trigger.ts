export class Trigger {
    x: number
    y: number
    onEnter?: Function
    onExit?: Function
    onEach?: Function
    onKeyDown: { [index: string]: Function } = {}
    onKeyUp: { [index: string]: Function } = {}
    onKeyPress: { [index: string]: Function } = {}
    active: boolean

    constructor(data: any) {
        this.x = data.x
        this.y = data.y

        if (data.enter !== undefined && data.enter.length > 0) {
            this.onEnter = () => {
                eval(data.enter)
            }
        } else {
            this.onEnter = undefined
        }

        if (data.exit !== undefined && data.exit.length > 0) {
            this.onExit = () => {
                eval(data.exit)
            }
        } else {
            this.onExit = undefined
        }

        if (data.each !== undefined && data.each.length > 0) {
            this.onEach = () => {
                eval(data.each)
            }
        } else {
            this.onEach = undefined
        }

        if (data.keydown !== undefined && typeof data.keydown === "object") {
            Object.keys(data.keydown).forEach((key: string) => {
                this.onKeyDown[key.toLowerCase()] = () => {
                    eval(data.keydown[key])
                }
            })
        }

        if (data.keyup !== undefined && typeof data.keyup === "object") {
            Object.keys(data.keyup).forEach((key: string) => {
                this.onKeyUp[key.toLowerCase()] = () => {
                    eval(data.keyup[key])
                }
            })
        }

        if (data.keypress !== undefined && typeof data.keypress === "object") {
            Object.keys(data.keypress).forEach((key: string) => {
                this.onKeyPress[key.toLowerCase()] = () => {
                    eval(data.keypress[key])
                }
            })
        }

        this.active = false
    }

    exit(context?: any): boolean {
        this.active = false
        return (this.onExit !== undefined) ? this.onExit.call(context) : false
    }

    enter(context?: any): boolean {
        this.active = true
        return (this.onEnter !== undefined) ? this.onEnter.call(context) : false
    }

    each(context?: any): boolean {
        return (this.onEach !== undefined) ? this.onEach.call(context) : false
    }

    test(x: number, y: number): boolean {
        return this.x === x && this.y === y
    }

    trigger(action: string, data: any, context?: any): boolean {
        let ctx: any = context || {}
        ctx.currentTrigger = this
        switch (action) {
            case "enter":
                if (this.test(data.x, data.y) && this.active !== true) {
                    return this.enter(ctx)
                }
                break
            case "exit":
                if (!this.test(data.x, data.y) && this.active === true) {
                    return this.exit(ctx)
                }
                break
            case "each":
                if (this.test(data.x, data.y) && this.active === true) {
                    return this.each(ctx)
                }
                break
            case "keydown":
                if (this.test(data.x, data.y) && this.onKeyDown.hasOwnProperty(data.keyCode)) {
                    return (this.onKeyDown[data.keyCode] !== undefined) ? this.onKeyDown[data.keyCode].call(ctx) : false
                }
                break
            case "keyup":
                if (this.test(data.x, data.y) && this.onKeyUp.hasOwnProperty(data.keyCode)) {
                    return (this.onKeyUp[data.keyCode] !== undefined) ? this.onKeyUp[data.keyCode].call(ctx) : false
                }
                break
            case "keypress":
                if (this.test(data.x, data.y) && this.onKeyPress.hasOwnProperty(data.keyCode)) {
                    return (this.onKeyPress[data.keyCode] !== undefined) ? this.onKeyPress[data.keyCode].call(ctx) : false
                }
                break
            default:
                throw new Error("Invalid trigger action!")
        }
        return false
    }

}
