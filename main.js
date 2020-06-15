const LINE_COUNTS = 100000

class TextareaVirtualized extends HTMLElement {
  ROWS = 30
  ROWS_MAG = 10 // > 1.0
  MARGINS_MAG = 2 // > 1.0
  MARGINS = 10
  LINE_HEIGHT = 1.2 // rem

  constructor () {
    super()

    this.shadow = this.attachShadow({mode: 'open'})
    const style = document.createElement('style')
    style.textContent = `
      * {
        padding: 0;
        margin: 0;
        resize: none;
        border: none;
        outline: none;
      }

      #container {
        overflow-x: hidden;
        overflow-y: scroll;
        border: solid 1px black;
        height: ${this.ROWS * this.LINE_HEIGHT}rem;
      }

      #container::-webkit-scrollbar {
        display: none;
      }

      textarea {
        width: 100%;
        overflow: hidden;
        vertical-align: top;
      }

      #upper {
        background-color: rgba(255, 0, 0, 0.1);
      }

      #middle {
        background-color: rgba(0, 255, 0, 0.1);
      }

      #lower {
        background-color: rgba(0, 0, 255, 0.1);
      }
    `
    this.shadow.appendChild(style)

    this.container = document.createElement('div')
    this.container.setAttribute('id', 'container')
    this.shadow.appendChild(this.container)

    this.upper = document.createElement('textarea')
    this.upper.setAttribute('id', 'upper')
    this.upper.setAttribute('rows', this.MARGINS)
    this.container.appendChild(this.upper)

    this.middle = document.createElement('textarea')
    this.middle.setAttribute('id', 'middle')
    this.middle.setAttribute('rows', this.ROWS * this.ROWS_MAG)
    this.container.appendChild(this.middle)

    this.lower = document.createElement('textarea')
    this.lower.setAttribute('id', 'lower')
    this.lower.setAttribute('rows', this.MARGINS)
    this.container.appendChild(this.lower)

    // const lines = this.value.split('\n')
    const padLength = Math.log10(LINE_COUNTS) + 1
    const lines = new Array(LINE_COUNTS).fill('').map((_, i) => i.toString().padStart(padLength, '0'))

    const upperLines = lines.splice(0, this.MARGINS)
    const middleLines = lines.splice(0, this.ROWS * this.ROWS_MAG)
    const lowerLines = lines.splice(0, this.MARGINS)
    this.topVirtualizedLines = []
    this.bottomVirtualizedLines = lines

    this.upper.value = upperLines.join('\n')
    this.middle.value = middleLines.join('\n')
    this.lower.value = lowerLines.join('\n')

    this.upperTextareaIntersectionObserver = new IntersectionObserver(this.upperIntersectionCallback.bind(this), { root: this.container })
    this.lowerTextareaIntersectionObserver = new IntersectionObserver(this.lowerIntersectionCallback.bind(this), { root: this.container })
  }

  upperIntersectionCallback(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) return
      if (this.topVirtualizedLines.length === 0) return
      const lines = this.topVirtualizedLines.splice(-this.MARGINS * 2, this.MARGINS * 2).concat(
        this.upper.value.split('\n'),
        this.middle.value.split('\n'),
        this.lower.value.split('\n')
      )
      this.upper.value = lines.splice(0, this.MARGINS).join('\n')
      this.middle.value = lines.splice(0, this.ROWS * this.ROWS_MAG).join('\n')
      this.lower.value = lines.splice(0, this.MARGINS).join('\n')
      this.bottomVirtualizedLines = lines.concat(this.bottomVirtualizedLines)
      this.container.scrollBy(0, entry.boundingClientRect.height * 2)
    }
  }

  lowerIntersectionCallback(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) return
      if (this.bottomVirtualizedLines.length === 0) return
      const lines = [].concat(
        this.upper.value.split('\n'),
        this.middle.value.split('\n'),
        this.lower.value.split('\n'),
        this.bottomVirtualizedLines.splice(0, this.MARGINS * 2)
      )
      this.lower.value = lines.splice(-this.MARGINS, this.MARGINS).join('\n')
      this.middle.value = lines.splice(-this.ROWS * this.ROWS_MAG, this.ROWS * this.ROWS_MAG).join('\n')
      this.upper.value = lines.splice(-this.MARGINS, this.MARGINS).join('\n')
      this.topVirtualizedLines = this.topVirtualizedLines.concat(lines)
      this.container.scrollBy(0, -entry.boundingClientRect.height * 2)
    }
  }

  connectedCallback() {
    this.upperTextareaIntersectionObserver.observe(this.upper)
    this.lowerTextareaIntersectionObserver.observe(this.lower)
  }
}

customElements.define('textarea-virtualized', TextareaVirtualized)

const padLength = Math.log10(LINE_COUNTS) + 1
const lines = new Array(LINE_COUNTS).fill('').map((_, i) => i.toString().padStart(padLength, '0'))
document.getElementById('textarea-original').value = lines.join('\n')
