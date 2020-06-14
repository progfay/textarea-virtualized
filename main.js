class TextareaVirtualized extends HTMLTextAreaElement {
  ROWS = 15
  MARGINS = 5
  above = []
  lines = []
  bottom = []
  lineHeight = 0
  previousScrollTop = 0

  constructor () {
    super()
    this.style.setProperty('resize', 'none')
    this.setAttribute('rows', this.ROWS)

    // const _lines = this.value.split('\n')
    const _lines = new Array(100).fill('').map((_, i) => i.toString().padStart(4, '0'))

    this.above = []
    this.lines = _lines.splice(0, this.ROWS + this.MARGINS)
    this.bottom = _lines

    this.lineHeight = Math.floor(this.getBoundingClientRect().height / this.ROWS)
    this.value = this.lines.join('\n')
    this.onScroll = this.onScroll.bind(this)
    this.previousScrollTop = this.scrollTop
    this.addEventListener('scroll', this.onScroll)
  }

  onScroll(event) {
    if (this.scrollTop === this.previousScrollTop) return
    const direction = this.scrollTop < this.previousScrollTop ? 'UP' : 'DOWN'
    this.previousScrollTop = this.scrollTop

    if (direction === 'UP') {
      // scroll up
      if (Math.floor(this.scrollTop / this.lineHeight) > 0) return

      if (this.above.length <= 0) {
        return
      } else if (this.above.length < this.MARGINS) {
        const len = this.above.length
        this.lines = this.above.concat(this.value.split('\n'))
        this.above = []
        this.bottom = this.lines.splice(-len, len).concat(this.bottom)
        this.value = this.lines.join('\n')
        this.previousScrollTop = this.lineHeight * (len + 1)
        this.scrollTo({
          top: this.lineHeight * (len + 1)
        })
      } else {
        const len = this.MARGINS - 1
        this.lines = this.above.splice(-len, len).concat(this.value.split('\n'))
        this.bottom = this.lines.splice(-len, len).concat(this.bottom)
        this.value = this.lines.join('\n')
        this.previousScrollTop += this.lineHeight * (len + 1)
        this.scrollTo({
          top: this.scrollTop + this.lineHeight * (len + 1)
        })
      }
    } else {
      // scroll down
      if (Math.ceil(this.scrollTop / this.lineHeight) < this.MARGINS) return

      if (this.bottom.length <= 0) {
        return
      } else if (this.bottom.length < this.MARGINS) {
        const len = this.bottom.length
        this.lines = this.value.split('\n').concat(this.bottom)
        this.bottom = []
        this.above = this.above.concat(this.lines.splice(0, len))
        this.value = this.lines.join('\n')
        this.previousScrollTop = 0
        this.scrollTo({
          top: 0
        })
      } else {
        const len = this.MARGINS - 1
        this.lines = this.value.split('\n').concat(this.bottom.splice(0, len))
        this.above = this.above.concat(this.lines.splice(0, len))
        this.value = this.lines.join('\n')
        this.previousScrollTop -= this.lineHeight * (len + 1)
        this.scrollTo({
          top: this.scrollTop - this.lineHeight * (len + 1)
        })
      }
    }
  }
}

customElements.define('textarea-virtualized', TextareaVirtualized, { extends: 'textarea' })
