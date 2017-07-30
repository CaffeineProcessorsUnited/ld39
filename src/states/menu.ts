import {log, State, range} from "../sgl/sgl"

export class MenuState extends State {

    ready: boolean = true// TODO: false
    text: Phaser.Text
    keys: Phaser.Sound[] = []
    margin: number = 20
    timePassed: number = 0

    speed = {"0": 30, "1": 160, "2": 80 }

    currentLine: number = 0
    currentActor: number = -1
    currentChar: number = 0

    currentText: string = ""

    // 0 == output from the system, 1 == input from the user
    consoleText: { "0": string, "1": string }[] = [
        {
            "0": this.pre("~"),
            "1": "cd ld39\n",
        },
        {
            "0": this.pre(),
            "1": "ll\n",
        },
        {
            "0": "total 42T\n" +
            "drwx------   1 root    root 42T 1970 Jan 01 03:14 secrets\n" +
            "-rw-r--r--   1 unicorn cpu  128 1970 Jan 01 13:37 README.md\n" +
            "-rwxrwx---   1 unicorn cpu 117K 1970 Jan 01 04:20 ld39\n",
            "1": "",
        },
        {
            "0": this.pre(),
            "1": "./ld39\n",
        },
        {
            "0": "Loading assets",
            "1": "",
        },
        this.dot(),
        this.dot(),
        this.dot(),
        this.ok(),
        {
            "0": "Charging batteries",
            "1": "",
        },
        this.dot(),
        this.dot(),
        this.dot(),
        this.ok(),
        {
            "0": "Applying energy saver",
            "1": "",
        },
        this.dot(),
        this.dot(),
        this.dot(),
        this.ok(),
        {
            "0": "Adjusting brightness",
            "1": "",
        },
        this.dot(),
        this.dot(),
        this.dot(),
        this.ok(),
        {
            "0": "Locking doors",
            "1": "",
        },
        this.dot(),
        this.dot(),
        this.dot(),
        this.ok(),
        {
            "0": "Spawning player",
            "1": "",
        },
        this.dot(),
        this.dot(),
        this.dot(),
        this.ok(),
    ]
    _init = (...additionalParameters: any[]) => {
    }
    _preload = () => {
        range(0, 8).forEach((i: number) => {
            this.loader.game.load.audio(`key${i}`, `assets/audio/key${i}.ogg`)
        })
    }
    _create = () => {
        this.text = this.loader.game.add.text(this.margin, this.margin, "", {
            font: "16px monospace",
            wordWrap: false,
            wordWrapWidth: this.loader.game.width - 2 * this.margin,
            fill: "#ffffff",
            align: "left",
            boundsAlignH: "left",
            boundsAlignV: "top",
        })
        this.text.lineSpacing = -4


        range(0, 8).forEach((i: number) => {
            this.keys.push(this.game.add.audio(`key${i}`))
            this.keys[i].allowMultiple = true
        })
    }
    _update = () => {
        if (this.ready) {
            this.changeState("game")
        }
        // log(this.ready, this.timePassed, this.currentLine, this.currentActor, this.currentChar, this.currentText)


        if (this.currentActor >= 0 && this.timePassed >= this.speed[this.currentActor]) {
            this.timePassed = 0
            if (this.currentLine >= this.consoleText.length) {
                this.ready = true
                return
            }
            if (this.currentChar < this.consoleText[this.currentLine][this.currentActor].length) {
                this.currentText += this.consoleText[this.currentLine][this.currentActor].charAt(this.currentChar++)
                this.text.setText(this.currentText)
                if (this.currentActor === 1) {
                    this.keys[Math.floor(Math.random() * 8)].play()
                }
            } else {
                this.currentChar = 0
                this.currentActor = (this.currentActor + 1) % 2
                if (this.currentActor === 0) {
                    this.currentLine++
                    this.currentActor = -1
                }
            }
        } else if (this.currentActor < 0 && this.timePassed >= this.speed[2]) {
            this.timePassed = 0
            this.currentActor = 0
        }

        this.timePassed += this.game.time.elapsedMS
    }
    _render = () => {
        this.game.debug.body(this.text)
    }

    pre(path: string = "~/ld39") {
        return `unicorn@cpu:${path} $ `
    }

    dot() {
        return {
            "0": ".",
            "1": "",
        }
    }

    ok() {
        return {
            "0": "OK\n",
            "1": "",
        }
    }

}
