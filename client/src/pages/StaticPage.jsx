import { Link } from 'react-router-dom'

const CONTENT = {
  about: {
    title: 'About us',
    intro: 'Yoyo is a single-vendor online store based in Addis Ababa, bringing quality products to customers across Ethiopia.',
    sections: [
      {
        h: 'Who we are',
        body: 'We started Yoyo with a simple idea: Ethiopian shoppers deserve a reliable online store with honest prices, real stock and dependable delivery. From electronics to baby care and chicken equipment, every product is sourced and handled by our own team.',
      },
      {
        h: 'What we promise',
        bullets: [
          'Genuine products with clear descriptions and photos',
          'Accurate stock levels — no surprises at checkout',
          'Secure payment options: cash on delivery, bank transfer and (soon) mobile money',
          'Friendly support before and after your purchase',
        ],
      },
    ],
  },
  contact: {
    title: 'Contact us',
    intro: 'Questions about an order, a product or delivery? We are happy to help.',
    sections: [
      {
        h: 'Get in touch',
        body: (
          <>
            <p><strong>Email:</strong> hello@yoyo.com</p>
            <p><strong>Phone / WhatsApp:</strong> +251 91 123 4567</p>
            <p><strong>Address:</strong> Bole, Addis Ababa, Ethiopia</p>
            <p><strong>Hours:</strong> Monday–Saturday, 9:00–18:00</p>
            <p>For order-specific questions, open a support ticket from your account (coming soon) or email us with your order number.</p>
          </>
        ),
      },
    ],
  },
  help: {
    title: 'Help center',
    intro: 'Everything you need to know about shopping on Yoyo.',
    sections: [
      {
        h: 'Popular topics',
        bullets: [
          'Track your order from My Orders → Order details',
          'Update your delivery address before checkout',
          'Cancel an order while its status is still Pending or Confirmed',
          'Upload a bank transfer receipt at checkout, then wait for admin verification',
        ],
        body: <p>Can&apos;t find an answer? Visit our <Link to="/faq">FAQ</Link> or <Link to="/contact">contact us</Link>.</p>,
      },
    ],
  },
  faq: {
    title: 'FAQ',
    intro: 'Frequently asked questions about orders, payments, delivery and returns.',
    sections: [
      { h: 'Orders', bullets: ['When is my order confirmed? Once we confirm payment and stock, your order moves to Processing.', 'Can I cancel an order? Yes, while it is still Pending or Confirmed — from the order details page.'] },
      { h: 'Payments', bullets: ['Which payment methods do you accept? Cash on delivery and bank transfer with receipt upload.', 'How do I pay by bank transfer? Choose your bank at checkout, transfer the total, upload your receipt. We verify it before dispatch.', 'When is mobile money (Telebirr / CBE Birr) available? Coming in a future update.'] },
      { h: 'Delivery', bullets: ['How much is delivery? A fee is calculated at checkout for your address.', 'Where do you deliver? Addis Ababa first, with other cities being added.'] },
      { h: 'Returns', bullets: ['See our return policy page for the conditions and process.', 'Report a problem within 48 hours of delivery so we can help quickly.'] },
    ],
  },
  terms: {
    title: 'Terms & conditions',
    intro: 'The terms that apply when you shop on Yoyo.',
    sections: [
      { h: '1. Orders & prices', body: 'All prices are shown in Ethiopian Birr (ETB) including tax. We may decline or cancel orders that are the result of pricing errors.' },
      { h: '2. Payments', body: 'Your order is only fulfilled once payment is confirmed — instantly for cash on delivery confirmation, or after receipt verification for bank transfers.' },
      { h: '3. Delivery', body: 'We aim to deliver within the estimated window shown at checkout. Ownership of the goods transfers to you upon delivery.' },
      { h: '4. Liability', body: 'To the maximum extent permitted by law, Yoyo is not liable for indirect or consequential loss arising from your use of the store.' },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'How Yoyo collects, uses and protects your information.',
    sections: [
      { h: 'What we collect', body: 'We collect the information you provide — name, email, phone, addresses — plus basic order history needed to run your account.' },
      { h: 'How we use it', body: 'To process orders, arrange delivery, send order status updates, and improve our store. We never sell your personal data.' },
      { h: 'Security', body: 'Passwords are stored hashed and never readable by staff. Payment details for bank transfers are handled per your bank\'s own secure channels.' },
      { h: 'Your rights', body: 'You may request a copy or deletion of your personal data at any time by contacting us.' },
    ],
  },
  'return-policy': {
    title: 'Return policy',
    intro: 'Our conditions for returns and refunds.',
    sections: [
      { h: 'Damaged or wrong item', body: 'Contact us within 48 hours of delivery with photos. We will arrange a replacement or refund at no cost to you.' },
      { h: 'Change of mind', body: 'Unopened items in original packaging can be returned within 7 days of delivery. Return shipping is your responsibility.' },
      { h: 'Non-returnable items', body: 'For hygiene, opened cosmetics, baby products and underwear cannot be returned unless faulty.' },
      { h: 'Refunds', body: 'Refunds are processed to your original payment method within 5–7 business days after we receive the returned item.' },
    ],
  },
  'delivery-info': {
    title: 'Delivery information',
    intro: 'How and where we deliver.',
    sections: [
      { h: 'Delivery areas', body: 'We currently deliver across Addis Ababa (all sub-cities). More cities and regions are being added.' },
      { h: 'Delivery methods', bullets: ['Standard delivery: 2–4 business days', 'Express delivery: same day or next day within Addis Ababa (where available)'] },
      { h: 'Delivery fee', body: 'Calculated at checkout based on your address and delivery method. Cash on delivery orders pay the driver upon receipt.' },
      { h: 'Receiving your order', body: 'Our courier will call the phone number on your order before arrival. Please keep it reachable to avoid delays.' },
    ],
  },
}

export default function StaticPage({ page }) {
  const content = CONTENT[page]
  if (!content) return null
  return (
    <div className="page container narrow">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <span className="current">{content.title}</span>
      </nav>
      <div className="page-head">
        <h1>{content.title}</h1>
        {content.intro && <p>{content.intro}</p>}
      </div>
      {content.sections.map((s) => (
        <section className="content-section" key={s.h}>
          <h2>{s.h}</h2>
          {s.body}
          {s.bullets && (
            <ul>
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}