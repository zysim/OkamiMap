class ThFilterable extends HTMLElement {
  filterCallback
  resetCallback
  initData
  constructor(data, filterCallback, resetCallback) {
    super()
    this.resetCallback = resetCallback
    this.filterCallback = filterCallback
    this.initData = data
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

        .filterListContainer {
          border-collapse: collapse;
          display: none;
          background: white;
          border: solid 1px black;
          max-height: 40vh;
          max-width: 70%;
          overflow-x: hidden;
          overflow-y: scroll;
        }

        .filterListContainer.visible {
          display: block;
        }

        .search {
          padding: 1rem;
          font-size: 1rem;
        }

        .filterList {
          list-style: none;
          text-align: left;
          padding: 0;
          margin: 0;
        }

        .filterList:hover {
          cursor: pointer;
        }

        .filterList > li {
          border-bottom: solid 0.5px black;
          padding: 1rem;
        }

        .filterList > li:last-child {
          border: 0;
        }

        .filterList > li:hover {
          background: grey;
        }
      </style>
      <div class="buttonAndFilterListContainer">
        <button class="button" onclick="">&#x25bc;</button>
        <div class="filterListContainer">
          <input type="text" class="search" placeholder="Search..."/>
          <ul class="filterList">
            ${this.createListItemsHtml(data)}
          </ul>
        </div>
      </div>
    `
    shadow.appendChild(container)
  }

  /** @return {HTMLDivElement} */
  get filterListContainerEl() {
    return this.shadowRoot.querySelector('.filterListContainer')
  }

  /** @return {HTMLUListElement} */
  get filterListEl() {
    return this.shadowRoot.querySelector('.filterList')
  }

  get listItemEls() {
    return this.shadowRoot.querySelectorAll('li')
  }

  /** @return {NodeListOf<HTMLLIElement>} */
  get listItemElsWithoutClear() {
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
    this.listItemEls.forEach((li, i) => {
      li.addEventListener(
        'click',
        !i ? this.resetCallback : this.triggerFilterCallback(li),
      )
      li.addEventListener('click', () => this._hideDropdown(true))
    })
    // Add search listener
    this.searchInputEl.addEventListener('input', ev => {
      if (ev.target.value.length === 0) {
        this.listItemElsWithoutClear.forEach(li => {
          li.style.display = 'list-item'
        })
        return
      }
      const fuse = new Fuse(this.listItemElsWithoutClear, {
        keys: ['dataset.type'],
      })
      const result = fuse.search(ev.target.value)
      this.listItemElsWithoutClear.forEach(li => {
        if (!result.find(r => r.item.dataset.type === li.dataset.type)) {
          li.style.display = 'none'
        }
      })
    })
  }

  disconnectedCallback() {
    // Remove click listeners
    window.removeEventListener('click', this.hideDropdown)
    this.shadowRoot?.removeEventListener('click', this._hideDropdown)
    this.toggleButtonEl.removeEventListener('click', this.toggleDropdown)
    this.listItemEls.forEach((li, i) => {
      li.removeEventListener(
        'click',
        !i ? this.resetCallback : this.triggerFilterCallback(li),
      )
      li.removeEventListener('click', () => this._hideDropdown(true))
    })
    // Remove search listener
    this.searchInputEl.addEventListener('change', function (ev) {
      //
    })
  }

  createListItemsHtml = data =>
    ['Clear']
      .concat(data)
      .map((d, i) => `<li data-type="${d}" data-clear="${!i}">${d}</li>`)
      .join('')

  hideDropdown = e => {
    this._hideDropdown(e.target !== this)
  }

  _hideDropdown = e => {
    if (typeof e === 'boolean') {
      e && this.filterListContainerEl.classList.remove('visible')
    } else if (
      !e.target.closest('.button') &&
      !e.target.closest('.filterListContainer')
    ) {
      this.filterListContainerEl.classList.remove('visible')
    }
  }

  toggleDropdown(_) {
    this.nextElementSibling?.classList.toggle('visible')
  }

  triggerFilterCallback(li) {
    return () => {
      this.filterCallback(li.dataset.type)
    }
  }

  updateData = update => {
    this.filterListEl.innerHTML = this.createListItemsHtml(update)
  }
}

customElements.define('th-filterable', ThFilterable)
export default ThFilterable
