/* global HTMLElement IntersectionObserver customElements */

const ROWS = 30
const ROWS_MAG = 10 // > 1.0
const MARGINS = 10 // < ROWS
const MARGINS_MAG = 3 // > 1.0
const LINE_HEIGHT = 1.2 // rem (default value)

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
  constructor () {
    super()

    this.lineHeight = LINE_HEIGHT

    this.shadow = this.attachShadow({ mode: 'closed' })
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
        height: ${ROWS * this.lineHeight}rem;
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
        top: calc(100% * ${MARGINS} / ${ROWS});
        background-color: rgb(255, 0, 0);
      }

      #lower {
        bottom: calc(100% * ${MARGINS} / ${ROWS});
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
    this.textarea.setAttribute('rows', ROWS * ROWS_MAG)
    this.container.appendChild(this.textarea)

    this.lower = document.createElement('div')
    this.lower.setAttribute('id', 'lower')
    this.container.appendChild(this.lower)

    // const text = this.value
    // const text = text // (use global variable)

    const index = indexOf(text, '\n', ROWS * ROWS_MAG)
    this.upperVirtualizedText = ''
    this.textarea.value = text.substring(0, index)
    this.lowerVirtualizedText = text.substring(index)

    this.selectionStart = 0
    this.selectionEnd = 0

    this.upperTextareaIntersectionObserver = new IntersectionObserver(this.upperIntersectionCallback.bind(this), { root: this.container })
    this.lowerTextareaIntersectionObserver = new IntersectionObserver(this.lowerIntersectionCallback.bind(this), { root: this.container })

    this.textarea.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  upperIntersectionCallback (entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) return
      if (this.upperVirtualizedText === '') return
      const upperIndex = lastIndexOf(this.upperVirtualizedText, '\n', MARGINS * MARGINS_MAG)
      const text = (upperIndex !== -1 ? this.upperVirtualizedText.substring(upperIndex) : this.upperVirtualizedText) + this.textarea.value
      this.upperVirtualizedText = upperIndex !== -1 ? this.upperVirtualizedText.substring(0, upperIndex) : ''
      const index = indexOf(text, '\n', ROWS * ROWS_MAG)
      this.textarea.value = text.substring(0, index)
      this.lowerVirtualizedText = text.substring(index) + this.lowerVirtualizedText
      this.container.scrollBy(0, this.lineHeight * MARGINS * MARGINS_MAG)
      this.textarea.scrollBy(0, -1 * this.lineHeight)
      this.textarea.selectionStart = Math.min(Math.max(this.selectionStart - this.upperVirtualizedText.length, 0), this.textarea.value.length)
      this.textarea.selectionEnd = Math.min(Math.max(this.selectionEnd - this.upperVirtualizedText.length, 0), this.textarea.value.length)
      return
    }
  }

  lowerIntersectionCallback (entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) return
      if (this.lowerVirtualizedText === '') return
      const lowerIndex = indexOf(this.lowerVirtualizedText, '\n', MARGINS * MARGINS_MAG)
      const text = this.textarea.value + (lowerIndex !== -1 ? this.lowerVirtualizedText.substring(0, lowerIndex) : this.lowerVirtualizedText)
      this.lowerVirtualizedText = lowerIndex !== -1 ? this.lowerVirtualizedText.substring(lowerIndex) : ''
      const index = lastIndexOf(text, '\n', ROWS * ROWS_MAG)
      this.textarea.value = text.substring(index)
      this.upperVirtualizedText = this.upperVirtualizedText + text.substring(0, index)
      this.container.scrollBy(0, -1 * this.lineHeight * (MARGINS * MARGINS_MAG - 1))
      this.textarea.scrollBy(0, this.lineHeight)
      this.textarea.selectionStart = Math.min(Math.max(this.selectionStart - this.upperVirtualizedText.length, 0), this.textarea.value.length)
      this.textarea.selectionEnd = Math.min(Math.max(this.selectionEnd - this.upperVirtualizedText.length, 0), this.textarea.value.length)
      return
    }
  }

  onKeyDown (event) {
    switch (event.key) {
      case 'a':
        if (event.metaKey) {
          this.selectionStart = 0
          this.selectionEnd = this.upperVirtualizedText.length + this.textarea.value.length + this.lowerVirtualizedText.length
        }
        break

      case 'ArrowUp':
        if (event.metaKey) {
          this.selectionStart = 0
          this.selectionEnd = event.shiftKey
            ? this.upperVirtualizedText.length + this.textarea.selectionEnd
            : 0
          const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
          const index = indexOf(text, '\n', ROWS * ROWS_MAG)
          this.textarea.value = index !== -1 ? text.substring(0, index) : text
          this.upperVirtualizedText = ''
          this.lowerVirtualizedText = index !== -1 ? text.substring(index) : ''
          this.container.scrollTo(0, 0)
          this.textarea.scrollTo(0, 0)
          this.textarea.selectionStart = this.selectionStart
          this.textarea.selectionEnd = event.shiftKey
            ? Math.min(this.selectionEnd - this.upperVirtualizedText.length, this.textarea.value.length)
            : 0
        }
        break

      case 'ArrowDown':
        if (event.metaKey) {
          this.selectionStart = event.shiftKey
            ? this.upperVirtualizedText.length + this.textarea.selectionStart
            : this.upperVirtualizedText.length + this.textarea.value.length + this.lowerVirtualizedText.length
          this.selectionEnd = this.upperVirtualizedText.length + this.textarea.value.length + this.lowerVirtualizedText.length
          const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
          const index = lastIndexOf(text, '\n', ROWS * ROWS_MAG)
          this.textarea.value = index !== -1 ? text.substring(index) : text
          this.upperVirtualizedText = index !== -1 ? text.substring(0, index) : ''
          this.lowerVirtualizedText = ''
          this.container.scrollTo(0, this.lineHeight * (ROWS * ROWS_MAG))
          this.textarea.scrollBy(0, this.lineHeight)
          this.textarea.selectionStart = event.shiftKey
            ? Math.max(this.selectionStart - this.upperVirtualizedText.length, 0)
            : this.textarea.value.length
          this.textarea.selectionEnd = this.textarea.value.length
        }
        break

      default:
        break
    }
  }

  connectedCallback () {
    this.lineHeight = this.textarea.getBoundingClientRect().height / (ROWS * ROWS_MAG)
    this.container.style.setProperty('height', `${ROWS * this.lineHeight}px`)
    this.upperTextareaIntersectionObserver.observe(this.upper)
    this.lowerTextareaIntersectionObserver.observe(this.lower)
  }
}

customElements.define('textarea-virtualized', TextareaVirtualized)
