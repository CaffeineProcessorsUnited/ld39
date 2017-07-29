import {log, State} from "../sgl/sgl"

export class BootState extends State {

    _init = (...additionalParameters: any[]) => {
        log("BOOT: init")
        let screen = window.document.getElementById("screen")!.getBoundingClientRect()
        let gamediv = window.document.getElementById("game")!
        gamediv.style.position = "absolute"
        gamediv.style.left = screen.left + "px"
        gamediv.style.top = screen.top + "px"
        this.loader.game.scale.setGameSize(screen.width, screen.height)

        window.addEventListener("resize", () => {
            let screen = window.document.getElementById("screen")!.getBoundingClientRect()
            let gamediv = window.document.getElementById("game")!
            gamediv.style.position = "absolute"
            gamediv.style.left = screen.left + "px"
            gamediv.style.top = screen.top + "px"
            this.loader.game.scale.setGameSize(screen.width, screen.height)})
    }

    _preload = () => {
        log("BOOT: preload")
    }

    _create = () => {
        log("BOOT: create")
        this.changeState("menu")
    }

    _update = () => {
        log("BOOT: update")
    }

    _render = () => {
        log("BOOT: render")
    }

}
