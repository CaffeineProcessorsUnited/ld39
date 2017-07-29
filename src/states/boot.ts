import {log, State} from "../sgl/sgl"

export class BootState extends State {

    _init = (...additionalParameters: any[]) => {
        log("BOOT: init")
        window.addEventListener("resize", () => {
            this.loader.resize()
        })
        this.loader.resize()
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
