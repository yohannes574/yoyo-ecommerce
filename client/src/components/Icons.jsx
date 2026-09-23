/**
 * Yoyo icon set — inline SVG, stroke-based, inherits currentColor.
 * Usage: <Icon.Cart size={20} /> or <Icon.Star filled />
 */

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
})

const make = (children) => {
  const Comp = ({ size = 20, filled = false, ...rest }) => (
    <svg {...base(size)} {...rest}>
      {typeof children === 'function' ? children(filled) : children}
    </svg>
  )
  return Comp
}

export const Icon = {
  Cart: make(
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17.5" cy="20" r="1.4" />
      <path d="M2.5 3.5h2l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3l1.6-8.2H6" />
    </>
  ),
  Heart: make((filled) =>
    filled ? (
      <path
        d="M12 20.7 4.7 13.4a4.9 4.9 0 0 1 0-7 4.9 4.9 0 0 1 7 0l.3.4.3-.4a4.9 4.9 0 0 1 7 0 4.9 4.9 0 0 1 0 7Z"
        fill="currentColor"
        stroke="none"
      />
    ) : (
      <path d="M12 20.7 4.7 13.4a4.9 4.9 0 0 1 0-7 4.9 4.9 0 0 1 7 0l.3.4.3-.4a4.9 4.9 0 0 1 7 0 4.9 4.9 0 0 1 0 7Z" />
    )
  ),
  Search: make(
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  Bell: make(
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </>
  ),
  User: make(
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7.2 7.2 0 0 1 14 0" />
    </>
  ),
  Truck: make(
    <>
      <path d="M1.5 5.5h12v10h-12z" />
      <path d="M13.5 9h4l3 3.2v3.3h-7" />
      <circle cx="6" cy="17.8" r="1.8" />
      <circle cx="17" cy="17.8" r="1.8" />
    </>
  ),
  Shield: make(
    <>
      <path d="M12 2.8 4.5 5.6v5.2c0 4.6 3.1 8.1 7.5 9.9 4.4-1.8 7.5-5.3 7.5-9.9V5.6Z" />
      <path d="m9 11.6 2.1 2.1L15.4 9.4" />
    </>
  ),
  Refresh: make(
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 3.5V8h-4.5" />
    </>
  ),
  Tag: make(
    <>
      <path d="m20.6 12.3-8.3 8.3a1.7 1.7 0 0 1-2.4 0L3 13.7V3h10.7l6.9 6.9a1.7 1.7 0 0 1 0 2.4Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  Star: make((filled) =>
    filled ? (
      <path
        d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.5l6.4-.9Z"
        fill="currentColor"
        stroke="none"
      />
    ) : (
      <path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.5l6.4-.9Z" />
    )
  ),
  Check: make(<path d="m4.5 12.5 5 5 10-11" />),
  ArrowRight: make(
    <>
      <path d="M4 12h16" />
      <path d="m13.5 5.5 6.5 6.5-6.5 6.5" />
    </>
  ),
  ArrowLeft: make(
    <>
      <path d="M20 12H4" />
      <path d="M10.5 18.5 4 12l6.5-6.5" />
    </>
  ),
  ChevronDown: make(<path d="m6 9.5 6 6 6-6" />),
  Phone: make(
    <path d="M21 16.6v2.6a1.8 1.8 0 0 1-2 1.8 17.6 17.6 0 0 1-7.7-2.7 17.3 17.3 0 0 1-5.3-5.3A17.6 17.6 0 0 1 3.3 5.3 1.8 1.8 0 0 1 5.1 3.3h2.6a1.8 1.8 0 0 1 1.8 1.5c.1.9.4 1.8.7 2.7a1.8 1.8 0 0 1-.4 1.9L8.7 10.5a14.4 14.4 0 0 0 5.3 5.3l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.9.3 1.8.6 2.7.7a1.8 1.8 0 0 1 1.3 1.6Z" />
  ),
  MapPin: make(
    <>
      <path d="M19.5 10c0 5-7.5 11-7.5 11S4.5 15 4.5 10a7.5 7.5 0 0 1 15 0Z" />
      <circle cx="12" cy="10" r="2.7" />
    </>
  ),
  Package: make(
    <>
      <path d="m21 8-9-5-9 5v8l9 5 9-5Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  Share: make(
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4" />
    </>
  ),
  Copy: make(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  Trash: make(
    <>
      <path d="M3.5 6.5h17" />
      <path d="M8 6.5V5a1.8 1.8 0 0 1 1.8-1.8h4.4A1.8 1.8 0 0 1 16 5v1.5" />
      <path d="M19 6.5 18.2 19a2 2 0 0 1-2 1.9H7.8a2 2 0 0 1-2-1.9L5 6.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  Plus: make(<path d="M12 5v14M5 12h14" />),
  Minus: make(<path d="M5 12h14" />),
  X: make(<path d="M6 6l12 12M18 6 6 18" />),
  Store: make(
    <>
      <path d="M4 7.5 5.6 3h12.8L20 7.5" />
      <path d="M4 7.5a2.6 2.6 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.6 2.6 0 0 0 5.3 0" />
      <path d="M5 11v9h14v-9" />
      <path d="M9.5 20v-5.5h5V20" />
    </>
  ),
  Headset: make(
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="2.5" y="13" width="4.5" height="6.5" rx="2" />
      <rect x="17" y="13" width="4.5" height="6.5" rx="2" />
      <path d="M20 19.5a4 4 0 0 1-4 3h-2" />
    </>
  ),
  Mail: make(
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
}

export default Icon
