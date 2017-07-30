import {log, State} from "../sgl/sgl"

export class EndState extends State {

    _init = (...additionalParameters: any[]) => {
        log("END: init")


    }

    _preload = () => {
        log("END: preload")
    }

    _create = () => {
        log("END: create")
    }

    _update = () => {
        log("END: update")
    }

    _render = () => {
        log("END: render")
    }

}
