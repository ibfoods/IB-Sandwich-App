// ─── Storefront locations ───────────────────────────────────────────────────
// Used by the Location screen (customer picks a store) and the kiosk lock
// (a device is pinned to one of these so the picker is skipped entirely).

export const LOCATIONS = [
  {
    id: 'new-hyde-park',
    name: 'New Hyde Park',
    address: '1538 Union Turnpike, Lake Success Center',
    city: 'New Hyde Park, NY 11040',
    phone: '(516) 488-5600',
  },
  {
    id: 'wantagh',
    name: 'Wantagh',
    address: '1166 Wantagh Avenue',
    city: 'Wantagh, NY 11793',
    phone: '(516) 781-6400',
  },
  {
    id: 'maspeth',
    name: 'Maspeth',
    address: '6900 Grand Avenue',
    city: 'Maspeth, NY 11378',
    phone: '(718) 639-3623',
  },
  {
    id: 'woodbury',
    name: 'Woodbury',
    address: '7929 Jericho Turnpike, Woodbury Village Shopping Center',
    city: 'Woodbury, NY 11797',
    phone: '(516) 921-5400',
  },
  {
    id: 'garden-city',
    name: 'Garden City',
    address: '140 7th Street',
    city: 'Garden City, NY 11530',
    phone: '(516) 266-8800',
  },
]

export function findLocation(name) {
  if (!name) return null
  return LOCATIONS.find(
    l => l.name.toLowerCase() === name.toLowerCase() || l.id === name.toLowerCase()
  ) || null
}
