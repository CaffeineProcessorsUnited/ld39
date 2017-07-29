import {log, error, override} from "./sgl"

export class LayerManager {

    game: Phaser.Game
    root: Phaser.Group
    layers: { [index: string]: Layer } = {}

    constructor(game: Phaser.Game) {
        this.game = game
        this.root = this.game.add.group()
    }

    add(key: string, layer: Layer, override: boolean = false): boolean {
        if (this.layers.hasOwnProperty(key) && !override) {
            error(`Layer with key \"${key}\" already exists`)
            return false
        }
        layer.zindex = Object.getOwnPropertyNames(this.layers).length
        layer.manager = this
        this.layers[key] = layer
        this.root.add(layer)
        this.sortChildren()
        return true
    }

    isLayer(key: string) {
        return this.layers.hasOwnProperty(key)
    }

    layer(key: string) {
        if (!this.isLayer(key)) {
            throw new Error("Invalid layer accessed!")
        }
        return this.layers[key]
    }

    zindex(key: string, z: number) {
        this.layer(key).zindex = z
        this.sortChildren()
    }

    sort(keys: string[], ascending: boolean = true) {
        let i = ascending ? 0 : keys.length
        let changed = false
        keys.forEach((key: string) => {
            if (this.isLayer(key)) {
                changed = true
                this.layer(key).zindex = i
                i += ascending ? 1 : -1
            }
        })
        if (changed) {
            this.sortChildren()
            log("Sort children")
        }
    }

    private sortChildren() {
        this.root.customSort((a: Layer, b: Layer) => {
            if (a.zindex < b.zindex) {
                return -1
            }
            if (a.zindex > b.zindex) {
                return 1
            }
            return 0
        }, this)
    }

}

export class Layer extends Phaser.Group {
    manager: LayerManager
    zindex: number
    private refs: { [index: string]: any } = {}

    addRef(key: string, child: any, silent?: boolean, index?: number) {
        this.refs[key] = this.add(child, silent, index)
    }

    ref(key: string) {
        if (!this.refs.hasOwnProperty(key)) {
            throw new Error("Invalid reference accessed!")
        }
        return this.refs[key]
    }
}
