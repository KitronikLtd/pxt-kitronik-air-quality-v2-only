/*
  Kitronik package for use with the Air Quality Board (www.kitronik.co.uk/5674)
  This package pulls in other packages to deal with the lower level work for:
    Setting and reading a Real Time Clock chip
*/

/**
* Well known colors for ZIP LEDs
*/
enum ZipLedColors {
    //% block=red
    Red = 0xFF0000,
    //% block=orange
    Orange = 0xFFA500,
    //% block=yellow
    Yellow = 0xFFFF00,
    //% block=green
    Green = 0x00FF00,
    //% block=blue
    Blue = 0x0000FF,
    //% block=indigo
    Indigo = 0x4b0082,
    //% block=violet
    Violet = 0x8a2be2,
    //% block=purple
    Purple = 0xFF00FF,
    //% block=white
    White = 0xFFFFFF,
    //% block=black
    Black = 0x000000
}

/** 
 * Different time options for the Real Time Clock
 */
enum TimeParameter {
    //% block=hours
    Hours,
    //% block=minutes
    Minutes,
    //% block=seconds
    Seconds
}

/**
 * Different date options for the Real Time Clock
 */
enum DateParameter {
    //% block=day
    Day,
    //% block=month
    Month,
    //% block=year
    Year
}

//List of different temperature units
enum TemperatureUnitList {
    //% block="°C"
    C,
    //% block="°F"
    F
}

//List of different pressure units
enum PressureUnitList {
    //% block="Pa"
    Pa,
    //% block="mBar"
    mBar
}

/**
 * Kitronik Air Quality Board MakeCode Extension
 */

//% weight=100 color=#00A654 icon="\uf0c2" block="Air Quality (V2)"
//% groups='["Control", "Show", "Draw", "Delete", "Advanced", "Set Time", "Set Date", "Read Time", "Read Date", "Alarm", "Setup", "Measure", "Climate", "Air Quality", "General Inputs/Outputs", "Write", "Read," "Setup", "Add Data", "Transfer"]'
namespace kitronik_air_quality {
    ////////////////////////////////
    //         ZIP LEDS           //
    ////////////////////////////////
    export class airQualityZIPLEDs {
        buf: Buffer;
        pin: DigitalPin;
        brightness: number;
        start: number;
        _length: number;

        /**
         * Rotate LEDs forward.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of ZIP LEDs to rotate forward, eg: 1
         */
        //% subcategory="ZIP LEDs"
        //% blockId="kitronik_air_quality_display_rotate" block="%statusLEDs|rotate ZIP LEDs by %offset" blockGap=8
        //% weight=92
        rotate(offset: number = 1): void {
            this.buf.rotate(-offset * 3, this.start * 3, this._length * 3)
        }
        
        /**
         * Shows all the ZIP LEDs as a given color (range 0-255 for r, g, b). 
         * @param rgb RGB color of the LED
         */
        //% subcategory="ZIP LEDs"
        //% blockId="kitronik_air_quality_display_set_strip_color" block="%statusLEDs|show color %rgb=kitronik_air_quality_colors" 
        //% weight=97 blockGap=8
        showColor(rgb: number) {
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }

        /**
         * Set particular ZIP LED to a given color. 
         * You need to call ``show changes`` to make the changes visible.
         * @param zipLedNum position of the ZIP LED in the string
         * @param rgb RGB color of the ZIP LED
         */
        //% subcategory="ZIP LEDs"
        //% blockId="kitronik_air_quality_set_zip_color" block="%statusLEDs|set ZIP LED %zipLedNum|to %rgb=kitronik_air_quality_colors" 
        //% weight=95 blockGap=8
        setZipLedColor(zipLedNum: number, rgb: number): void {
            this.setPixelRGB(zipLedNum >> 0, rgb >> 0);
        }

        /**
         * Send all the changes to the ZIP LEDs.
         */
        //% subcategory="ZIP LEDs"
        //% blockId="kitronik_air_quality_display_show" block="%statusLEDs|show"
        //% weight=94 blockGap=8
        show() {
            //use the Kitronik version which respects brightness for all 
            //ws2812b.sendBuffer(this.buf, this.pin, this.brightness);
            // Use the pxt-microbit core version which now respects brightness (10/2020)
            light.sendWS2812BufferWithBrightness(this.buf, this.pin, this.brightness);
            control.waitMicros(100) // This looks messy, but it fixes the issue sometimes found when using multiple ZIP LED ranges, where the settings for the first range are clocked through to the next range. A short pause allows the ZIP LEDs to realise they need to stop pushing data.
        }

        /**
         * Turn off all the ZIP LEDs.
         * You need to call ``show`` to make the changes visible.
         */
        //% subcategory="ZIP LEDs"
        //% blockId="kitronik_air_quality_display_clear" block="%statusLEDs|clear"
        //% weight=93 blockGap=8
        clear(): void {
            this.buf.fill(0, this.start * 3, this._length * 3);
        }

        /**
         * Set the brightness of the ZIP LEDs. This flag only applies to future show operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 255
         */
        //% subcategory="ZIP LEDs"
        //% blockId="kitronik_air_quality_display_set_brightness" block="%statusLEDs|set brightness %brightness" blockGap=8
        //% weight=91
        //% brightness.min=0 brightness.max=255
        setBrightness(brightness: number): void {
            //Clamp incoming variable at 0-255 as values out of this range cause unexpected brightnesses as the lower level code only expects a byte.
            if (brightness < 0) {
                brightness = 0
            }
            else if (brightness > 255) {
                brightness = 255
            }
            this.brightness = brightness & 0xff;
            basic.pause(1) //add a pause to stop wierdnesses
        }

        //Sets up the buffer for pushing LED control data out to LEDs
        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            this.buf[offset + 0] = green;
            this.buf[offset + 1] = red;
            this.buf[offset + 2] = blue;
        }

        //Separates out Red, Green and Blue data and fills the LED control data buffer for all LEDs
        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const end = this.start + this._length;
            for (let i = this.start; i < end; ++i) {
                this.setBufferRGB(i * 3, red, green, blue)
            }
        }

        //Separates out Red, Green and Blue data and fills the LED control data buffer for a single LED
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 3;

            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            this.setBufferRGB(pixeloffset, red, green, blue)
        }
    }

    /**
     * Create a new ZIP LED driver for Air Quality Board.
     */
    //% subcategory="ZIP LEDs"
    //% blockId="kitronik_air_quality_display_create" block="Air Quality Board with 3 ZIP LEDs"
    //% weight=100 blockGap=8
    //% trackArgs=0,2
    //% blockSetVariable=statusLEDs
    export function createAirQualityZIPDisplay(): airQualityZIPLEDs {
        let statusLEDs = new airQualityZIPLEDs;
        statusLEDs.buf = pins.createBuffer(9);
        statusLEDs.start = 0;
        statusLEDs._length = 3;
        statusLEDs.setBrightness(128)
        statusLEDs.pin = DigitalPin.P8;
        pins.digitalWritePin(statusLEDs.pin, 0);
        return statusLEDs;
    }

    /**
     * Converts hue (0-360) to an RGB value. 
     * Does not attempt to modify luminosity or saturation. 
     * Colours end up fully saturated. 
     * @param hue value between 0 and 360
     */
    //% subcategory="ZIP LEDs"
    //% weight=1 blockGap=8
    //% blockId="kitronik_air_quality_hue" block="hue %hue"
    //% hue.min=0 hue.max=360
    export function hueToRGB(hue: number): number {
        let redVal = 0
        let greenVal = 0
        let blueVal = 0
        let hueStep = 2.125
        if ((hue >= 0) && (hue < 120)) { //RedGreen section
            greenVal = Math.floor((hue) * hueStep)
            redVal = 255 - greenVal
        }
        else if ((hue >= 120) && (hue < 240)) { //GreenBlueSection
            blueVal = Math.floor((hue - 120) * hueStep)
            greenVal = 255 - blueVal
        }
        else if ((hue >= 240) && (hue < 360)) { //BlueRedSection
            redVal = Math.floor((hue - 240) * hueStep)
            blueVal = 255 - redVal
        }
        return ((redVal & 0xFF) << 16) | ((greenVal & 0xFF) << 8) | (blueVal & 0xFF);
    }

    /*  The LEDs we are using have centre wavelengths of 470nm (Blue) 525nm(Green) and 625nm (Red) 
    * 	 We blend these linearly to give the impression of the other wavelengths. 
    *   as we cant wavelength shift an actual LED... (Ye canna change the laws of physics Capt)*/

    /**
     * Converts value to red, green, blue channels
     * @param red value of the red channel between 0 and 255. eg: 255
     * @param green value of the green channel between 0 and 255. eg: 255
     * @param blue value of the blue channel between 0 and 255. eg: 255
     */
    //% subcategory="ZIP LEDs"
    //% weight=1 blockGap=8
    //% blockId="kitronik_air_quality_rgb" block="red %red|green %green|blue %blue"
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    /**
     * Gets the RGB value of a known color
    */
    //% subcategory="ZIP LEDs"
    //% weight=2 blockGap=8
    //% blockId="kitronik_air_quality_colors" block="%color"
    export function colors(color: ZipLedColors): number {
        return color;
    }

    //Combines individual RGB settings to be a single number
    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    //Separates red value from combined number
    function unpackR(rgb: number): number {
        let r = (rgb >> 16) & 0xFF;
        return r;
    }
    //Separates green value from combined number
    function unpackG(rgb: number): number {
        let g = (rgb >> 8) & 0xFF;
        return g;
    }
    //Separates blue value from combined number
    function unpackB(rgb: number): number {
        let b = (rgb) & 0xFF;
        return b;
    }

    /**
     * Converts a hue saturation luminosity value into a RGB color
     */
    function hsl(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);

        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h1 = Math.idiv(h, 60);//[0,6]
        let h2 = Math.idiv((h - h1 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h1 % 2) << 8) + h2) - 256);
        let x = (c * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h1 == 0) {
            r$ = c; g$ = x; b$ = 0;
        } else if (h1 == 1) {
            r$ = x; g$ = c; b$ = 0;
        } else if (h1 == 2) {
            r$ = 0; g$ = c; b$ = x;
        } else if (h1 == 3) {
            r$ = 0; g$ = x; b$ = c;
        } else if (h1 == 4) {
            r$ = x; g$ = 0; b$ = c;
        } else if (h1 == 5) {
            r$ = c; g$ = 0; b$ = x;
        }
        let m = Math.idiv((Math.idiv((l * 2 << 8), 100) - c), 2);
        let r = r$ + m;
        let g = g$ + m;
        let b = b$ + m;
        return packRGB(r, g, b);
    }

    /**
     * Options for direction hue changes, used by rainbow block (never visible to end user)
     */
    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }

    ////////////////////////////////
    //            OLED            //
    ////////////////////////////////
    /**
     * Select the alignment of text
     */
    export enum ShowAlign {
        //% block="Left"
        Left,
        //% block="Centre"
        Centre,
        //% block="Right"
        Right
    }

    /**
     * Select direction for drawing lines
     */
    export enum LineDirectionSelection {
        //% block="horizontal"
        horizontal,
        //% block="vertical"
        vertical
    }

    /**
     * Using (x, y) coordinates, turn on a selected pixel on the screen.
     * @param x is the X axis value, eg: 0
     * @param y is the Y axis value, eg: 0
     */
    //% blockId="kitronik_air_quality_set_pixel" block="show pixel at x %x|y %y"
    //% subcategory="Display"
    //% group="Show"
    //% weight=70 blockGap=8
    //% x.min=0 x.max=127
    //% y.min=0 y.max=63
    //% inlineInputMode=inline
    export function setPixel(x: number, y: number) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.setPixel_Base(x, y)
    }

    /**
     * Using the (x, y) coordinates, clear a selected pixel on the screen.
     * @param x is the X axis value, eg: 0
     * @param y is the Y axis value, eg: 0
     */
    //% blockId="kitronik_air_quality_clear_pixel" block="clear pixel at x %x|y %y"
    //% subcategory="Display"
    //% group="Delete"
    //% weight=70 blockGap=8
    //% x.min=0 x.max=127
    //% y.min=0 y.max=63
    //% inlineInputMode=inline
    export function clearPixel(x: number, y: number) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.clearPixel_Base(x, y)
    }

    /**
     * 'show' allows any number, string or variable to be displayed on the screen.
     * The line and justification (Left, Centre or Right) can be set.
     * @param displayShowAlign is the alignment of the text, this can be left, centre or right
     * @param line is line the text to be started on, eg: 1
     * @param inputData is the text will be show
     */
    //% blockId="kitronik_air_quality_show" block="show %s| on line %line| with alignment: %displayShowAlign"
    //% weight=80 blockGap=8
    //% subcategory="Display"
    //% group="Show"
    //% inlineInputMode=inline
    //% line.min=1 line.max=8
    export function show(inputData: any, line: number, displayShowAlign: ShowAlign) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.show_Base(inputData, line, displayShowAlign)
    }

    /**
     * Clear a specific line on the screen (1 to 8).
     * @param line is line to clear, eg: 1
     */
    //% blockId="kitronik_air_quality_clear_line" block="clear line %line"
    //% weight=80 blockGap=8
    //% subcategory="Display"
    //% group="Delete"
    //% inlineInputMode=inline
    //% line.min=1 line.max=8
    export function clearLine(line: number) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.clearLine_Base(line)
    }

    /**
     * Draw a line of a specific length in pixels, using the (x, y) coordinates as a starting point.
     * @param lineDirection is the selection of either horizontal line or vertical line
     * @param x is start position on the X axis, eg: 0
     * @param y is start position on the Y axis, eg: 0
     * @param len is the length of line, length is the number of pixels, eg: 10
     */
    //% blockId="kitronik_air_quality_draw_line" block="draw a %lineDirection | line with length of %len starting at x %x|y %y"
    //% weight=72 blockGap=8
    //% subcategory="Display"
    //% group="Draw"
    //% x.min=0 x.max=127
    //% y.min=0 y.max=63
    //% len.min=1 len.max=127
    //% inlineInputMode=inline
    export function drawLine(lineDirection: LineDirectionSelection, len: number, x: number, y: number) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.drawLine_Base(lineDirection, len, x, y)
    }

    /**
     * Draw a rectangle with a specific width and height in pixels, using the (x, y) coordinates as a starting point.
     * @param width is width of the rectangle, eg: 60
     * @param height is height of the rectangle, eg: 30
     * @param x is the start position on the X axis, eg: 0
     * @param y is the start position on the Y axis, eg: 0
     */
    //% blockId="kitronik_air_quality_draw_rect" block="draw a rectangle %width|wide %height|high from position x %x|y %y"
    //% weight=71 blockGap=8
    //% subcategory="Display"
    //% group="Draw"
    //% inlineInputMode=inline
    //% width.min=1 width.max=127
    //% height.min=1 height.max=63
    //% x.min=0 x.max=127
    //% y.min=0 y.max=63
    export function drawRect(width: number, height: number, x: number, y: number) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.drawRect_Base(width, height, x, y)
    }

    /**
     * Clear all pixels, text and images on the screen.
     */
    //% blockId="kitronik_air_quality_clear" block="clear display"
    //% subcategory="Display"
    //% group="Delete"
    //% weight=63 blockGap=8
    export function clear() {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.clear_Base()
    }

    /**
     * Turn the screen on and off. The information on the screen will be kept when it is off, ready to be displayed again.
     * @param displayOutput is the boolean setting for the screen, either ON or OFF
     */
    //% blockId=kitronik_air_quality_display_on_off_control
    //% block="turn %displayOutput=on_off_toggle| display"
    //% subcategory="Display"
    //% group="Control"
    //% weight=80 blockGap=8
    export function controlDisplayOnOff(displayOutput: boolean) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.controlDisplayOnOff_Base(displayOutput)
    }

    /**
     * Render a boolean as an on/off toggle
     */
    //% blockId=on_off_toggle
    //% block="$on"
    //% on.shadow="toggleOnOff"
    //% blockHidden=true
    export function onOff(on: boolean): boolean {
        return on;
    }


    //////////////////////////////////////
    //
    //      Plotting blocks
    //
    //////////////////////////////////////

    /**
     * Start plotting a live graph of the chosen variable or input on the screen. 
     * @param plotVariable is the variable to be recorded on a graph on the display
     */
    //% blockId="kitronik_air_quality_plot_request"
    //% subcategory="Display"
    //% group="Draw"
    //% block="plot %plotVariable| onto display"
    //% weight=100 blockGap=8
    export function plot(plotVariable: number) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.plot_Base(plotVariable)
    }

    //////////////////////////////////////
    //
    //      Expert blocks
    //
    //////////////////////////////////////

    /**
     * Update or refresh the screen if any data has been changed.
     */
    //% subcategory="Display"
    //% group="Advanced"
    //% blockId="kitronik_air_quality_draw" block="refresh display"
    //% weight=63 blockGap=8
    export function refresh() {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.refresh_Base()
    }

    /**
     * Invert the colours on the screen (black to white, white to black)
     * @param output toggles between inverting the colours of the display
     */
    //% subcategory="Display"
    //% group="Advanced"
    //% blockId="kitronik_air_quality_invert_screen" block="inverted display %output=on_off_toggle"
    //% weight=62 blockGap=8
    export function invert(output: boolean) {
        if (kitronik_OLED_V2.initialised == 0) {
            kitronik_OLED_V2.initDisplay()
        }
        kitronik_OLED_V2.invert_Base(output)
    }

    ////////////////////////////////
    //            RTC             //
    ////////////////////////////////

    /**
     * Alarm repeat type
     */
    export enum AlarmType {
        //% block="Single"
        Single = 0,
        //% block="Daily Repeating"
        Repeating = 1
    }

    /**
     * Alarm silence type
     */
    export enum AlarmSilence {
        //% block="Auto Silence"
        autoSilence = 1,
        //% block="User Silence"
        userSilence = 2
    }

    let alarmHour = 0       //The hour setting for the alarm
    let alarmMin = 0        //The minute setting for the alarm
    export let alarmSetFlag = 0    //Flag set to '1' when an alarm is set
    let alarmRepeat = 0     //If '1' shows that the alarm should remain set so it triggers at the next time match
    let alarmOff = 0        //If '1' shows that alarm should auto switch off, if '2' the user must switch off 
    let alarmTriggered = 0  //Flag to show if the alarm has been triggered ('1') or not ('0')
    let alarmTriggerHandler: Action
    let alarmHandler: Action
    let simpleCheck = 0 //If '1' shows that the alarmHandler is not required as the check is inside an "if" statement

    /**
     * Set time on RTC, as three numbers
     * @param setHours is to set the hours
     * @param setMinutes is to set the minutes
     * @param setSeconds is to set the seconds
    */
    //% subcategory="Clock"
    //% group="Set Time"
    //% blockId=kitronik_air_quality_set_time 
    //% block="Set Time to %setHours|hrs %setMinutes|mins %setSeconds|secs"
    //% setHours.min=0 setHours.max=23
    //% setMinutes.min=0 setMinutes.max=59
    //% setSeconds.min=0 setSeconds.max=59
    //% weight=100 blockGap=8
    export function setTime(setHours: number, setMinutes: number, setSeconds: number): void {

        if (kitronik_RTC.initalised == false) {
            kitronik_RTC.secretIncantation()
        }

        let bcdHours = kitronik_RTC.decToBcd(setHours)                           //Convert number to binary coded decimal
        let bcdMinutes = kitronik_RTC.decToBcd(setMinutes)                       //Convert number to binary coded decimal
        let bcdSeconds = kitronik_RTC.decToBcd(setSeconds)                       //Convert number to binary coded decimal
        let writeBuf = pins.createBuffer(2)

        writeBuf[0] = kitronik_RTC.RTC_SECONDS_REG
        writeBuf[1] = kitronik_RTC.STOP_RTC                                  //Disable Oscillator
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        writeBuf[0] = kitronik_RTC.RTC_HOURS_REG
        writeBuf[1] = bcdHours                                      //Send new Hours value
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        writeBuf[0] = kitronik_RTC.RTC_MINUTES_REG
        writeBuf[1] = bcdMinutes                                    //Send new Minutes value
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        writeBuf[0] = kitronik_RTC.RTC_SECONDS_REG
        writeBuf[1] = kitronik_RTC.START_RTC | bcdSeconds                            //Send new seconds masked with the Enable Oscillator
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)
    }

    /**
     * Read time from RTC as a string
    */
    //% subcategory="Clock"
    //% group="Read Time"
    //% blockId=kitronik_air_quality_read_time 
    //% block="Read Time as String"
    //% weight=95 blockGap=8
    export function readTime(): string {

        if (kitronik_RTC.initalised == false) {
            kitronik_RTC.secretIncantation()
        }

        //read Values
        kitronik_RTC.readValue()

        let decSeconds = kitronik_RTC.bcdToDec(kitronik_RTC.currentSeconds, kitronik_RTC.RTC_SECONDS_REG)                  //Convert number to Decimal
        let decMinutes = kitronik_RTC.bcdToDec(kitronik_RTC.currentMinutes, kitronik_RTC.RTC_MINUTES_REG)                  //Convert number to Decimal
        let decHours = kitronik_RTC.bcdToDec(kitronik_RTC.currentHours, kitronik_RTC.RTC_HOURS_REG)                        //Convert number to Decimal

        //Combine hours,minutes and seconds in to one string
        let strTime: string = "" + ((decHours / 10) >> 0) + decHours % 10 + ":" + ((decMinutes / 10) >> 0) + decMinutes % 10 + ":" + ((decSeconds / 10) >> 0) + decSeconds % 10

        return strTime
    }

    /**
     * Set date on RTC as three numbers
     * @param setDay is to set the day in terms of numbers 1 to 31
     * @param setMonths is to set the month in terms of numbers 1 to 12
     * @param setYears is to set the years in terms of numbers 0 to 99
    */
    //% subcategory="Clock"
    //% group="Set Date"
    //% blockId=kitronik_air_quality_set_date 
    //% block="Set Date to %setDays|Day %setMonths|Month %setYear|Year"
    //% setDay.min=1 setDay.max=31
    //% setMonth.min=1 setMonth.max=12
    //% setYear.min=0 setYear.max=99
    //% weight=90 blockGap=8
    export function setDate(setDay: number, setMonth: number, setYear: number): void {

        if (kitronik_RTC.initalised == false) {
            kitronik_RTC.secretIncantation()
        }

        let leapYearCheck = 0
        let writeBuf = pins.createBuffer(2)
        let readBuf = pins.createBuffer(1)
        let bcdDay = 0
        let bcdMonths = 0
        let bcdYears = 0
        let readCurrentSeconds = 0

        //Check day entered does not exceed month that has 30 days in
        if ((setMonth == 4) || (setMonth == 6) || (setMonth == 9) || (setMonth == 11)) {
            if (setDay == 31) {
                setDay = 30
            }
        }

        //Leap year check and does not exceed 30 days
        if ((setMonth == 2) && (setDay >= 29)) {
            leapYearCheck = setYear % 4
            if (leapYearCheck == 0)
                setDay = 29
            else
                setDay = 28
        }

        let weekday = kitronik_RTC.calcWeekday(setDay, setMonth, (setYear + 2000))

        bcdDay = kitronik_RTC.decToBcd(setDay)                       //Convert number to binary coded decimal
        bcdMonths = kitronik_RTC.decToBcd(setMonth)                  //Convert number to binary coded decimal
        bcdYears = kitronik_RTC.decToBcd(setYear)                    //Convert number to binary coded decimal

        writeBuf[0] = kitronik_RTC.RTC_SECONDS_REG
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        readBuf = pins.i2cReadBuffer(kitronik_RTC.CHIP_ADDRESS, 1, false)
        readCurrentSeconds = readBuf[0]

        writeBuf[0] = kitronik_RTC.RTC_SECONDS_REG
        writeBuf[1] = kitronik_RTC.STOP_RTC                                  //Disable Oscillator
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        writeBuf[0] = kitronik_RTC.RTC_WEEKDAY_REG
        writeBuf[1] = weekday                                        //Send new Weekday value
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        writeBuf[0] = kitronik_RTC.RTC_DAY_REG
        writeBuf[1] = bcdDay                                        //Send new Day value
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        writeBuf[0] = kitronik_RTC.RTC_MONTH_REG
        writeBuf[1] = bcdMonths                                     //Send new Months value
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        writeBuf[0] = kitronik_RTC.RTC_YEAR_REG
        writeBuf[1] = bcdYears                                      //Send new Year value
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)

        writeBuf[0] = kitronik_RTC.RTC_SECONDS_REG
        writeBuf[1] = kitronik_RTC.START_RTC | readCurrentSeconds                    //Enable Oscillator
        pins.i2cWriteBuffer(kitronik_RTC.CHIP_ADDRESS, writeBuf, false)
    }

    /**
     * Read date from RTC as a string
    */
    //% subcategory="Clock"
    //% group="Read Date"
    //% blockId=kitronik_air_quality_read_date 
    //% block="Read Date as String"
    //% weight=85 blockGap=8
    export function readDate(): string {

        if (kitronik_RTC.initalised == false) {
            kitronik_RTC.secretIncantation()
        }

        //read Values
        kitronik_RTC.readValue()

        let decDay = kitronik_RTC.bcdToDec(kitronik_RTC.currentDay, kitronik_RTC.RTC_DAY_REG)                      //Convert number to Decimal
        let decMonths = kitronik_RTC.bcdToDec(kitronik_RTC.currentMonth, kitronik_RTC.RTC_MONTH_REG)               //Convert number to Decimal
        let decYears = kitronik_RTC.bcdToDec(kitronik_RTC.currentYear, kitronik_RTC.RTC_YEAR_REG)                  //Convert number to Decimal

        //let strDate: string = decDay + "/" + decMonths + "/" + decYears
        let strDate: string = "" + ((decDay / 10) >> 0) + (decDay % 10) + "/" + ((decMonths / 10) >> 0) + (decMonths % 10) + "/" + ((decYears / 10) >> 0) + (decYears % 10)
        return strDate
    }

    /**Read time parameter from RTC*/
    //% subcategory="Clock"
    //% group="Read Time"
    //% blockId=kitronik_air_quality_read_time_parameter 
    //% block="Read %selectParameter| as Number"
    //% weight=75 blockGap=8
    export function readTimeParameter(selectParameter: TimeParameter): number {

        if (kitronik_RTC.initalised == false) {
            kitronik_RTC.secretIncantation()
        }
        let decParameter = 0
        //read Values
        kitronik_RTC.readValue()

        //from enum convert the required time parameter and return
        if (selectParameter == TimeParameter.Hours) {
            decParameter = kitronik_RTC.bcdToDec(kitronik_RTC.currentHours, kitronik_RTC.RTC_HOURS_REG)                   //Convert number to Decimal
        }
        else if (selectParameter == TimeParameter.Minutes) {
            decParameter = kitronik_RTC.bcdToDec(kitronik_RTC.currentMinutes, kitronik_RTC.RTC_MINUTES_REG)                  //Convert number to Decimal
        }
        else if (selectParameter == TimeParameter.Seconds) {
            decParameter = kitronik_RTC.bcdToDec(kitronik_RTC.currentSeconds, kitronik_RTC.RTC_SECONDS_REG)                  //Convert number to Decimal
        }

        return decParameter
    }

    /**Read time parameter from RTC*/
    //% subcategory="Clock"
    //% group="Read Date"
    //% blockId=kitronik_air_quality_read_date_parameter 
    //% block="Read %selectParameter| as Number"
    //% weight=65 blockGap=8
    export function readDateParameter(selectParameter: DateParameter): number {

        if (kitronik_RTC.initalised == false) {
            kitronik_RTC.secretIncantation()
        }
        let decParameter = 0
        //read Values
        kitronik_RTC.readValue()

        //from enum convert the required time parameter and return
        if (selectParameter == DateParameter.Day) {
            decParameter = kitronik_RTC.bcdToDec(kitronik_RTC.currentDay, kitronik_RTC.RTC_DAY_REG)                   //Convert number to Decimal
        }
        else if (selectParameter == DateParameter.Month) {
            decParameter = kitronik_RTC.bcdToDec(kitronik_RTC.currentMonth, kitronik_RTC.RTC_MONTH_REG)                  //Convert number to Decimal
        }
        else if (selectParameter == DateParameter.Year) {
            decParameter = kitronik_RTC.bcdToDec(kitronik_RTC.currentYear, kitronik_RTC.RTC_YEAR_REG)                   //Convert number to Decimal
        }

        return decParameter
    }

    /**
     * Set simple alarm
     * @param alarmType determines whether the alarm repeats
     * @param hour is the alarm hour setting (24 hour)
     * @param min is the alarm minute setting
     * @param alarmSilence determines whether the alarm turns off automatically or the user turns it off
    */
    //% subcategory="Clock"
    //% group=Alarm
    //% blockId=kitronik_air_quality_simple_set_alarm 
    //% block="set %alarmType|alarm to %hour|:%min|with %alarmSilence"
    //% hour.min=0 hour.max=23
    //% min.min=0 min.max=59
    //% sec.min=0 sec.max=59
    //% inlineInputMode=inline
    //% weight=26 blockGap=8
    export function simpleAlarmSet(alarmType: AlarmType, hour: number, min: number, alarmSilence: AlarmSilence): void {
        if (kitronik_RTC.initalised == false) {
            kitronik_RTC.secretIncantation()
        }

        if (alarmType == 1) {
            alarmRepeat = 1     //Daily Repeating Alarm
        }
        else {
            alarmRepeat = 0     //Single Alarm
        }

        if (alarmSilence == 1) {
            alarmOff = 1                //Auto Silence
        }
        else if (alarmSilence == 2) {
            alarmOff = 2                //User Silence
        }

        alarmHour = hour
        alarmMin = min

        alarmSetFlag = 1

        //Set background alarm trigger check running
        control.inBackground(() => {
            while (alarmSetFlag == 1) {
                backgroundAlarmCheck()
                basic.pause(1000)
            }
        })
    }

    //Function to check if an alarm is triggered and raises the trigger event if true
    //Runs in background once an alarm is set, but only if alarmSetFlag = 1
    function backgroundAlarmCheck(): void {
        let checkHour = readTimeParameter(TimeParameter.Hours)
        let checkMin = readTimeParameter(TimeParameter.Minutes)
        if (alarmTriggered == 1 && alarmRepeat == 1) {
            if (checkMin != alarmMin) {
                alarmSetFlag = 0
                alarmTriggered = 0
                simpleAlarmSet(AlarmType.Repeating, alarmHour, alarmMin, alarmOff) //Reset the alarm after the current minute has changed
            }
        }
        if (checkHour == alarmHour && checkMin == alarmMin) {
            alarmTriggered = 1
            if (alarmOff == 1) {
                alarmSetFlag = 0
                if (simpleCheck != 1) {
                    alarmHandler() //This causes a problem for the simpleAlarmCheck() function, so only runs for onAlarmTrigger()
                }
                basic.pause(2500)
                if (alarmRepeat == 1) {
                    control.inBackground(() => {
                        checkMin = readTimeParameter(TimeParameter.Minutes)
                        while (checkMin == alarmMin) {
                            basic.pause(1000)
                            checkMin = readTimeParameter(TimeParameter.Minutes)
                        }
                        alarmTriggered = 0
                        simpleAlarmSet(AlarmType.Repeating, alarmHour, alarmMin, alarmOff) //Reset the alarm after the current minute has changed
                    })
                }
            }
            else if (alarmOff == 2) {
                if (simpleCheck != 1) {
                    alarmHandler() //This causes a problem for the simpleAlarmCheck() function, so only runs for onAlarmTrigger()
                }
            }
        }
        if (alarmTriggered == 1 && alarmOff == 2 && checkMin != alarmMin) {
            alarmSetFlag = 0
            alarmTriggered = 0
        }
    }

    /**
     * Do something if the alarm is triggered
     */
    //% subcategory="Clock"
    //% group=Alarm
    //% blockId=kitronik_air_quality_on_alarm block="on alarm trigger"
    //% weight=25 blockGap=8
    export function onAlarmTrigger(alarmTriggerHandler: Action): void {
        alarmHandler = alarmTriggerHandler
    }

    /**
     * Determine if the alarm is triggered and return a boolean
    */
    //% subcategory="Clock"
    //% group=Alarm
    //% blockId=kitronik_air_quality_simple_check_alarm 
    //% block="alarm triggered"
    //% weight=24 blockGap=8
    export function simpleAlarmCheck(): boolean {
        simpleCheck = 1 //Makes sure the alarmHandler() is not called
        let checkHour = readTimeParameter(TimeParameter.Hours)
        let checkMin = readTimeParameter(TimeParameter.Minutes)
        if (alarmSetFlag == 1 && checkHour == alarmHour && checkMin == alarmMin) {
            if (alarmOff == 1) {
                control.inBackground(() => {
                    basic.pause(2500)
                    alarmSetFlag = 0
                })
            }
            return true
        }
        else {
            return false
        }
    }

    /**
     * Turn off the alarm
    */
    //% subcategory="Clock"
    //% group=Alarm
    //% blockId=kitronik_air_quality_alarm_off 
    //% block="turn off alarm"
    //% weight=23 blockGap=8
    export function simpleAlarmOff(): void {
        alarmSetFlag = 0
        if (alarmTriggered == 1 && alarmRepeat == 1) {
            control.inBackground(() => {
                let checkMin = readTimeParameter(TimeParameter.Minutes)
                while (checkMin == alarmMin) {
                    basic.pause(1000)
                    checkMin = readTimeParameter(TimeParameter.Minutes)
                }
                alarmTriggered = 0
                simpleAlarmSet(AlarmType.Repeating, alarmHour, alarmMin, alarmOff) //Reset the alarm after the current minute has changed
            })
        }
    }

    ////////////////////////////////
    //          BME688            //
    ////////////////////////////////

    //List of different temperature units
    export enum TemperatureUnitList {
        //% block="°C"
        C,
        //% block="°F"
        F
    }

    //List of different pressure units
    export enum PressureUnitList {
        //% block="Pa"
        Pa,
        //% block="mBar"
        mBar
    }

    //Global variables used for storing one copy of value, these are used in multiple locations for calculations
    let bme688InitFlag = false
    let gasInit = false
    let writeBuf = pins.createBuffer(2)

    // Calculated readings of sensor parameters from raw adc readings
    export let tRead = 0
    export let pRead = 0
    export let hRead = 0
    export let gRes = 0
    export let iaqPercent = 0
    export let iaqScore = 0
    export let eCO2Value = 0

    let gBase = 0
    let hBase = 40        // Between 30% & 50% is a widely recognised optimal indoor humidity, 40% is a good middle ground
    let hWeight = 0.25     // Humidity contributes 25% to the IAQ score, gas resistance is 75%
    let tPrev = 0
    let hPrev = 0
    let measTime = 0
    let measTimePrev = 0

    let tRaw = 0    // adc reading of raw temperature
    let pRaw = 0       // adc reading of raw pressure
    let hRaw = 0       // adc reading of raw humidity
    let gResRaw = 0  // adc reading of raw gas resistance
    let gasRange = 0

    let t_fine = 0                          // Intermediate temperature value used for pressure calculation
    let newAmbTemp = 0
    export let tAmbient = 0       // Intermediate temperature value used for heater calculation

    // Initialise the BME688, establishing communication, entering initial T, P & H oversampling rates, setup filter and do a first data reading (won't return gas)
    export function bme688Init(): void {
        kitronik_BME688.initialise()    // Call BME688 setup function in bme688-base extension

        bme688InitFlag = true

        // Do an initial data read (will only return temperature, pressure and humidity as no gas sensor parameters have been set)
        measureData()
    }

    /**
    * Setup the gas sensor ready to measure gas resistance.
    */
    //% subcategory="Sensors"
    //% group="Setup"
    //% blockId=kitronik_air_quality_setup_gas_sensor
    //% block="setup gas sensor"
    //% weight=100 blockGap=8
    export function setupGasSensor(): void {
        if (bme688InitFlag == false) {
            bme688Init()
        }

        kitronik_BME688.initGasSensor()     // Call BME688 gas sensor setup function in bme-688 base extension

        gasInit = true
    }

    /**
    * Run all measurements on the BME688: Temperature, Pressure, Humidity & Gas Resistance.
    */
    //% subcategory="Sensors"
    //% group="Measure"
    //% blockId=kitronik_air_quality_bme688_measure_all
    //% block="measure all data readings"
    //% weight=100 blockGap=8
    export function measureData(): void {
        if (bme688InitFlag == false) {
            bme688Init()
        }

        kitronik_BME688.readDataRegisters()     // Call function in bme-688 base extension to read out all the data registers

        // Calculate the compensated reading values from the the raw ADC data
        kitronik_BME688.calcTemperature(kitronik_BME688.tRaw)
        kitronik_BME688.intCalcPressure(kitronik_BME688.pRaw)
        kitronik_BME688.intCalcHumidity(kitronik_BME688.hRaw, kitronik_BME688.tRead)
        kitronik_BME688.intCalcGasResistance(kitronik_BME688.gResRaw, kitronik_BME688.gasRange)
    }

    // A baseline gas resistance is required for the IAQ calculation - it should be taken in a well ventilated area without obvious air pollutants
    // Take 60 readings over a ~5min period and find the mean
    /**
    * Establish the baseline gas resistance reading and the ambient temperature.
    * These values are required for air quality calculations.
    */
    //% subcategory="Sensors"
    //% group="Setup"
    //% blockId=kitronik_air_quality_establish_baselines
    //% block="establish gas baseline & ambient temperature"
    //% weight=85 blockGap=8
    export function calcBaselines(): void {
        if (bme688InitFlag == false) {
            bme688Init()
        }
        if (gasInit == false) {
            setupGasSensor()
        }

        show("Setting baselines", 4, ShowAlign.Centre)

        kitronik_BME688.establishBaselines()    // Call function in bme688-base to read and calculate the baselines for gas resistance and ambient temperature

        show("Setup Complete!", 5, ShowAlign.Centre)
        basic.pause(2000)
        clear()
    }

    /**
    * Read Temperature from the sensor as a number.
    * Units for temperature are in °C (Celsius) or °F (Fahrenheit) according to selection.
    */
    //% subcategory="Sensors"
    //% group="Climate"
    //% blockId="kitronik_air_quality_read_temperature"
    //% block="Read Temperature in %temperature_unit"
    //% weight=100 blockGap=8
    export function readTemperature(temperature_unit: TemperatureUnitList): number {
        let temperature = kitronik_BME688.tRead
        // Change temperature from °C to °F if user selection requires it
        if (temperature_unit == TemperatureUnitList.F) {
            temperature = ((temperature * 18) + 320) / 10
        }

        return temperature
    }

    /**
    * Read Pressure from the sensor as a number.
    * Units for pressure are in Pa (Pascals) or mBar (millibar) according to selection.
    */
    //% subcategory="Sensors"
    //% group="Climate"
    //% blockId="kitronik_air_quality_read_pressure"
    //% block="Read Pressure in %pressure_unit"
    //% weight=95 blockGap=8
    export function readPressure(pressure_unit: PressureUnitList): number {
        let pressure = kitronik_BME688.pRead
        //Change pressure from Pascals to millibar if user selection requires it
        if (pressure_unit == PressureUnitList.mBar)
            pressure = pressure / 100

        return pressure
    }

    /**
    * Read Humidity from the sensor as a number.
    * Humidity is output as a percentage.
    */
    //% subcategory="Sensors"
    //% group="Climate"
    //% blockId="kitronik_air_quality_read_humidity"
    //% block="Read Humidity"
    //% weight=80 blockGap=8
    export function readHumidity(): number {
        return kitronik_BME688.hRead
    }

    /**
    * Read Gas Resistance from sensor as a Number.
    * Units for gas resistance are in Ohms.
    */
    //% subcategory="Sensors"
    //% group="Air Quality"
    //% blockId="kitronik_air_quality_read_gas_resistance"
    //% block="Read Gas Resistance"
    //% weight=50 blockGap=8
    export function readGasRes(): number {
        if (gasInit == false) {
            clear()
            show("ERROR", 3, ShowAlign.Centre)
            show("Gas Sensor not setup!", 5, ShowAlign.Centre)
            return 0
        }

        return kitronik_BME688.gRes
    }
    
    /**
    * Read eCO2 from sensor as a Number (250 - 40000+ppm).
    * Units for eCO2 are in ppm (parts per million).
    */
    //% subcategory="Sensors"
    //% group="Air Quality"
    //% blockId="kitronik_air_quality_read_eCO2"
    //% block="Read eCO2"
    //% weight=95 blockGap=8
    export function readeCO2(): number {
        if (gasInit == false) {
            clear()
            show("ERROR", 3, ShowAlign.Centre)
            show("Gas Sensor not setup!", 5, ShowAlign.Centre)
            return 0
        }
        kitronik_BME688.calcAirQuality()

        let eCO2 = kitronik_BME688.eCO2Value

        return eCO2
    }

    /**
    * Return the Air Quality rating as a percentage (0% = Bad, 100% = Excellent).
    */
    //% subcategory="Sensors"
    //% group="Air Quality"
    //% blockId=kitronik_air_quality_iaq_percent
    //% block="get IAQ \\%"
    //% weight=85 blockGap=8
    export function getAirQualityPercent(): number {
        if (gasInit == false) {
            clear()
            show("ERROR", 3, ShowAlign.Centre)
            show("Gas Sensor not setup!", 5, ShowAlign.Centre)
            return 0
        }
        kitronik_BME688.calcAirQuality()

        return kitronik_BME688.iaqPercent
    }
    
    /**
    * Return the Air Quality rating as an IAQ score (500 = Bad, 0 = Excellent).
    * These values are based on the BME688 datasheet, Page 11, Table 6.
    */
    //% subcategory="Sensors"
    //% group="Air Quality"
    //% blockId=kitronik_air_quality_iaq_score
    //% block="get IAQ Score"
    //% weight=100 blockGap=8
    export function getAirQualityScore(): number {
        if (gasInit == false) {
            clear()
            show("ERROR", 3, ShowAlign.Centre)
            show("Gas Sensor not setup!", 5, ShowAlign.Centre)
            return 0
        }
        kitronik_BME688.calcAirQuality()

        return kitronik_BME688.iaqScore
    }

    ///**
    //* Return the Air Quality rating as a text-based categorisation.
    //* These values are based on the BME688 datasheet, Page 11, Table 6.
    //*/
    ////% subcategory="Sensors"
    ////% group="Air Quality"
    ////% blockId=kitronik_air_quality_iaq_text
    ////% block="get air quality category"
    ////% weight=90 blockGap=8
    //export function getAirQualityText(): string {
    //    if (gasInit == false) {
    //        clear()
    //        show("ERROR", 3, ShowAlign.Centre)
    //        show("Gas Sensor not setup!", 5, ShowAlign.Centre)
    //        return "NULL"
    //    }
    //    kitronik_BME688.calcAirQuality()

    //    let airQualityRating = ""

    //    if (iaqScore <= 50) {
    //        airQualityRating = "Excellent"
    //    }
    //    else if ((iaqScore > 50) && (iaqScore <= 100)) {
    //        airQualityRating = "Good"
    //    }
    //    else if ((iaqScore > 100) && (iaqScore <= 150)) {
    //        airQualityRating = "Lightly Polluted"
    //    }
    //    else if ((iaqScore > 150) && (iaqScore <= 200)) {
    //        airQualityRating = "Moderately Polluted"
    //    }
    //    else if ((iaqScore > 200) && (iaqScore <= 250)) {
    //        airQualityRating = "Heavily Polluted"
    //    }
    //    else if ((iaqScore > 250) && (iaqScore <= 350)) {
    //        airQualityRating = "Severely Polluted"
    //    }
    //    else if (iaqScore > 350) {
    //        airQualityRating = "Extremely Polluted"
    //    }

    //    return airQualityRating
    //}    

    ////////////////////////////////
    //       DATA LOGGING         //
    ////////////////////////////////

    let NONE = 0
    let USB = 1

    let delimiter = " "

    let incDate = false
    let incTime = false
    let incTemp = false
    let incPress = false
    let incHumid = false
    let incIAQ = false
    let incCO2 = false
    let incLight = false

    let tUnit = 0
    let pUnit = 0

    let logDate = ""
    let logTime = ""
    let logTemp = 0
    let logPress = 0
    let logHumid = 0
    let logIAQ = 0
    let logCO2 = 0
    let logLight = 0

    let dataEntry = ""
    let firstDataBlock = 24
    let entryNum = 0
    let writeTitles = false
    let dataFull = false

    let entryNumber = false
    let comms = NONE

    export enum ListNumber {
        //% block="Send"
        Send,
        //% block="Don't Send"
        DontSend
    }

    export enum Separator {
        //% block="Tab"
        tab,
        //% block="Semicolon"
        semicolon,
        //% block="Comma"
        comma,
        //% block="Space"
        space
    }

    /**
     * Set the output of logged data to the micro:bit USB (default baudrate is 115200).
     */
    //% subcategory="Data Logging"
    //% group=Setup
    //% weight=100 blockGap=8
    //% blockId=kitronik_air_quality_output_to_usb
    //% block="set data output to micro:bit USB"
    export function setDataForUSB() {
        comms = USB
        serial.redirectToUSB()
    }

    /**
     * Choice of which character to put between each data entry (the default is a space).
     * @param charSelect is the choice of character to separate each entry in the log
     */
    //% subcategory="Data Logging"
    //% group=Setup
    //% weight=95 blockGap=8
    //% blockId=kitronik_air_quality_select_separator
    //% block="separate entries with %charSelect"
    export function selectSeparator(charSelect: Separator): void {
        if (charSelect == Separator.tab)
            delimiter = "\t"
        else if (charSelect == Separator.semicolon)
            delimiter = ";"
        else if (charSelect == Separator.comma)
            delimiter = ","
        else if (charSelect == Separator.space)
            delimiter = " "
    }

    /**
     * Include the date in the data logging output.
     */
    //% subcategory="Data Logging"
    //% group="Setup"
    //% weight=90 blockGap=8
    //% blockId=kitronik_air_quality_include_date
    //% block="include Date"
    export function includeDate() {
        incDate = true
    }

    /**
     * Include the time in the data logging output.
     */
    //% subcategory="Data Logging"
    //% group="Setup"
    //% weight=89 blockGap=8
    //% blockId=kitronik_air_quality_include_time
    //% block="include Time"
    export function includeTime() {
        incTime = true
    }

    /**
     * Include the temperature in the data logging output.
     * @param tempUnit is in °C (Celsius) or °F (Fahrenheit) according to selection
     */
    //% subcategory="Data Logging"
    //% group="Setup"
    //% weight=88 blockGap=8
    //% blockId=kitronik_air_quality_include_temperature
    //% block="include Temperature in %tempUnit"
    export function includeTemperature(tempUnit: TemperatureUnitList) {
        tUnit = tempUnit
        incTemp = true
    }

    /**
     * Include the presure in the data logging output.
     * @param presUnit is in Pa (Pascals) or mBar (millibar) according to selection
     */
    //% subcategory="Data Logging"
    //% group="Setup"
    //% weight=87 blockGap=8
    //% blockId=kitronik_air_quality_include_pressure
    //% block="include Pressure in %presUnit"
    export function includePressure(presUnit: PressureUnitList) {
        pUnit = presUnit
        incPress = true
    }

    /**
     * Include the humidity in the data logging output.
     */
    //% subcategory="Data Logging"
    //% group="Setup"
    //% weight=86 blockGap=8
    //% blockId=kitronik_air_quality_include_humidity
    //% block="include Humidity"
    export function includeHumidity() {
        incHumid = true
    }

    /**
     * Include the IAQ score in the data logging output.
     */
    //% subcategory="Data Logging"
    //% group="Setup"
    //% weight=85 blockGap=8
    //% blockId=kitronik_air_quality_include_iaq
    //% block="include IAQ Score"
    export function includeIAQ() {
        incIAQ = true
    }

    /**
     * Include the eCO2 in the data logging output.
     */
    //% subcategory="Data Logging"
    //% group="Setup"
    //% weight=84 blockGap=8
    //% blockId=kitronik_air_quality_include_eco2
    //% block="include eCO2"
    export function includeCO2() {
        incCO2 = true
    }

    /**
     * Include the light level in the data logging output (micro:bit LEDs cannot be used if this block is included).
     */
    //% subcategory="Data Logging"
    //% group="Setup"
    //% weight=83 blockGap=8
    //% blockId=kitronik_air_quality_include_light
    //% block="include Light Level"
    export function includeLight() {
        incLight = true
    }

    // Store the Kitronik Header and standard data column headings in the reserved metadata EEPROM blocks
    function storeTitles(): void {
        let kitronikHeader = "Kitronik Data Logger - Air Quality & Environmental Board for BBC micro:bit - www.kitronik.co.uk\r\n£"
        kitronik_EEPROM.writeBlock(kitronikHeader, 21)

        basic.pause(100)

        let headings = ""

        if (incDate) {
            headings = headings + "Date" + delimiter
        }
        if (incTime) {
            headings = headings + "Time" + delimiter
        }
        if (incTemp) {
            headings = headings + "Temperature" + delimiter
        }
        if (incPress) {
            headings = headings + "Pressure" + delimiter
        }
        if (incHumid) {
            headings = headings + "Humidity" + delimiter
        }
        if (incIAQ) {
            headings = headings + "IAQ Score" + delimiter
        }
        if (incCO2) {
            headings = headings + "eCO2" + delimiter
        }
        if (incLight) {
            headings = headings + "Light" + delimiter
        }

        headings = headings + "\r\n£"
        kitronik_EEPROM.writeBlock(headings, 23)

        basic.pause(100)

        entryNum = (kitronik_EEPROM.readByte(12 * 128) << 8) | (kitronik_EEPROM.readByte((12 * 128) + 1))              // Read from block 12 how many entries have been stored so far
        entryNum = entryNum & 0xFFF

        writeTitles = true
    }

    /**
     * Input information about the user and project in string format.
     * @param name of person carrying out data logging
     * @param subject area of the data logging project
     */
    //% subcategory="Data Logging"
    //% group="Settings"
    //% weight=80 blockGap=8
    //% blockId=kitronik_air_quality_project_info
    //% block="add project info: Name %name|Subject %subject"
    //% inlineInputMode=inline
    export function addProjectInfo(name: string, subject: string): void {
        let projectInfo = "Name: " + name + "\r\n" + "Subject: " + subject + "\r\n£"

        kitronik_EEPROM.writeBlock(projectInfo, 22)
    }

    /**
     * Captures and logs the data requested with the "include" blocks.
     */
    //% subcategory="Data Logging"
    //% group="Add Data"
    //% weight=100 blockGap=8
    //% blockId=kitronik_air_quality_log_data
    //% block="log data"
    export function logData(): void {
        if (writeTitles == false) {
            storeTitles()
        }
        
        dataEntry = ""
        
        if (incDate) {
            logDate = readDate()
            dataEntry = dataEntry + logDate + delimiter
        }
        if (incTime) {
            logTime = readTime()
            dataEntry = dataEntry + logTime + delimiter
        }
        if (incTemp) {
            logTemp = readTemperature(tUnit)
            dataEntry = dataEntry + logTemp + delimiter
        }
        if (incPress) {
            logPress = readPressure(pUnit)
            dataEntry = dataEntry + logPress + delimiter
        }
        if (incHumid) {
            logHumid = readHumidity()
            dataEntry = dataEntry + logHumid + delimiter
        }
        if (incIAQ) {
            logIAQ = getAirQualityScore()
            dataEntry = dataEntry + logIAQ + delimiter
        }
        if (incCO2) {
            logCO2 = readeCO2()
            dataEntry = dataEntry + logCO2 + delimiter
        }
        if (incLight) {
            logLight = input.lightLevel()
            dataEntry = dataEntry + logLight + delimiter
        }

        basic.pause(100)

        kitronik_EEPROM.writeBlock(dataEntry + "\r\n£", firstDataBlock + entryNum)

        basic.pause(100)

        // Store the current entry number at first bytes of block 12
        let storedEntryNum = entryNum | 0x1000
        let buf = pins.createBuffer(4)
        buf[0] = 0x06
        buf[1] = 0x00
        buf[2] = storedEntryNum >> 8
        buf[3] = storedEntryNum & 0xFF
        pins.i2cWriteBuffer(0x54, buf, false)

        if (entryNum == 999) {
            dataFull = true
            entryNum = 0
        }
        else {
            entryNum++
        }
    }
    
    /**
     * Erases all data stored on the EEPROM by writing all bytes to 0xFF (does not erase reserved area).
     */
    //% subcategory="Data Logging"
    //% group="Add Data"
    //% weight=70 blockGap=8
    //% blockId=kitronik_air_quality_erase_data
    //% block="erase all data"
    export function eraseData(): void {
        show("Erasing Memory...", 2, ShowAlign.Centre)
        let blankBlock = pins.createBuffer(130)
        let addr = 0
        let i2cAddr = 0

        for (let byte = 2; byte < 130; byte++) {
            blankBlock[byte] = 0xFF
        }
        //for (let block = firstDataBlock; block < 1024; block++) {
        for (let block = 0; block < 1024; block++) {
            addr = block * 128
            if ((addr >> 16) == 0) {                               // Select the required address (A16 as 0 or 1)
                i2cAddr = kitronik_EEPROM.CAT24_I2C_BASE_ADDR                           // A16 = 0
            }
            else {
                i2cAddr = kitronik_EEPROM.CAT24_I2C_BASE_ADDR + 1                       // A16 = 1
            }

            blankBlock[0] = (addr >> 8) & 0xFF                            // Memory location bits a15 - a8
            blankBlock[1] = addr & 0xFF                                   // Memory location bits a7 - a0

            pins.i2cWriteBuffer(i2cAddr, blankBlock, false)                    // Write the data to the correct address
            basic.pause(5)
        }

        basic.pause(100)
        // Reset number of entries stored at block 12 to '0'
        let buf = pins.createBuffer(4)
        buf[0] = 0x06
        buf[1] = 0x00
        buf[2] = 0x10
        buf[3] = 0x00
        pins.i2cWriteBuffer(0x54, buf, false)

        writeTitles = false

        clear()
        show("Memory Erase Complete", 2, ShowAlign.Centre)
        basic.pause(2500)
        clear()
    }

    /**
     * Send all the stored data via USB to a connected computer.
     * (Maximum of 1000 data entries stored)
     */
    //% subcategory="Data Logging"
    //% group="Transfer"
    //% weight=65 blockGap=8
    //% blockId=kitronik_air_quality_send_all
    //% block="transmit all data"
    export function sendAllData(): void {
        if (comms != USB) {
            serial.redirectToUSB()
        }

        let block = firstDataBlock
        let lastEntry = 0
        let header = ""
        let info = ""
        let titles = ""
        let data = ""

        header = kitronik_EEPROM.readBlock(21)
        serial.writeString(header)      // Send Kitronik Header
        info = kitronik_EEPROM.readBlock(22)
        serial.writeString(info)        // Send Project Info
        titles = kitronik_EEPROM.readBlock(23)
        serial.writeString(titles)      // Send Data Column Headings

        if (dataFull) {
            for (block = firstDataBlock; block < 1024; block++) {
                data = kitronik_EEPROM.readBlock(block)
                serial.writeString(data)
            }
        }
        else {
            let readLastEntry = (kitronik_EEPROM.readByte(12 * 128) << 8) | (kitronik_EEPROM.readByte((12 * 128) + 1))              // Read from block 12 how many entries have been stored so far
            lastEntry = readLastEntry & 0xFFF
            for (block = firstDataBlock; block < (firstDataBlock + lastEntry + 2); block++) {
                data = kitronik_EEPROM.readBlock(block)
                basic.pause(100)
                serial.writeString(data)
            }
        }
    }
}
