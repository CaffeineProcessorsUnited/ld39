import {GameState} from "../states/game"
import {log} from "./util"

export class Dialog extends Phaser.Sprite {

    gameState: GameState
    text: Phaser.Text

    width: number
    height: number
    textWidth: number
    textHeight: number
    marginH: number = 5
    marginV: number = 5

    constructor(gameState: GameState, width: number, height: number, key: string) {
        super(gameState.game, 0, 0, key)
        this.gameState = gameState
        this.width = width
        this.height = height

        this.anchor.set(0.5)

        this.textWidth = this.width - this.marginH * 2
        this.textHeight = this.height - this.marginV * 2

        let style = {
            font: "20px Helvetica",
            fill: "#560CA2",
            wordWrap: false,
            align: "center",
            boundsAlignH: "center",
            boundsAlignV: "middle",
        }

        this.text = this.game.add.text(this.marginH, this.marginV, "Dummy content", style)
        this.text.anchor.set(0.5)
    }

    updatePosition() {
        this.width = this.text.width + this.marginH * 2
        this.height = this.text.height + this.marginV * 2
        this.text.position.x = this.x// + this.marginH
        this.text.position.y = this.y// + this.marginV
    }

    say(text: string) {
        this.text.setText(text, false)
        this.updatePosition()
    }

    set x(x: number) {
        this.position.x = x
        this.text.position.x = this.marginH + x
        this.updatePosition()
    }

    get x() {
        return this.position.x
    }

    set y(y: number) {
        this.position.y = y
        this.text.position.y = this.marginV + y
        this.updatePosition()
    }

    get y() {
        return this.position.y
    }

    above(x: number, y: number, height?: number) {
        height = height || this.gameState.map.tileHeight
        this.x = x
        this.y = y - height
    }

    aboveTile(tile: Phaser.Tile) {
        log(tile.worldX, tile.worldY, tile.centerX, tile.centerY)
        return this.above(tile.worldX + tile.centerX, tile.worldY + tile.centerY, tile.height)
    }

    aboveTileXY(x: number, y: number) {
        return this.aboveTile(this.gameState.map.getTile(x, y))
    }

}
