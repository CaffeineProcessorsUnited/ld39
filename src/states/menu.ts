import {log, State} from "../sgl/sgl"

export class MenuState extends State {

    _init = (...additionalParameters: any[]) => {
        log("BOOT: init")
    }

    _preload = () => {
        log("preload")
    }

    _create = () => {
        log("create")
        this.changeState("game")
    }

    _update = () => {
        log("update")
    }

    _render = () => {
        log("render")
    }

}
