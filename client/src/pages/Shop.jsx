import Catalog from '../components/Catalog'

export default function Shop() {
  return (
    <div className="page container">
      <div className="page-head">
        <h1>Shop</h1>
        <p>Browse every product we sell.</p>
      </div>
      <Catalog showCategoryFilter />
    </div>
  )
}