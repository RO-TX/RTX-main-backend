/**
 * Seed script — creates an admin user + sample catalog/orders/content so the
 * dashboard has real data to display and test against.
 *
 * Run:  npm run seed
 * Idempotent-ish: it wipes the sample collections first (NOT users) and reseeds.
 */
import { connectDB, disconnectDB } from '../config/db';
import {
  User,
  Category,
  Product,
  Order,
  Review,
  Certification,
  RepairRequest,
  AmcEnquiry,
} from '../models';
import { hashPassword } from '../lib/password';
import { logger } from '../lib/logger';

const ADMIN_EMAIL = 'admin@rotechnicalxperts.com';
const ADMIN_PASSWORD = 'Admin@123';

async function seed(): Promise<void> {
  await connectDB();
  logger.info('Seeding database...');

  // ── Admin user (upsert) ──
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      firstName: 'RTX',
      lastName: 'Admin',
      email: ADMIN_EMAIL,
      mobile: '9999999999',
      password: await hashPassword(ADMIN_PASSWORD),
      role: 'admin',
      emailVerified: true,
    });
    logger.info(`Created admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    logger.info(`Admin already exists: ${ADMIN_EMAIL}`);
  }

  // ── A sample customer ──
  let customer = await User.findOne({ email: 'customer@example.com' });
  if (!customer) {
    customer = await User.create({
      firstName: 'Ravi',
      lastName: 'Kumar',
      email: 'customer@example.com',
      mobile: '9812345678',
      password: await hashPassword('Customer@123'),
      role: 'customer',
      emailVerified: true,
    });
  }

  // ── Reset sample content (not users) ──
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Certification.deleteMany({}),
    RepairRequest.deleteMany({}),
    AmcEnquiry.deleteMany({}),
  ]);

  // ── Categories ──
  const [domestic, commercial, spares] = await Category.create([
    {
      name: 'Domestic RO Systems',
      catImage: 'https://placehold.co/600x400/062F4F/FFF?text=Domestic+RO',
      description: 'Water purifiers for homes.',
      categoryType: 'homecategory',
    },
    {
      name: 'Commercial RO Plants',
      catImage: 'https://placehold.co/600x400/062F4F/FFF?text=Commercial+RO',
      description: 'High-capacity RO plants for businesses.',
      categoryType: 'homecategory',
    },
    {
      name: 'Spares & Filters',
      catImage: 'https://placehold.co/600x400/062F4F/FFF?text=Spares',
      description: 'Replacement filters, membranes and parts.',
      categoryType: 'homecategory',
    },
  ]);

  // ── Products ──
  const productSpecs = [
    { cat: domestic, name: 'AquaPure 8L RO+UV', price: 12999, qty: 25, top: true },
    { cat: domestic, name: 'AquaPure 10L RO+UV+UF', price: 15999, qty: 18, top: true },
    { cat: domestic, name: 'AquaMini 6L Compact RO', price: 8999, qty: 40, top: false },
    { cat: commercial, name: 'HydroMax 50 LPH RO Plant', price: 84999, qty: 5, top: true },
    { cat: commercial, name: 'HydroMax 100 LPH RO Plant', price: 149999, qty: 3, top: false },
    { cat: spares, name: 'Sediment Filter Cartridge', price: 349, qty: 200, top: false },
    { cat: spares, name: 'RO Membrane 80 GPD', price: 1899, qty: 4, top: false }, // low stock
    { cat: spares, name: 'Carbon Filter Set', price: 799, qty: 120, top: false },
  ];

  const products = [];
  for (let i = 0; i < productSpecs.length; i++) {
    const s = productSpecs[i];
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const p = await Product.create({
      skuid: `RTX-${String(i + 1).padStart(4, '0')}`,
      slug,
      name: s.name,
      images: [`https://placehold.co/600x600/EEF3F7/062F4F?text=${encodeURIComponent(s.name)}`],
      description: `${s.name} — reliable RO water purification from RO Technical Xperts.`,
      mrp: Math.round((s.price * 1.22) / 10) * 10, // ~18% off
      price: s.price,
      gstRate: 18,
      installationCharge: s.cat === commercial ? 2500 : s.cat === domestic ? 499 : 0,
      quantity: s.qty,
      category: s.cat._id,
      isTopSeller: s.top,
      sequence: i + 1,
    });
    await Category.updateOne({ _id: s.cat._id }, { $addToSet: { products: p._id } });
    products.push(p);
  }

  // ── Orders ──
  const statuses = ['orderplaced', 'processing', 'shipped', 'delivered', 'delivered'] as const;
  const payStatuses = ['pending', 'completed', 'completed', 'completed', 'completed'] as const;
  for (let i = 0; i < 5; i++) {
    const p = products[i % products.length];
    const qty = (i % 3) + 1;
    await Order.create({
      user: customer._id,
      orderId: `RTX_SEED_${1000 + i}`,
      items: [{ product: p._id, quantity: qty, price: p.price }],
      totalAmount: p.price * qty,
      status: statuses[i],
      paymentStatus: payStatuses[i],
      paymentMethod: i % 2 === 0 ? 'cod' : 'razorpay',
      shippingAddress: {
        address: `${100 + i} Green Park`,
        state: 'Delhi',
        city: 'New Delhi',
        postalCode: '110016',
        country: 'India',
        mobile: '9812345678',
      },
      paidAt: payStatuses[i] === 'completed' ? new Date() : undefined,
    });
  }

  // ── Reviews ──
  await Review.create([
    {
      image: 'https://placehold.co/100x100/062F4F/FFF?text=SM',
      name: 'Sunita Mehta',
      position: 'Homeowner, Dwarka',
      description: 'Water tastes so much better now. Installation was quick and professional.',
    },
    {
      image: 'https://placehold.co/100x100/062F4F/FFF?text=AK',
      name: 'Ajay Khanna',
      position: 'Restaurant Owner',
      description: 'Their commercial RO plant has been running flawlessly for a year.',
    },
  ]);

  // ── Certifications ──
  await Certification.create([
    {
      title: 'ISO 9001:2015 Quality Management',
      description: 'Certified quality management system for RO manufacturing and service.',
      issuedBy: 'Bureau of Indian Standards',
      issueDate: new Date('2024-01-15'),
      expiryDate: new Date('2027-01-15'),
      image: 'https://placehold.co/600x400/062F4F/FFF?text=ISO+9001',
      verificationId: 'ISO-2024-RTX-001',
    },
  ]);

  // ── Repair requests + AMC enquiries ──
  await RepairRequest.create({
    name: 'Meena Rao',
    email: 'meena@example.com',
    mobile: '9876500011',
    pincode: '110001',
    district: 'Central Delhi',
    city: 'New Delhi',
    address: 'Connaught Place',
    description: 'RO not dispensing water since yesterday. Attaching photos and a short clip of the leak.',
    amount: 24900,
    attachments: [
      { url: 'https://placehold.co/640x480/062F4F/FFF?text=Leak+Photo+1', type: 'image', filename: 'leak-1.jpg' },
      { url: 'https://placehold.co/640x480/0E3C5C/FFF?text=Filter+Photo', type: 'image', filename: 'filter.jpg' },
      { url: 'https://www.w3schools.com/html/mov_bbb.mp4', type: 'video', filename: 'fault-clip.mp4' },
    ],
  });
  await AmcEnquiry.create({
    name: 'Vikram Singh',
    email: 'vikram@example.com',
    address: 'Sector 15, Noida',
    mobile: '9876511122',
    message: 'Interested in annual maintenance for a 3-stage RO.',
  });

  logger.info('✅ Seed complete.');
  logger.info(`   Admin login → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  await disconnectDB();
}

seed().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
