import { Order, User, Product, RepairRequest, AmcEnquiry } from '../../models';

/** Top-line counters for the dashboard KPI cards. */
export async function getOverview() {
  const [
    totalOrders,
    totalUsers,
    totalProducts,
    lowStock,
    pendingRepairs,
    newEnquiries,
    revenueAgg,
    statusAgg,
  ] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments(),
    Product.countDocuments({ quantity: { $lte: 5 } }),
    RepairRequest.countDocuments({ status: 'pending' }),
    AmcEnquiry.countDocuments({ status: 'new' }),
    // Revenue = sum of totalAmount for orders whose payment completed.
    Order.aggregate<{ _id: null; total: number }>([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const revenue = revenueAgg[0]?.total ?? 0;
  const ordersByStatus = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));

  return {
    totalOrders,
    totalUsers,
    totalProducts,
    lowStock,
    pendingRepairs,
    newEnquiries,
    revenue,
    ordersByStatus,
  };
}

/** Revenue + order count per day for the last `days` days (for the bar chart). */
export async function getRevenueSeries(days = 7) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await Order.aggregate<{ _id: string; revenue: number; orders: number }>([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, '$totalAmount', 0] },
        },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill gaps so every day in the range appears (chart needs a continuous axis).
  const map = new Map(rows.map((r) => [r._id, r]));
  const series: Array<{ date: string; revenue: number; orders: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = map.get(key);
    series.push({ date: key, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 });
  }
  return series;
}

/** Most recent orders for the dashboard "recent activity" list. */
export async function getRecentOrders(limit = 8) {
  return Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'firstName lastName email')
    .select('orderId totalAmount status paymentStatus paymentMethod createdAt user')
    .lean();
}
