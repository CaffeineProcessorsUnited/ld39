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
    cameraMarginH: number = 10
    cameraMarginV: number = 10

    inBoundCheck: boolean = false

    constructor(gameState: GameState, width: number, height: number, key: string) {
        super(gameState.game, 0, 0, key)
        this.gameState = gameState
        this.width = width
        this.height = height

        this.anchor.set(0.5)

        this.textWidth = this.width - this.marginH * 2
        this.textHeight = this.height - this.marginV * 2

        let style = {
            font: "16px Helvetica",
            fill: "#FAFAFA",
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
        this.text.position.x = this.x
        this.text.position.y = this.y
        this.keepInBounds()
    }

    keepInBounds() {
        if (this.inBoundCheck) {
            return
        }
        this.inBoundCheck = true
        let update = false
        let me = new Phaser.Rectangle(this.xCorner - this.cameraMarginH, this.yCorner - this.cameraMarginV, this.width + 2 * this.cameraMarginH, this.height + 2 * this.cameraMarginV)
        if (!this.game.camera.view.containsRect(me)) {
            if (me.x < this.game.camera.view.x) {
                me.x = this.game.camera.view.x + this.cameraMarginH
                update = true
            } else if (me.right > this.game.camera.view.right) {
                me.x = this.game.camera.view.right - me.width + this.cameraMarginH
                update = true
            }
            if (me.y < this.game.camera.view.y) {
                me.y = this.game.camera.view.y + this.cameraMarginV
                update = true
            } else if (me.bottom > this.game.camera.view.bottom) {
                me.y = this.game.camera.view.bottom - me.height + this.cameraMarginV
                update = true
            }
            if (update) {
                this.x = me.x + this.width / 2
                this.y = me.y + this.height / 2
            }
        }
        this.inBoundCheck = false
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

    get xCorner() {
        return this.position.x - this.width / 2
    }

    set y(y: number) {
        this.position.y = y
        this.text.position.y = this.marginV + y
        this.updatePosition()
    }

    get y() {
        return this.position.y
    }

    get yCorner() {
        return this.position.y - this.height / 2
    }

    setPosition(x: number, y: number) {
        this.inBoundCheck = true
        this.x = x
        this.y = y
        this.inBoundCheck = false
        this.updatePosition()
    }

    setVisible(visible: boolean) {
        this.text.visible = visible
        this.visible = visible
    }

    getVisible() {
        return this.visible
    }

    above(x: number, y: number, height?: number) {
        height = height || this.gameState.map.tileHeight
        this.setPosition(x, y - height)
    }

    aboveTile(tile: Phaser.Tile) {
        return this.above(tile.worldX + tile.centerX, tile.worldY + tile.centerY, tile.height)
    }

    aboveTileXY(x: number, y: number) {
        return this.aboveTile(this.gameState.map.getTile(x, y))
    }

}
