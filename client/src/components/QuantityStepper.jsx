export default function QuantityStepper({ value, onChange, min = 1, max = 99, disabled }) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  return (
    <div className="qty-stepper">
      <button type="button" onClick={dec} disabled={disabled || value <= min} aria-label="Decrease">
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        readOnly
        aria-label="Quantity"
      />
      <button type="button" onClick={inc} disabled={disabled || value >= max} aria-label="Increase">
        +
      </button>
    </div>
  )
}