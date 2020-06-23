const LINE_COUNTS = 10000
const padLength = Math.log10(LINE_COUNTS) + 1
const text = new Array(LINE_COUNTS).fill('').map((_, i) => i.toString().padStart(padLength, '0')).join('\n')
document.getElementById('textarea-original').value = text

const indexOf = (text, target, count) => {
  let index = -1
    for (let i = 0; i < count; i++) {
      index = text.indexOf(target, index + 1)
      if (index === -1) return -1
    }
    return index
}

const lastIndexOf = (text, target, count) => {
  let index = text.length
    for (let i = 0; i < count; i++) {
      index = text.lastIndexOf(target, index - 1)
      if (index === -1) return -1
    }
    return index
}

class TextareaVirtualized extends HTMLElement {
  ROWS = 30
  ROWS_MAG = 10 // > 1.0
  MARGINS = 10 // < ROWS
  MARGINS_MAG = 3 // > 1.0
  LINE_HEIGHT = 1.2 // rem (default or callback)

  constructor () {
    super()

    this.shadow = this.attachShadow({mode: 'closed'})
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

      #textarea {
        width: 100%;
        overflow: hidden;
        vertical-align: top;
      }

      #upper, #lower {
        width: 100%;
        height: 1px;
        position: relative;
      }

      #upper {
        top: calc(100% * ${this.MARGINS} / ${this.ROWS});
        background-color: rgb(255, 0, 0);
      }

      #lower {
        bottom: calc(100% * ${this.MARGINS} / ${this.ROWS});
        background-color: rgb(0, 0, 255);
      }
    `
    this.shadow.appendChild(style)

    this.container = document.createElement('div')
    this.container.setAttribute('id', 'container')
    this.shadow.appendChild(this.container)

    this.upper = document.createElement('div')
    this.upper.setAttribute('id', 'upper')
    this.container.appendChild(this.upper)

    this.textarea = document.createElement('textarea')
    this.textarea.setAttribute('id', 'textarea')
    this.textarea.setAttribute('rows', this.ROWS * this.ROWS_MAG)
    this.container.appendChild(this.textarea)

    this.lower = document.createElement('div')
    this.lower.setAttribute('id', 'lower')
    this.container.appendChild(this.lower)

    // const text = this.value
    // const text = text // (use global variable)

    const index = indexOf(text, '\n', this.ROWS * this.ROWS_MAG)
    this.upperVirtualizedText = ''
    this.textarea.value = text.substring(0, index)
    this.lowerVirtualizedText = text.substring(index)

      this.selectionStart = 0
      this.selectionEnd = 0

    this.upperTextareaIntersectionObserver = new IntersectionObserver(this.upperIntersectionCallback.bind(this), { root: this.container })
    this.lowerTextareaIntersectionObserver = new IntersectionObserver(this.lowerIntersectionCallback.bind(this), { root: this.container })

    this.textarea.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  upperIntersectionCallback(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) return
      if (this.upperVirtualizedText === '') return
      const upperIndex = lastIndexOf(this.upperVirtualizedText, '\n', this.MARGINS * this.MARGINS_MAG)
      const text = (upperIndex !== -1 ? this.upperVirtualizedText.substring(upperIndex) : this.upperVirtualizedText) + this.textarea.value
      this.upperVirtualizedText = upperIndex !== -1 ? this.upperVirtualizedText.substring(0, upperIndex) : ''
      const index = indexOf(text, '\n', this.ROWS * this.ROWS_MAG)
      this.textarea.value = text.substring(0, index)
      this.lowerVirtualizedText = text.substring(index) + this.lowerVirtualizedText
      this.container.scrollBy(0, this.LINE_HEIGHT * this.MARGINS * this.MARGINS_MAG)
      this.textarea.scrollBy(0, -1 * this.LINE_HEIGHT)
      return
    }
  }

  lowerIntersectionCallback(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) return
      if (this.lowerVirtualizedText === '') return
      const lowerIndex = indexOf(this.lowerVirtualizedText, '\n', this.MARGINS * this.MARGINS_MAG)
      const text = this.textarea.value + (lowerIndex !== -1 ? this.lowerVirtualizedText.substring(0, lowerIndex) : this.lowerVirtualizedText)
      this.lowerVirtualizedText = lowerIndex !== -1 ? this.lowerVirtualizedText.substring(lowerIndex) : ''
      const index = lastIndexOf(text, '\n', this.ROWS * this.ROWS_MAG)
      this.textarea.value = text.substring(index)
      this.upperVirtualizedText = this.upperVirtualizedText + text.substring(0 ,index)
      this.container.scrollBy(0, -1 * this.LINE_HEIGHT * (this.MARGINS * this.MARGINS_MAG - 1))
      this.textarea.scrollBy(0, this.LINE_HEIGHT)
      return
    }
  }

  onKeyDown(event) {
    switch (event.key) {
      case 'ArrowUp':
        if (event.metaKey) {
          this.selectionStart = this.upperVirtualizedText.length + this.textarea.selectionStart
          this.selectionEnd = this.upperVirtualizedText.length + this.textarea.selectionEnd
          const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
          const index = indexOf(text, '\n', this.ROWS * this.ROWS_MAG)
          this.textarea.value = index !== -1 ? text.substring(0, index) : text
          this.upperVirtualizedText = ''
          this.lowerVirtualizedText = index !== -1 ? text.substring(index) : ''
        }
        return

      case 'ArrowDown':
        if (event.metaKey) {
          this.selectionStart = this.upperVirtualizedText.length + this.textarea.selectionStart
          this.selectionEnd = this.upperVirtualizedText.length + this.textarea.selectionEnd
          const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
          const index = lastIndexOf(text, '\n', this.ROWS * this.ROWS_MAG)
          this.textarea.value = index !== -1 ? text.substring(index) : text
          this.upperVirtualizedText = index !== -1 ? text.substring(0, index) : ''
          this.lowerVirtualizedText = ''
        }
        return

        default:
        return
    }
  }

  connectedCallback() {
    this.LINE_HEIGHT = this.textarea.getBoundingClientRect().height / (this.ROWS * this.ROWS_MAG)
    this.container.style.setProperty('height', `${this.ROWS * this.LINE_HEIGHT}px`)
    this.upperTextareaIntersectionObserver.observe(this.upper)
    this.lowerTextareaIntersectionObserver.observe(this.lower)
  }
}

customElements.define('textarea-virtualized', TextareaVirtualized)
