export default function Spinner({ text = 'Loading…' }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner" aria-hidden />
      <p>{text}</p>
    </div>
  )
}