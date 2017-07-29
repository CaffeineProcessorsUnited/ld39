import {Loader, ready} from "./sgl/sgl"
import {BootState} from "./states/boot"
import {MenuState} from "./states/menu"
import {GameState} from "./states/game"

let loader: Loader
let game: Phaser.Game

ready(() => {
    loader = new Loader()
    loader.parent = "game"
    // Initialize game
    // game = loader.game
    let a = new MenuState(loader)
    // console.log(a.create())

    loader.addStates({
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
