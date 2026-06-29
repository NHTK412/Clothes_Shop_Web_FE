import { useState } from 'react';
import PageHeader from '../../components/admin/PageHeader';

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({
    storeName: 'Clothes Shop',
    storeEmail: 'contact@clothesshop.com',
    storePhone: '0123456789',
    storeAddress: '123 Đường ABC, Quận 1, TP HCM',
    currency: 'VND',
    taxRate: 10,
    notificationsEnabled: true,
    maintenanceMode: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveMessage('Cài đặt đã được lưu thành công!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('Lỗi khi lưu cài đặt. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      storeName: 'Clothes Shop',
      storeEmail: 'contact@clothesshop.com',
      storePhone: '0123456789',
      storeAddress: '123 Đường ABC, Quận 1, TP HCM',
      currency: 'VND',
      taxRate: 10,
      notificationsEnabled: true,
      maintenanceMode: false,
    });
    setSaveMessage('');
  };

  return (
    <main className="pt-16 min-h-screen bg-surface">
      <div className="max-w-[1280px] mx-auto p-gutter space-y-lg">
            {/* Page Header */}
            <PageHeader title="Cài đặt" subtitle="Quản lý cấu hình cửa hàng" />

            {/* Settings Container */}
            <div className="space-y-lg">
              {/* Store Information */}
              <div className="bg-white rounded-xl border border-outline-variant p-lg">
                <h3 className="font-headline-sm text-on-surface mb-md">Thông tin cửa hàng</h3>
                <div className="space-y-md">
                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-xs">
                      Tên cửa hàng
                    </label>
                    <input
                      type="text"
                      name="storeName"
                      value={settings.storeName}
                      onChange={handleInputChange}
                      className="w-full px-md py-xs border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary"
                      placeholder="Nhập tên cửa hàng"
                    />
                  </div>

                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-xs">
                      Email
                    </label>
                    <input
                      type="email"
                      name="storeEmail"
                      value={settings.storeEmail}
                      onChange={handleInputChange}
                      className="w-full px-md py-xs border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary"
                      placeholder="Nhập email"
                    />
                  </div>

                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-xs">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      name="storePhone"
                      value={settings.storePhone}
                      onChange={handleInputChange}
                      className="w-full px-md py-xs border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>

                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-xs">
                      Địa chỉ
                    </label>
                    <textarea
                      name="storeAddress"
                      value={settings.storeAddress}
                      onChange={handleInputChange}
                      className="w-full px-md py-xs border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary"
                      placeholder="Nhập địa chỉ"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* Business Settings */}
              <div className="bg-white rounded-xl border border-outline-variant p-lg">
                <h3 className="font-headline-sm text-on-surface mb-md">Cài đặt kinh doanh</h3>
                <div className="space-y-md">
                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-xs">
                      Loại tiền tệ
                    </label>
                    <select
                      name="currency"
                      value={settings.currency}
                      onChange={handleInputChange}
                      className="w-full px-md py-xs border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary"
                    >
                      <option value="VND">VND (Đồng Việt Nam)</option>
                      <option value="USD">USD (Đô la Mỹ)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-label-md text-on-surface-variant mb-xs">
                      Tỷ lệ thuế (%)
                    </label>
                    <input
                      type="number"
                      name="taxRate"
                      value={settings.taxRate}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className="w-full px-md py-xs border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary"
                      placeholder="Nhập tỷ lệ thuế"
                    />
                  </div>
                </div>
              </div>

              {/* System Settings */}
              <div className="bg-white rounded-xl border border-outline-variant p-lg">
                <h3 className="font-headline-sm text-on-surface mb-md">Cài đặt hệ thống</h3>
                <div className="space-y-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-label-md text-on-surface">Bật thông báo</p>
                      <p className="text-label-sm text-on-surface-variant">Nhận thông báo về đơn hàng mới</p>
                    </div>
                    <input
                      type="checkbox"
                      name="notificationsEnabled"
                      checked={settings.notificationsEnabled}
                      onChange={handleInputChange}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-label-md text-on-surface">Chế độ bảo trì</p>
                      <p className="text-label-sm text-on-surface-variant">Tạm dừng cửa hàng để bảo trì</p>
                    </div>
                    <input
                      type="checkbox"
                      name="maintenanceMode"
                      checked={settings.maintenanceMode}
                      onChange={handleInputChange}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Save Message */}
              {saveMessage && (
                <div className={`rounded-lg px-md py-sm text-sm font-medium ${
                  saveMessage.includes('thành công')
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {saveMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-md justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-lg py-sm border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-variant transition-colors"
                  disabled={isSaving}
                >
                  Đặt lại
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-lg py-sm bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
              </div>
            </div>
      </div>
    </main>
  );
};

export default AdminSettingsPage;
