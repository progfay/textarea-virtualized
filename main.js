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

const indexOf = (text, target, count, offset = 0) => {
  let index = offset - 1
  for (let i = 0; i < count; i++) {
    index = text.indexOf(target, index + 1)
    if (index === -1) return -1
  }
  return index
}

const lastIndexOf = (text, target, count, offset = text.length - 1) => {
  let index = offset + 1
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

    const end = indexOf(text, '\n', ROWS * ROWS_MAG)
    const indexOfEndTextarea = end !== -1 ? end : text.length
    this.upperVirtualizedText = ''
    this.textarea.value = text.substring(0, indexOfEndTextarea)
    this.lowerVirtualizedText = text.substring(indexOfEndTextarea)

    this.selectionStart = 0
    this.selectionEnd = 0
    this.selectionAlreadyUpdated = 0

    this.upperTextareaIntersectionObserver = new IntersectionObserver(this.upperIntersectionCallback.bind(this), { root: this.container })
    this.lowerTextareaIntersectionObserver = new IntersectionObserver(this.lowerIntersectionCallback.bind(this), { root: this.container })

    this.textarea.addEventListener('select', this.onSelect.bind(this))
    this.textarea.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  upperIntersectionCallback (entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) return
      if (this.upperVirtualizedText === '') return
      const start = lastIndexOf(this.upperVirtualizedText, '\n', MARGINS * MARGINS_MAG)
      const indexOfStartTextarea = start !== -1 ? start : 0
      const text = this.upperVirtualizedText.substring(indexOfStartTextarea) + this.textarea.value
      this.upperVirtualizedText = this.upperVirtualizedText.substring(0, indexOfStartTextarea)
      const end = indexOf(text, '\n', ROWS * ROWS_MAG)
      const indexOfEndTextarea = end !== -1 ? end : text.length
      this.textarea.value = text.substring(0, indexOfEndTextarea)
      this.lowerVirtualizedText = text.substring(indexOfEndTextarea) + this.lowerVirtualizedText
      this.container.scrollBy(0, this.lineHeight * MARGINS * MARGINS_MAG)
      this.textarea.scrollTo(0, 0)
      this.textarea.selectionStart = Math.min(Math.max(this.selectionStart - this.upperVirtualizedText.length, 0), this.textarea.value.length)
      this.textarea.selectionEnd = Math.min(Math.max(this.selectionEnd - this.upperVirtualizedText.length, 0), this.textarea.value.length)
      this.selectionAlreadyUpdated += 2
      return
    }
  }

  lowerIntersectionCallback (entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) return
      if (this.lowerVirtualizedText === '') return
      const end = indexOf(this.lowerVirtualizedText, '\n', MARGINS * MARGINS_MAG)
      const indexOfEndTextarea = end !== -1 ? end : this.lowerVirtualizedText.length
      const text = this.textarea.value + this.lowerVirtualizedText.substring(0, indexOfEndTextarea)
      this.lowerVirtualizedText = this.lowerVirtualizedText.substring(indexOfEndTextarea)
      const start = lastIndexOf(text, '\n', ROWS * ROWS_MAG)
      const indexOfStartTextarea = start !== -1 ? start : 0
      this.textarea.value = text.substring(indexOfStartTextarea)
      this.upperVirtualizedText = this.upperVirtualizedText + text.substring(0, indexOfStartTextarea)
      this.container.scrollBy(0, -1 * this.lineHeight * (MARGINS * MARGINS_MAG - 1))
      this.textarea.scrollBy(0, this.lineHeight)
      this.textarea.selectionStart = Math.min(Math.max(this.selectionStart - this.upperVirtualizedText.length, 0), this.textarea.value.length)
      this.textarea.selectionEnd = Math.min(Math.max(this.selectionEnd - this.upperVirtualizedText.length, 0), this.textarea.value.length)
      this.selectionAlreadyUpdated += 2
      return
    }
  }

  onSelect (event) {
    if (this.selectionAlreadyUpdated > 0) {
      this.selectionAlreadyUpdated--
      return
    }

    switch (this.textarea.selectionDirection) {
      case 'forward':
        this.selectionEnd = this.upperVirtualizedText.length + this.textarea.selectionEnd
        break
      case 'backward':
        this.selectionStart = this.upperVirtualizedText.length + this.textarea.selectionStart
        break
      case 'none':
        this.selectionStart = this.upperVirtualizedText.length + this.textarea.selectionStart
        this.selectionEnd = this.upperVirtualizedText.length + this.textarea.selectionEnd
        break
      default:
        break
    }
  }

  onKeyDown (event) {
    if (event.metaKey) {
      this.onKeyDownWithMetaKey(event)
      return
    }

    switch (event.key) {
      case 'ArrowLeft': {
        if (this.selectionStart === this.selectionEnd) return
        event.preventDefault()
        const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
        const start = lastIndexOf(text, '\n', Math.floor(ROWS * ROWS_MAG * 0.5), this.selectionStart)
        const indexOfStartTextarea = start !== -1 ? start : 0
        const end = indexOf(text, '\n', ROWS * ROWS_MAG, indexOfStartTextarea)
        const indexOfEndTextarea = end !== -1 ? end : 0
        this.upperVirtualizedText = text.substring(0, indexOfStartTextarea)
        this.textarea.value = text.substring(indexOfStartTextarea, indexOfEndTextarea)
        this.lowerVirtualizedText = text.substring(indexOfEndTextarea)
        this.textarea.selectionStart = this.selectionStart - this.upperVirtualizedText.length
        this.textarea.selectionEnd = this.textarea.selectionStart
        this.selectionStart = this.textarea.selectionStart
        this.selectionEnd = this.textarea.selectionEnd
        this.container.scrollTo(0, this.lineHeight * Math.floor((this.textarea.value.substring(0, this.textarea.selectionStart).match(/\n/g) || []).length - ROWS * 0.5))
        this.textarea.scrollTo(0, 0)
        break
      }

      case 'ArrowRight': {
        if (this.selectionStart === this.selectionEnd) return
        event.preventDefault()
        const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
        const end = indexOf(text, '\n', Math.floor(ROWS * ROWS_MAG * 0.5), this.selectionEnd)
        const indexOfEndTextarea = end !== -1 ? end : text.length
        const start = lastIndexOf(text, '\n', ROWS * ROWS_MAG, indexOfEndTextarea)
        const indexOfStartTextarea = start !== -1 ? start : 0
        this.upperVirtualizedText = text.substring(0, indexOfStartTextarea)
        this.textarea.value = text.substring(indexOfStartTextarea, indexOfEndTextarea)
        this.lowerVirtualizedText = text.substring(indexOfEndTextarea)
        this.textarea.selectionEnd = this.selectionEnd - this.upperVirtualizedText.length
        this.textarea.selectionStart = this.textarea.selectionEnd
        this.selectionStart = this.textarea.selectionStart
        this.selectionEnd = this.textarea.selectionEnd
        this.container.scrollTo(0, this.lineHeight * Math.floor((this.textarea.value.substring(0, this.textarea.selectionStart).match(/\n/g) || []).length - ROWS * 0.5))
        this.textarea.scrollTo(0, this.lineHeight)
        break
      }

      default:
        break
    }
  }

  onKeyDownWithMetaKey (event) {
    switch (event.key) {
      case 'a': {
        this.selectionStart = 0
        this.selectionEnd = this.upperVirtualizedText.length + this.textarea.value.length + this.lowerVirtualizedText.length
        break
      }

      case 'ArrowUp': {
        this.selectionStart = 0
        this.selectionEnd = event.shiftKey
          ? this.upperVirtualizedText.length + this.textarea.selectionEnd
          : 0
        const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
        const end = indexOf(text, '\n', ROWS * ROWS_MAG)
        const indexOfEndTextarea = end !== -1 ? end : text.length
        this.textarea.value = text.substring(0, indexOfEndTextarea)
        this.upperVirtualizedText = ''
        this.lowerVirtualizedText = text.substring(index)
        this.container.scrollTo(0, 0)
        this.textarea.scrollTo(0, 0)
        this.textarea.selectionStart = this.selectionStart
        this.textarea.selectionEnd = event.shiftKey
          ? Math.min(this.selectionEnd - this.upperVirtualizedText.length, this.textarea.value.length)
          : 0
        this.selectionAlreadyUpdated += 2
        break
      }

      case 'ArrowDown': {
        this.selectionStart = event.shiftKey
          ? this.upperVirtualizedText.length + this.textarea.selectionStart
          : this.upperVirtualizedText.length + this.textarea.value.length + this.lowerVirtualizedText.length
        this.selectionEnd = this.upperVirtualizedText.length + this.textarea.value.length + this.lowerVirtualizedText.length
        const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
        const start = lastIndexOf(text, '\n', ROWS * ROWS_MAG)
        const indexOfStartTextarea = start !== -1 ? start : 0
        this.textarea.value = text.substring(indexOfStartTextarea)
        this.upperVirtualizedText = text.substring(0, indexOfStartTextarea)
        this.lowerVirtualizedText = ''
        this.container.scrollTo(0, this.lineHeight * (ROWS * ROWS_MAG))
        this.textarea.scrollBy(0, this.lineHeight)
        this.textarea.selectionStart = event.shiftKey
          ? Math.max(this.selectionStart - this.upperVirtualizedText.length, 0)
          : this.textarea.value.length
        this.textarea.selectionEnd = this.textarea.value.length
        this.selectionAlreadyUpdated += 2
        break
      }

      case 'ArrowLeft': {
        if (this.selectionStart === this.selectionEnd) return
        const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
        const selectionStartLineTail = text.lastIndexOf('\n', this.selectionStart)
        this.selectionStart = selectionStartLineTail !== -1 ? selectionStartLineTail : 0
        this.selectionEnd = this.selectionStart
        const start = lastIndexOf(text, '\n', Math.floor(ROWS * ROWS_MAG * 0.5), this.selectionStart)
        const indexOfStartTextarea = start === -1 ? start : 0
        const end = indexOf(text, '\n', ROWS * ROWS_MAG, indexOfStartTextarea)
        const indexOfEndTextarea = end !== -1 ? end : text.length
        this.upperVirtualizedText = text.substring(0, indexOfStartTextarea)
        this.textarea.value = text.substring(indexOfStartTextarea, indexOfEndTextarea)
        this.lowerVirtualizedText = text.substring(indexOfEndTextarea)
        this.textarea.selectionStart = this.selectionStart - this.upperVirtualizedText.length
        this.textarea.selectionEnd = this.textarea.selectionStart
        this.container.scrollTo(0, this.lineHeight * Math.floor((this.textarea.value.substring(0, this.textarea.selectionStart).match(/\n/g) || []).length - ROWS * 0.5))
        this.textarea.scrollTo(0, 0)
        break
      }

      case 'ArrowRight': {
        if (this.selectionStart === this.selectionEnd) return
        const text = this.upperVirtualizedText + this.textarea.value + this.lowerVirtualizedText
        const selectionStartLineTail = text.indexOf('\n', this.selectionStart)
        this.selectionStart = selectionStartLineTail !== -1 ? selectionStartLineTail : (this.upperVirtualizedText.length + this.textarea.value.length)
        this.selectionEnd = this.selectionStart
        const start = lastIndexOf(text, '\n', Math.floor(ROWS * ROWS_MAG * 0.5), this.selectionStart)
        const indexOfStartTextarea = start !== -1 ? start : 0
        const end = indexOf(text, '\n', ROWS * ROWS_MAG, indexOfStartTextarea)
        const indexOfEndTextarea = end !== -1 ? end : text.length
        this.upperVirtualizedText = text.substring(0, indexOfStartTextarea)
        this.textarea.value = text.substring(indexOfStartTextarea, indexOfEndTextarea)
        this.lowerVirtualizedText = text.substring(indexOfEndTextarea)
        this.textarea.selectionStart = this.selectionStart - this.upperVirtualizedText.length
        this.textarea.selectionEnd = this.textarea.selectionStart
        this.container.scrollTo(0, this.lineHeight * Math.floor((this.textarea.value.substring(0, this.textarea.selectionStart).match(/\n/g) || []).length - ROWS * 0.5))
        this.textarea.scrollTo(0, 0)
        break
      }

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
