import CustomElement from '../lib/slot-mixin.mjs'

export default class SlotHeader extends CustomElement {
  constructor() {
    super()
    this.heading = ''
    this.header = this.querySelector('h1')
  }

  render({ html, state }) {
    const { attrs = {} } = state
    const { heading = 'default' } = attrs
    return html`
      <style>
        :host {
          color: red;
        }
        p, div {
          color: purple;
        }
        @media screen and (min-width: 48em) {
          p {
            color: orange;
          }
        }
      </style>
      <h1>${heading}</h1>
      <div>Unnamed Slot: <slot>def-unname-slot</slot></div>
      <div>Slot#1: <slot name="slot1">def-slot1</slot></div>
      <p>Inner Text</p>
    `
  }

  static get observedAttributes() {
    return ['heading']
  }

  headingChanged(value) {
    this.header.textContent = value
  }
}

export const render = SlotHeader.prototype.render;

customElements.define('slot-header', SlotHeader)
