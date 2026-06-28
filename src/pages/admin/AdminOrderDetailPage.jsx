import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import OrderService from '../../services/OrderService';

const formatMoney = (value) => {
  if (value == null || value === '') return '-';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '-';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const normalizeOrderStatus = (status) => {
  const normalized = `${status ?? ''}`.toLowerCase();
  if (['pending', 'pending_payment', 'chờ xử lý', 'chờ thanh toán'].includes(normalized)) return 'pending';
  if (['processing', 'confirmed', 'shipping', 'đang xử lý', 'đã xác nhận', 'đang giao'].includes(normalized)) return 'processing';
  if (['completed', 'hoàn thành', 'done'].includes(normalized)) return 'completed';
  if (['cancelled', 'canceled', 'cancel', 'đã hủy'].includes(normalized)) return 'cancelled';
  if (['returned', 'return', 'trả hàng'].includes(normalized)) return 'returned';
  return normalized || 'unknown';
};

const getOrderStatusLabel = (status) => {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case 'pending':
      return 'Chờ xử lý';
    case 'processing':
      return 'Đang xử lý';
    case 'completed':
      return 'Hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    case 'returned':
      return 'Trả hàng';
    default:
      return status ?? '-';
  }
};

const getOrderStatusClasses = (status) => {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'returned':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-surface-variant text-on-surface-variant';
  }
};

const getTimelineSteps = (status) => {
  const normalized = normalizeOrderStatus(status);

  // For cancelled or returned orders, show only single status
  if (normalized === 'cancelled') {
    return [
      { key: 'cancelled', label: 'Đã hủy', icon: 'cancel', done: true, active: true },
    ];
  }

  if (normalized === 'returned') {
    return [
      { key: 'returned', label: 'Trả hàng', icon: 'assignment_return', done: true, active: true },
    ];
  }

  const base = [
    { key: 'placed', label: 'Đã đặt hàng', icon: 'shopping_bag', done: true },
    { key: 'payment', label: 'Đã thanh toán', icon: 'payments', done: ['completed', 'processing'].includes(normalized) },
    { key: 'shipping', label: 'Đang giao', icon: 'local_shipping', done: ['completed'].includes(normalized) },
    { key: 'received', label: 'Đã nhận hàng', icon: 'inventory', done: normalized === 'completed' },
  ];

  return base.map((step) => ({
    ...step,
    active: step.key === 'payment' ? normalized !== 'pending' : step.done,
  }));
};

const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await OrderService.getAdminOrder(id);
        setOrder(response?.data ?? response ?? null);
      } catch (err) {
        console.error('Failed to load order detail:', err);
        setError('Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const subtotal = useMemo(() => {
    if (!Array.isArray(order?.order_details)) return 0;
    return order.order_details.reduce((sum, detail) => sum + Number(detail.unit_price ?? 0) * Number(detail.quantity ?? 0), 0);
  }, [order]);

  const discount = useMemo(() => {
    if (!Array.isArray(order?.order_details)) return 0;
    return order.order_details.reduce((sum, detail) => sum + Number(detail.unit_discount_price ?? 0) * Number(detail.quantity ?? 0), 0);
  }, [order]);

  const timelineSteps = useMemo(() => getTimelineSteps(order?.status), [order]);

  return (
    <main className="pt-16 min-h-screen bg-surface">
      <div className="p-lg max-w-[1280px] mx-auto w-full space-y-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <nav className="flex items-center gap-2 text-label-sm text-on-surface-variant mb-2">
                  <Link to="/admin" className="hover:text-primary">Trang chủ</Link>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <Link to="/admin/orders" className="hover:text-primary">Đơn hàng</Link>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span className="text-on-surface font-semibold">Chi tiết đơn hàng</span>
                </nav>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-headline-md text-headline-md text-on-background">Chi tiết đơn hàng</h2>
                  <span className="text-headline-sm text-on-surface-variant">{order?.order_code ?? `#ORD-${id}`}</span>
                  {order && (
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${getOrderStatusClasses(order.status)}`}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Đặt lúc {formatDate(order?.created_at ?? order?.createdAt ?? order?.created)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link to="/admin/orders" className="px-md py-2 border border-primary text-primary rounded-lg hover:bg-secondary-container transition-all">
                  Quay lại
                </Link>
                <button className="flex items-center gap-2 bg-primary text-on-primary px-md py-2 rounded-lg hover:opacity-90 transition-all">
                  <span className="material-symbols-outlined">print</span>
                  In hóa đơn
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-center text-on-surface-variant">
                Đang tải thông tin đơn hàng...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-error-container bg-error-container/10 p-md text-error">{error}</div>
            ) : !order ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-center text-on-surface-variant">
                Không tìm thấy đơn hàng.
              </div>
            ) : (
              <>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                  <div className="flex flex-wrap justify-center items-center gap-6 relative min-h-[120px]">
                    {timelineSteps.map((step, index) => (
                      <React.Fragment key={step.key}>
                        <div className="relative flex flex-col items-center z-10 bg-surface-container-lowest px-xs">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-xs ${step.active ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                            <span className="material-symbols-outlined text-[20px] leading-none align-middle">{step.icon}</span>
                          </div>
                          <p className={`font-label-md text-label-md ${step.active ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>{step.label}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">{step.done ? 'Hoàn tất' : 'Chờ cập nhật'}</p>
                        </div>
                        {index < timelineSteps.length - 1 && (
                          <div className="self-center h-1 w-24 rounded-full bg-black" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-gutter">
                  <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
                    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                      <div className="px-md py-sm border-b border-outline-variant bg-surface-container-low/30">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface">Sản phẩm đơn hàng</h3>
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-surface-container-low/50 border-b border-outline-variant">
                          <tr>
                            <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Sản phẩm</th>
                            <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Giá</th>
                            <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Số lượng</th>
                            <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          {(Array.isArray(order.order_details) ? order.order_details : []).map((detail) => (
                            <tr key={detail.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="px-md py-md">
                                <div className="flex items-center gap-sm">
                                  <div className="w-16 h-16 rounded border border-outline-variant overflow-hidden flex-shrink-0">
                                    {detail.variant_image ? (
                                      <img className="w-full h-full object-cover" src={detail.variant_image} alt={detail.product_name ?? 'Sản phẩm'} />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-surface-container text-on-surface-variant text-label-sm">SP</div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-body-md text-body-md font-semibold text-on-surface">{detail.product_name ?? detail.product?.name ?? 'Sản phẩm'}</p>
                                    <p className="font-label-sm text-label-sm text-on-surface-variant">SKU: {detail.product_variant_id ?? '-'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-md py-md font-body-md text-body-md">{formatMoney(detail.unit_price ?? 0)}</td>
                              <td className="px-md py-md font-body-md text-body-md">{detail.quantity ?? 0}</td>
                              <td className="px-md py-md font-body-md text-body-md font-bold text-right">{formatMoney((Number(detail.unit_price ?? 0) * Number(detail.quantity ?? 0)))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>

                    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                      <div className="flex items-center gap-xs mb-sm">
                        <span className="material-symbols-outlined text-primary">notes</span>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface">Ghi chú đơn hàng</h3>
                      </div>
                      <div className="bg-surface-container-low rounded-lg p-md border border-outline-variant">
                        <p className="font-body-md text-body-md text-on-surface italic">
                          {order.note ?? 'Không có ghi chú nào từ khách hàng.'}
                        </p>
                      </div>
                    </section>
                  </div>

                  <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
                    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                      <div className="flex items-center justify-between mb-md">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface">Thông tin khách hàng</h3>
                      </div>
                      <div className="flex items-center gap-sm mb-md pb-md border-b border-outline-variant">
                        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold">
                          {(order.customer?.name ?? order.full_name ?? 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="font-body-md text-body-md font-bold">{order.customer?.name ?? order.full_name ?? '-'}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">Khách hàng</p>
                        </div>
                      </div>
                      <div className="space-y-md">
                        <div className="flex items-start gap-sm">
                          <span className="material-symbols-outlined text-on-surface-variant">mail</span>
                          <div className="flex-1">
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Email</p>
                            <p className="font-body-md text-body-md">{order.customer?.email ?? order.user?.email ?? '-'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-sm">
                          <span className="material-symbols-outlined text-on-surface-variant">phone_iphone</span>
                          <div className="flex-1">
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Số điện thoại</p>
                            <p className="font-body-md text-body-md">{order.customer?.phone ?? order.phone ?? '-'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-sm">
                          <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
                          <div className="flex-1">
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Địa chỉ giao hàng</p>
                            <p className="font-body-md text-body-md">{order.specific_address ?? '-'}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">Tổng kết thanh toán</h3>
                      <div className="space-y-sm mb-md">
                        <div className="flex justify-between">
                          <p className="font-body-md text-body-md text-on-surface-variant">Tổng giá sản phẩm</p>
                          <p className="font-body-md text-body-md">{formatMoney(subtotal)}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="font-body-md text-body-md text-on-surface-variant">Giảm giá</p>
                          <p className="font-body-md text-body-md">{formatMoney(discount)}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="font-body-md text-body-md text-on-surface-variant">Phí vận chuyển</p>
                          <p className="font-body-md text-body-md">{formatMoney(order.ship_price ?? 0)}</p>
                        </div>
                      </div>
                      <div className="pt-md border-t border-outline-variant mb-md">
                        <div className="flex justify-between items-center">
                          <p className="font-headline-sm text-headline-sm text-on-surface">Tổng cộng</p>
                          <p className="font-headline-md text-headline-md text-primary font-bold">{formatMoney(order.final_price ?? order.total_price ?? 0)}</p>
                        </div>
                      </div>
                      <div className="bg-surface-container-low rounded-lg p-sm flex items-center gap-xs">
                        <span className="material-symbols-outlined text-primary">credit_card</span>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Thanh toán qua: <span className="font-bold text-on-surface">{order.payment?.method ?? order.payment_method ?? '-'}</span>
                        </p>
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}
      </div>
    </main>
  );
};

export default AdminOrderDetailPage;
