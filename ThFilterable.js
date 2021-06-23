class ThFilterable extends HTMLElement {
  filterCallback
  resetCallback
  constructor(data, filterCallback, resetCallback) {
    super()
    this.resetCallback = resetCallback
    this.filterCallback = filterCallback
    const shadow = this.attachShadow({ mode: 'open' })
    const container = document.createElement('div')
    container.setAttribute('class', 'container')
    container.innerHTML = `
      <style>
        .container {
          display: flex;
          position: absolute;
          top: 0;
          right: 0;
          justify-content: center;
        }

        .buttonAndFilterListContainer {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          position: absolute;
          right: 0.5rem;
        }

        .button {
          width: -moz-fit-content;
          width: fit-content;
          align-self: flex-end;
        }

        .button:hover {
          cursor: pointer;
        }

        .dropdownListContainer {
          border-collapse: collapse;
          display: none;
          background: white;
          border: solid 1px black;
          max-height: 40vh;
          max-width: 70%;
          overflow-x: hidden;
          overflow-y: scroll;
        }

        .dropdownListContainer.visible {
          display: block;
        }

        .search {
          padding: 1rem;
          font-size: 1rem;
        }

        .dropdownList {
          list-style: none;
          text-align: left;
          padding: 0;
          margin: 0;
        }

        .dropdownList:hover {
          cursor: pointer;
        }

        .dropdownList > li {
          border-bottom: solid 0.5px black;
          padding: 1rem;
        }

        .dropdownList > li.selected {
          font-weight: bold;
        }

        .dropdownList > li.hidden {
          display: none;
        }

        .dropdownList > li:last-child {
          border: 0;
        }

        .dropdownList > li:hover {
          background: grey;
        }
      </style>
      <div class="buttonAndFilterListContainer">
        <button class="button" onclick="">&#x25bc;</button>
        <div class="dropdownListContainer">
          <input type="text" class="search" placeholder="Search..."/>
          <ul class="dropdownList">
            ${this._createListItemsHtml(data)}
          </ul>
        </div>
      </div>
    `
    shadow.appendChild(container)
  }

  /** @return {HTMLDivElement} */
  get dropdownListContainerEl() {
    return this.shadowRoot.querySelector('.dropdownListContainer')
  }

  /** @return {HTMLUListElement} */
  get dropdownListEl() {
    return this.shadowRoot.querySelector('.dropdownList')
  }

  get dropdownListItemEls() {
    return this.shadowRoot.querySelectorAll('li')
  }

  /** @return {NodeListOf<HTMLLIElement>} */
  get dropdownListItemElsWithoutClear() {
    return this.shadowRoot.querySelectorAll('li[data-clear="false"]')
  }

  /** @return {HTMLButtonElement} */
  get toggleButtonEl() {
    return this.shadowRoot.querySelector('.button')
  }

  /** @return {HTMLInputElement} */
  get searchInputEl() {
    return this.shadowRoot.querySelector('.search')
  }

  connectedCallback() {
    // Add click listeners
    window.addEventListener('click', this.hideDropdown)
    this.shadowRoot?.addEventListener('click', this._hideDropdown)
    this.toggleButtonEl.addEventListener('click', this.toggleDropdown)
    this.dropdownListItemEls.forEach((li, i) => {
      li.addEventListener(
        'click',
        !i ? this.triggerResetCallback : this.triggerFilterCallback(li),
      )
      li.addEventListener('click', () => this._hideDropdown(true))
    })
    // Add search listener
    this.searchInputEl.addEventListener('input', this.filterDropdownList)
  }

  disconnectedCallback() {
    // Remove click listeners
    window.removeEventListener('click', this.hideDropdown)
    this.shadowRoot?.removeEventListener('click', this._hideDropdown)
    this.toggleButtonEl.removeEventListener('click', this.toggleDropdown)
    this.dropdownListItemEls.forEach((li, i) => {
      li.removeEventListener(
        'click',
        !i ? this.triggerResetCallback : this.triggerFilterCallback(li),
      )
      li.removeEventListener('click', () => this._hideDropdown(true))
    })
    // Remove search listener
    this.searchInputEl.addEventListener('change', this.filterDropdownList)
  }

  _createListItemsHtml = data =>
    ['Clear']
      .concat(data)
      .map((d, i) => `<li data-type="${d}" data-clear="${!i}">${d}</li>`)
      .join('')

  _hideDropdown = e => {
    if (typeof e === 'boolean') {
      e && this.dropdownListContainerEl.classList.remove('visible')
    } else if (
      !e.target.closest('.button') &&
      !e.target.closest('.dropdownListContainer')
    ) {
      this.dropdownListContainerEl.classList.remove('visible')
    }
  }

  deselectAllListItemsExceptFor = (selected = null) => {
    this.dropdownListItemElsWithoutClear.forEach(li => {
      if (selected === li) {
        li.classList.add('selected')
      } else {
        li.classList.remove('selected')
      }
    })
  }

  filterDropdownList = e => {
    if (e.target.value.length === 0) {
      this.dropdownListItemElsWithoutClear.forEach(li => {
        li.classList.remove('hidden')
      })
      return
    }
    const fuse = new Fuse(this.dropdownListItemElsWithoutClear, {
      keys: ['dataset.type'],
    })
    const result = fuse.search(e.target.value)
    this.dropdownListItemElsWithoutClear.forEach(li => {
      if (!result.find(r => r.item.dataset.type === li.dataset.type)) {
        li.classList.add('hidden')
      }
    })
  }

  hideDropdown = e => {
    this._hideDropdown(e.target !== this)
  }

  toggleDropdown(_) {
    this.nextElementSibling?.classList.toggle('visible')
  }

  triggerFilterCallback(li) {
    return () => {
      this.deselectAllListItemsExceptFor(li)
      this.filterCallback(li.dataset.type)
    }
  }

  triggerResetCallback = () => {
    this.deselectAllListItemsExceptFor()
    this.resetCallback()
  }

  /**
   * @param {string[]} update
   * @param {boolean} hide
   */
  updateData = (update, hide) => {
    const u = Array.from(new Set(update))
    this.dropdownListItemElsWithoutClear.forEach(li => {
      if (u.includes(li.textContent)) {
        hide ? li.classList.add('hidden') : li.classList.remove('hidden')
      } else {
        hide ? li.classList.remove('hidden') : li.classList.add('hidden')
      }
    })
    this.dropdownListItemElsWithoutClear.forEach(li => {
      if (!li.classList.contains('hidden')) {
        console.log(li.textContent)
      }
    })
  }
}

customElements.define('th-filterable', ThFilterable)
export default ThFilterable
