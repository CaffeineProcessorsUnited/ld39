import {Loader, ready} from "./sgl/sgl"
import {BootState} from "./states/boot"
import {MenuState} from "./states/menu"
import {GameState} from "./states/game"
import {EndState} from "./states/end"

ready(() => {
    (<any>window).loader = new Loader()
    let loader = (<any>window).loader
    loader.parent = "game"
    loader.renderer = Phaser.WEBGL
    loader.scaling = Phaser.ScaleManager.EXACT_FIT
    // Initialize game
    // game = loader.game
    let a = new MenuState(loader)
    // console.log(a.create())

    loader.addStates({
        "end": new EndState(loader),
        "boot": new BootState(loader),
        "menu": new MenuState(loader),
        "game": new GameState(loader, {
            "in": 1000,
            "out": 1000,
        }),
    })

    loader.start()
    // No more code after here
})
