import {log, State} from "../sgl/sgl"

export class BootState extends State {

    _init = (...additionalParameters: any[]) => {
        log("BOOT: init")
        window.addEventListener("resize", () => {
            this.loader.resize()
        })
        this.loader.resize()
        window.document.getElementById("led1")!.style.fill = "MediumTurquoise"
        window.document.getElementById("led2")!.style.fill = "lime"
        window.document.getElementById("led3")!.style.animationDuration = "1s"
        window.document.getElementById("battery")!.className = "battery4"


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
