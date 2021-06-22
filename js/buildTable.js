import ThFilterable from '../ThFilterable.js'

function tdEl(text) {
  const el = document.createElement('td')
  el.innerText = text || 'N/A'
  return el
}

function tdImageEl(src) {
  const td = document.createElement('td')
  if (src === undefined) {
    td.innerText = 'No image :('
    return td
  }

  const pvButton = document.createElement('button')
  pvButton.className = 'pv'
  pvButton.innerText = 'Preview'
  const link = document.createElement('a')
  link.innerText = 'Link'
  link.href = src
  td.appendChild(pvButton)
  td.appendChild(link)
  return td
}

const getConfig = async res => {
  try {
    return await import(res.url.replace('.json', 'Config.js'))
  } catch (e) {
    throw Error(`Error fetching config for ${res.url}: ${e.message}`)
  }
}

/**
 * @param {Object} config
 * @param {number} colIndex
 */
const isImageColumn = (config, colIndex) =>
  config[config.headers[colIndex].key] === 'image'

/**
 * @param {HTMLTableRowElement[]} dataRows
 * @param {number} colIndex
 */
const getValuesOfTableColumnForFilter = (dataRows, colIndex) =>
  Array.from(
    new Set(dataRows.map(row => row.cells.item(colIndex).innerText).sort()),
  )

/**
 * @param {Object} config The config JS file to build each `<th>` with
 * @param {HTMLTableRowElement[]} dataRows The built rows of data
 * @param {() => void} cb To update the header cells
 */
const createHeaderRow = (config, dataRows, cb) => {
  const tr = document.createElement('tr')

  tr.append(
    ...config.headers.map((h, colIndex) => {
      const th = document.createElement('th')
      th.textContent = h.text
      if (h.style) Object.assign(th.style, h.style)
      if (!isImageColumn(config, colIndex)) {
        th.appendChild(
          new ThFilterable(
            getValuesOfTableColumnForFilter(dataRows, colIndex),
            valueToFilter => setFilter(dataRows, valueToFilter, colIndex, tr),
            () => clearFilter(dataRows, colIndex, tr),
          ),
        )
      }
      return th
    }),
  )

  return tr
}

const createDataRow = (config, el) => {
  const tr = document.createElement('tr')

  if (config.rowIdGenerator) {
    tr.id = config.rowIdGenerator(el)
  }

  return tr
}

const createDataCell = (config, key, el, mapIDMap) => {
  if (Array.isArray(config[key])) {
    const [elType, textGenerator] = config[key]

    return createDataCell({ [key]: elType }, key, {
      [key]: textGenerator(el, mapIDMap),
    })
  }
  switch (config[key]) {
    case 'image':
      return tdImageEl(el[key])
    default:
      return tdEl(el[key])
  }
}

const markCellsAsHidden = (dataRows, value, colIndex) => {
  dataRows.forEach(row => {
    if (row.cells.item(colIndex).textContent !== value) {
      row.cells.item(colIndex).setAttribute('data-mark-hidden', true)
    } else {
      row.cells.item(colIndex).removeAttribute('data-mark-hidden')
    }
  })
}

const markCellsAsShown = (dataRows, colIndex) => {
  dataRows.forEach(row => {
    row.cells.item(colIndex).removeAttribute('data-mark-hidden')
  })
}

const updateVisibilityOfRows = dataRows =>
  dataRows.filter(row => {
    row.style.display = 'table-row'
    for (const cell of row.cells) {
      if (cell.dataset.markHidden === 'true') {
        row.style.display = 'none'
        return false
      }
    }
    return true
  })

/**
 * @param {HTMLTableRowElement} tHeadRow
 * @param {HTMLTableRowElement[]} dataRows
 */
const updateFilterableHeaderDropdownLists = (tHeadRow, dataRows) => {
  Array.from(tHeadRow.children).forEach((th, colIndex) => {
    if (th.firstElementChild instanceof ThFilterable) {
      th.firstElementChild.updateData(
        dataRows.map(row => row.cells.item(colIndex).textContent),
      )
    }
  })
}

/**
 * @param {HTMLTableRowElement[]} dataRows
 * @param {string} value
 * @param {int} colIndex
 * @param {HTMLTableRowElement} tHeadRow
 */
const setFilter = (dataRows, value, colIndex, tHeadRow) => {
  markCellsAsHidden(dataRows, value, colIndex)
  const rowsToShow = updateVisibilityOfRows(dataRows)
  updateFilterableHeaderDropdownLists(tHeadRow, rowsToShow)
}

/**
 * @param {HTMLTableRowElement[]} dataRows
 * @param {number} colIndex
 * @param {HTMLTableRowElement} tHeadRow
 */
const clearFilter = (dataRows, colIndex, tHeadRow) => {
  console.log('Uh')
  markCellsAsShown(dataRows, colIndex)
  const rowsToShow = updateVisibilityOfRows(dataRows)
  updateFilterableHeaderDropdownLists(tHeadRow, rowsToShow)
}

export default async (url, mapIDMap) => {
  const res = await fetch(url)
  const config = (await getConfig(res)).default
  const json = await res.json()
  const dataRows = json.map(el => {
    const row = createDataRow(config, el)
    row.append(
      ...config.headers.map(({ key }) =>
        createDataCell(config, key, el, mapIDMap),
      ),
    )
    return row
  })
  return {
    header: createHeaderRow(config, dataRows),
    body: dataRows,
  }
}
