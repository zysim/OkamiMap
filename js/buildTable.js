import ThFilterable from '../ThFilterable.js'
import { paraFetchJSON } from './util.js'

const DATA = (()=>{
  /* Take the current URL and remove everything after the last slash which isn't part of the hash or query: */
  const basePath = /[^#?@]+[^/]\//.exec(location.href)[0];
  return {
    animals: {
      configPath: `${basePath}Animals/config.js`,
      jsonPath: `${basePath}Animals/data.json`,
    },
    loot: {
      configPath: `${basePath}Loot/config.js`,
      jsonPath: `${basePath}Loot/data.json`,
    },
  };
})();

/**
 * Modified from https://stackoverflow.com/a/54631141.
 * Renamed function, used the lossy base64 string directly, and make it be async.
 */
function checkWebp() {
  return new Promise(res => {
    const img = new Image()
    img.onload = function () {
      const result = img.width > 0 && img.height > 0
      res(result)
    }
    img.onerror = function () {
      res(false)
    }
    img.src =
      'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'
  })
}

function tdEl(text) {
  const el = document.createElement('td')
  el.innerText = text || 'N/A'
  return el
}

function tdImageEl(src, backupSrc, hasWebp) {
  const td = document.createElement('td')
  if (src === undefined && backupSrc === undefined) {
    td.innerText = 'No image :('
    return td
  }

  const pvButton = document.createElement('button')
  pvButton.className = 'pv'
  pvButton.innerText = 'Preview'
  const link = document.createElement('a')
  link.innerText = 'Link'
  link.href = hasWebp ? src : backupSrc
  td.appendChild(pvButton)
  td.appendChild(link)
  return td
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
 * @param {() => void} updateHeaderCellsCb To update the header cells
 */
const createHeaderRow = (config, dataRows, updateHeaderCellsCb) => {
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
            () => updateHeaderCellsCb(dataRows, colIndex, tr),
          ),
        )
      }
      return th
    }),
  )

  return tr
}

const createDataRow = (config, jsonRow) => {
  const tr = document.createElement('tr')

  if (config.rowIdGenerator) {
    tr.id = config.rowIdGenerator(jsonRow)
  }

  return tr
}

const createDataCell = (config, key, jsonRow, mapInfo, hasWebp) => {
  if (Array.isArray(config[key])) {
    const [elType, textGenerator] = config[key]

    return createDataCell({ [key]: elType }, key, {
      [key]: textGenerator(jsonRow, mapInfo),
    })
  }
  switch (config[key]) {
    case 'image':
      return tdImageEl(jsonRow.image, jsonRow.backupImage, hasWebp)
    default:
      return tdEl(jsonRow[key])
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
 * @param {boolean | undefined} hideRows
 */
const updateFilterableHeaderDropdownLists = (
  tHeadRow,
  dataRows,
  hideRows = false,
) => {
  Array.from(tHeadRow.children).forEach((th, colIndex) => {
    if (th.firstElementChild instanceof ThFilterable) {
      th.firstElementChild.updateData(
        dataRows.map(row => row.cells.item(colIndex).textContent),
        hideRows,
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
  markCellsAsShown(dataRows, colIndex)
  const rowsToShow = updateVisibilityOfRows(dataRows)
  updateFilterableHeaderDropdownLists(tHeadRow, rowsToShow, false)
}

const getPathsForType = type => {
  if (!DATA[type])
    throw Error(`Type ${type} is invalid! No table data can be supplied`)
  return DATA[type]
}

export default async type => {
  const { configPath, jsonPath } = getPathsForType(type)
  const [json, mapInfo] = await paraFetchJSON(jsonPath, './mapInfo.json')
  try {
    const config = (await import(configPath)).default
    const hasWebp = await checkWebp()
    const dataRows = json.map(jsonRow => {
      const dataRow = createDataRow(config, jsonRow)
      dataRow.append(
        ...config.headers.map(({ key }) =>
          createDataCell(config, key, jsonRow, mapInfo, hasWebp),
        ),
      )
      return dataRow
    })
    return {
      header: createHeaderRow(config, dataRows, clearFilter),
      body: dataRows,
    }
  } catch (importConfigError) {
    throw Error(`Error getting config for ${type}:`, importConfigError)
  }
}
