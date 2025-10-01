import React, { useEffect, useMemo, useState } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Paginator } from 'primereact/paginator'
import { Button } from 'primereact/button'

import 'primereact/resources/themes/saga-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

type Artwork = {
  id: number
  title: string
  place_of_origin: string | null
  artist_display: string | null
  inscriptions: string | null
  date_start: number | null
  date_end: number | null
}

type ApiResponse = {
  pagination: { total: number; limit: number; current_page: number; total_pages: number }
  data: any[]
}

export default function ArtworksTable() {
  const pageSize = 10

  const [rows, setRows] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(false)
  const [totalRecords, setTotalRecords] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Persist selections across pages
  const [selectedMap, setSelectedMap] = useState<
    Map<number, Pick<Artwork, 'id' | 'title' | 'artist_display'>>
  >(new Map())

  // For current page DataTable selection
  const [pageSelection, setPageSelection] = useState<Artwork[]>([])

  const fetchPage = async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `https://api.artic.edu/api/v1/artworks?page=${page}&limit=${pageSize}&fields=id,title,place_of_origin,artist_display,inscriptions,date_start,date_end`
      )
      const json: ApiResponse = await res.json()
      const artworks = (json.data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        place_of_origin: d.place_of_origin ?? null,
        artist_display: d.artist_display ?? null,
        inscriptions: d.inscriptions ?? null,
        date_start: d.date_start ?? null,
        date_end: d.date_end ?? null,
      })) as Artwork[]

      setRows(artworks)
      setTotalRecords(json.pagination?.total ?? 0)

      // Restore page selection based on selectedMap
      const restored = artworks.filter(r => selectedMap.has(r.id))
      setPageSelection(restored)
    } catch (err) {
      console.error('fetch error', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage(1)
  }, [])

  const onPageChange = (e: { page: number; rows: number }) => {
    const newPage = e.page + 1
    setCurrentPage(newPage)
    fetchPage(newPage)
  }

  // Handle row selection changes
  const onSelectionChange = (e: { value: Artwork[] }) => {
    const selected = e.value
    setPageSelection(selected)

    setSelectedMap(prev => {
      const copy = new Map(prev)
      selected.forEach(row => {
        copy.set(row.id, { id: row.id, title: row.title, artist_display: row.artist_display })
      })
      rows.forEach(row => {
        if (!selected.find(s => s.id === row.id)) {
          copy.delete(row.id)
        }
      })
      return copy
    })
  }

  const selectAllOnPage = () => {
    setSelectedMap(prev => {
      const copy = new Map(prev)
      rows.forEach(r => copy.set(r.id, { id: r.id, title: r.title, artist_display: r.artist_display }))
      return copy
    })
    setPageSelection(rows)
  }

  const clearSelectionOnPage = () => {
    setSelectedMap(prev => {
      const copy = new Map(prev)
      rows.forEach(r => copy.delete(r.id))
      return copy
    })
    setPageSelection([])
  }

  const removeFromSelection = (id: number) => {
    setSelectedMap(prev => {
      const copy = new Map(prev)
      copy.delete(id)
      return copy
    })
    setPageSelection(prev => prev.filter(r => r.id !== id))
  }

  const header = (
    <div className="p-d-flex p-jc-between p-ai-center">
      <div>Showing page {currentPage}</div>
      <div>
        <Button label="Select all on page" className="p-button-sm" onClick={selectAllOnPage} />
        <Button
          label="Clear page selection"
          className="p-button-sm p-button-danger"
          onClick={clearSelectionOnPage}
          style={{ marginLeft: '8px' }}
        />
      </div>
    </div>
  )

  const selectionPanel = useMemo(() => {
    const items = Array.from(selectedMap.values())
    return (
      <div className="selection-panel">
        <h3>Selected ({items.length})</h3>
        {items.length === 0 ? (
          <div className="empty">No rows selected</div>
        ) : (
          <ul>
            {items.map(it => (
              <li key={it.id} className="selection-item">
                <div>
                  <strong>{it.title ?? '(no title)'}</strong>
                  <div className="meta">{it.artist_display ?? 'Unknown artist'}</div>
                </div>
                <Button
                  label="Deselect"
                  icon="pi pi-times"
                  className="p-button-sm p-button-danger p-button-rounded"
                  onClick={() => removeFromSelection(it.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }, [selectedMap])

  return (
    <div className="artworks-table p-d-flex p-flex-column">
      <div className="p-grid">
        <div className="p-col-9">
          <DataTable
            value={rows}
            paginator={false}
            loading={loading}
            selectionMode="checkbox"
            selection={pageSelection}
            onSelectionChange={onSelectionChange}
            header={header}
            dataKey="id"
            emptyMessage="No artworks found"
          >
            <Column selectionMode="multiple" style={{ width: '3em' }}></Column>
            <Column field="title" header="Title" sortable />
            <Column field="artist_display" header="Artist" />
            <Column field="place_of_origin" header="Origin" />
            <Column field="inscriptions" header="Inscriptions" />
            <Column field="date_start" header="Start" />
            <Column field="date_end" header="End" />
          </DataTable>

          <Paginator
            first={(currentPage - 1) * pageSize}
            rows={pageSize}
            totalRecords={totalRecords}
            onPageChange={e => onPageChange({ page: e.page as number, rows: e.rows as number })}
          />
        </div>

        <div className="p-col-3">{selectionPanel}</div>
      </div>
    </div>
  )
}
