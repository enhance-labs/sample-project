import BaseElement from '@enhance-labs/base-element'
import TemplateMixin from '@enhance/template-mixin'
//import CustomElementMixin from '@enhance-labs/custom-element-mixin'


// export const SlotMixin = (superclass) => class extends superclass {
//   connectedCallback() {
//     if (super.connectedCallback) super.connectedCallback()
//     const fragment = document.createElement('div')
//     fragment.innerHTML = this.innerHTML
//     fragment.attachShadow({ mode: 'open' }).appendChild(
//       this.template.content.cloneNode(true)
//     )

//     const children = Array.from(fragment.childNodes)
//     let unnamedSlot = {}
//     let namedSlots = {}

//     children.forEach(child => {
//       const slot = child.assignedSlot
//       if (slot) {
//         if (slot.name) {
//           if (!namedSlots[slot.name]) namedSlots[slot.name] = { slotNode: slot, contentToSlot: [] }
//           namedSlots[slot.name].contentToSlot.push(child)
//         } else {
//           if (!unnamedSlot["slotNode"]) unnamedSlot = { slotNode: slot, contentToSlot: [] }
//           unnamedSlot.contentToSlot.push(child.innerHTML || child.textContent || '')
//         }
//       }
//     })

//     // Named Slots
//     Object.entries(namedSlots).forEach(([name, slot]) => {
//       slot.slotNode.after(...namedSlots[name].contentToSlot)
//       slot.slotNode.remove()
//     })

//     // Unnamed Slot
//     unnamedSlot.slotNode.replaceWith(unnamedSlot.contentToSlot.join(''))

//     // Unused slots and default content 
//     const unfilledSlots = Array.from(fragment.shadowRoot.querySelectorAll('slot'))
//     unfilledSlots.forEach(slot => {
//       slot.after(...slot.childNodes)
//       slot.remove()
//     })

//     this.innerHTML = fragment.shadowRoot.innerHTML
//   }
// }

function expandSlots(here) {
  console.log('expandSlots called')
  const fragment = document.createElement('div')
  fragment.innerHTML = here.innerHTML
  fragment.attachShadow({ mode: 'open' }).appendChild(
    here.template.content.cloneNode(true)
  )

  const children = Array.from(fragment.childNodes)
  let unnamedSlot = {}
  let namedSlots = {}

  children.forEach(child => {
    const slot = child.assignedSlot
    if (slot) {
      if (slot.name) {
        if (!namedSlots[slot.name]) namedSlots[slot.name] = { slotNode: slot, contentToSlot: [] }
        namedSlots[slot.name].contentToSlot.push(child)
      } else {
        if (!unnamedSlot["slotNode"]) unnamedSlot = { slotNode: slot, contentToSlot: [] }
        unnamedSlot.contentToSlot.push(child.innerHTML || child.textContent || '')
      }
    }
  })

  // Named Slots
  Object.entries(namedSlots).forEach(([name, slot]) => {
    slot.slotNode.after(...namedSlots[name].contentToSlot)
    slot.slotNode.remove()
  })

  // Unnamed Slot
  unnamedSlot.slotNode?.replaceWith(unnamedSlot?.contentToSlot.join(''))

  // Unused slots and default content 
  const unfilledSlots = Array.from(fragment.shadowRoot.querySelectorAll('slot'))
  unfilledSlots.forEach(slot => {
    slot.after(...slot.childNodes)
    slot.remove()
  })

  here.innerHTML = fragment.shadowRoot.innerHTML
}

// Mixin specifically for reusing SFCs as Custom Elements in the browser
const CustomElementMixin = (superclass) => class extends superclass {
  constructor() {
    super()
    // Removes style tags as they are already inserted into the head by SSR
    // TODO: If only added dynamically in the browser we need to insert the style tag after running the style transform on it. As well as handle deduplication.
    let tagName = customElements.getName(this.constructor)
    this.template.content.querySelectorAll('style')
      .forEach((tag) => {
        const rules = this.rulesForCssText(tag.textContent)
        // console.log(rules)

        const sheet = new CSSStyleSheet();
        for (let rule of rules) {
          if (rule.conditionText) {
            let selectorText = ''
            for (let innerRule of rule.cssRules) {
              let selectors = innerRule.selectorText.split(',')
              selectorText = selectors.map(selector => {
                if (selector.startsWith(':host')) {
                  let a = selector.replace(':host', tagName)
                  return innerRule.cssText.replace(innerRule.selectorText, a)
                } else {
                  let a = `${tagName} ${selector}`
                  return innerRule.cssText.replace(innerRule.selectorText, a)
                }
              }).join(',')
            }
            // console.log(`${rule.media ? '@media' : ''} ${rule.conditionText} { ${selectorText}}`)
            sheet.insertRule(`${rule.media ? '@media' : ''} ${rule.conditionText} { ${selectorText}}`, sheet.cssRules.length)
          } else {
            let selectors = rule.selectorText.split(',')
            let selectorText = selectors.map(selector => {
              if (selector.startsWith(':host')) {
                return selector.replace(':host', tagName)
              } else {
                return `${tagName} ${selector}`
              }
            }).join(',')
            sheet.insertRule(rule.cssText.replace(rule.selectorText, selectorText), sheet.cssRules.length)
          }
        }
        // console.log(sheet)
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]

        this.template.content.removeChild(tag)
      }
      )
    // Removes script tags as they are already appended to the body by SSR
    // TODO: If only added dynamically in the browser we need to insert the script tag after running the script transform on it. As well as handle deduplication.
    this.template.content.querySelectorAll('script')
      .forEach((tag) => { this.template.content.removeChild(tag) })

    const hasSlots = this.template.content.querySelectorAll('slot')?.length
    const enhanced = this.hasAttribute('enhanced')

    // If the Custom Element was already expanded by SSR it will have the "enhanced" attribute so do not replaceChildren
    if (!enhanced && !hasSlots) {
      console.log('expand client side')
      // If this Custom Element was added dynamically with JavaScript then use the template contents to expand the element
      this.replaceChildren(this.template.content.cloneNode(true))
    } else if (!enhanced && hasSlots) {
      console.log('expand slots client side')
      expandSlots(this)
    }
  }

  rulesForCssText(styleContent) {
    const doc = document.implementation.createHTMLDocument("")
    const styleElement = document.createElement("style")

    styleElement.textContent = styleContent
    doc.body.appendChild(styleElement)

    return styleElement.sheet.cssRules
  }
}

export default class CustomSlotElement extends CustomElementMixin(TemplateMixin(BaseElement)) { }
