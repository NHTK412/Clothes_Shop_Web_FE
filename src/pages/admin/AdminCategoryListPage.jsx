// import { useEffect, useMemo, useState } from 'react';
// import { notification } from 'antd';
// import ConfirmModal from '../../components/admin/ConfirmModal';
// import PageHeader from '../../components/admin/PageHeader';
// import ProductsService from '../../services/ProductsService';

// const normalizeCategoryId = (category) => {
//   if (!category) return null;
//   return category.id ?? category._id ?? category.categoryId ?? category.category_id ?? null;
// };

// const normalizeCategoryName = (category) => {
//   if (!category) return '';
//   return category.name ?? category.title ?? category.slug ?? '';
// };

// const flattenCategories = (categories = [], parentName = null, level = 0) => {
//   const rows = [];
//   categories.forEach((category) => {
//     const id = normalizeCategoryId(category);
//     rows.push({
//       id,
//       name: normalizeCategoryName(category),
//       parent_id: category.parent_id ?? category.parentId ?? category.parent?._id ?? category.parent?.id ?? null,
//       parentName,
//       level,
//       raw: category,
//       childrenCount: Array.isArray(category.children) ? category.children.length : 0,
//     });
//     if (Array.isArray(category.children) && category.children.length > 0) {
//       rows.push(...flattenCategories(category.children, normalizeCategoryName(category), level + 1));
//     }
//   });
//   return rows;
// };

// const AdminCategoryListPage = () => {
//   const [categories, setCategories] = useState([]);
//   const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [formState, setFormState] = useState({ isOpen: false, id: null, name: '', parent_id: '' });
//   const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });

//   const fetchCategories = async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const result = await ProductsService.getCategories({ per_page: 100, page: 1 });
//       const items = Array.isArray(result) ? result : result?.items ?? result?.data ?? [];
//       setCategories(Array.isArray(items) ? items : []);
//     } catch (err) {
//       console.error('Error loading categories:', err);
//       setError('Lỗi tải danh mục. Vui lòng thử lại.');
//       setCategories([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     const loadCategories = async () => {
//       await fetchCategories();
//     };

//     loadCategories();
//   }, []);

//   const rows = useMemo(() => {
//     const flattened = flattenCategories(categories);
//     const sorted = [...flattened];

//     if (sortConfig.key) {
//       sorted.sort((a, b) => {
//         const aValue = a[sortConfig.key] ?? '';
//         const bValue = b[sortConfig.key] ?? '';
//         if (typeof aValue === 'number' && typeof bValue === 'number') {
//           return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
//         }
//         return sortConfig.direction === 'asc'
//           ? String(aValue).localeCompare(String(bValue))
//           : String(bValue).localeCompare(String(aValue));
//       });
//     }

//     return sorted;
//   }, [categories, sortConfig]);

//   const openCreateForm = () => {
//     setFormState({ isOpen: true, id: null, name: '', parent_id: '' });
//   };

//   const openEditForm = (row) => {
//     setFormState({
//       isOpen: true,
//       id: row.id,
//       name: row.name,
//       parent_id: row.parent_id ? String(row.parent_id) : '',
//     });
//   };

//   const closeForm = () => {
//     setFormState({ isOpen: false, id: null, name: '', parent_id: '' });
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     const name = formState.name.trim();
//     const parentId = formState.parent_id ? Number(formState.parent_id) : null;

//     if (!name) {
//       notification.warning({
//         message: 'Tên danh mục là bắt buộc',
//         description: 'Vui lòng nhập tên danh mục.',
//       });
//       return;
//     }

//     setIsLoading(true);

//     try {
//       if (formState.id) {
//         await ProductsService.updateCategory(formState.id, { name, parent_id: parentId });
//         notification.success({
//           message: 'Cập nhật danh mục thành công',
//           description: `Danh mục "${name}" đã được cập nhật.`,
//         });
//       } else {
//         await ProductsService.createCategory({ name, parent_id: parentId });
//         notification.success({
//           message: 'Tạo danh mục thành công',
//           description: `Danh mục "${name}" đã được tạo.`,
//         });
//       }
//       closeForm();
//       await fetchCategories();
//     } catch (err) {
//       notification.error({
//         message: formState.id ? 'Lỗi cập nhật danh mục' : 'Lỗi tạo danh mục',
//         description: err?.response?.data?.message || err.message || 'Vui lòng thử lại sau.',
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleDeleteCategory = (row) => {
//     setDeleteConfirm({ isOpen: true, id: row.id, name: row.name });
//   };

//   const confirmDeleteCategory = async () => {
//     const { id, name } = deleteConfirm;
//     setDeleteConfirm({ isOpen: false, id: null, name: '' });
//     if (!id) return;

//     setIsLoading(true);
//     try {
//       await ProductsService.deleteCategory(id);
//       notification.success({
//         message: 'Xóa danh mục thành công',
//         description: `Danh mục "${name}" đã được xóa.`,
//       });
//       await fetchCategories();
//     } catch (err) {
//       notification.error({
//         message: 'Lỗi xóa danh mục',
//         description: err?.response?.data?.message || err.message || 'Vui lòng thử lại sau.',
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const cancelDeleteCategory = () => {
//     setDeleteConfirm({ isOpen: false, id: null, name: '' });
//   };

//   const parentOptions = useMemo(
//     () => [
//       { value: '', label: '-- Không có --' },
//       ...rows
//         .filter((item) => item.id !== formState.id)
//         .map((item) => ({
//           value: String(item.id),
//           label: `${'  '.repeat(item.level)}${item.name}`,
//         })),
//     ],
//     [rows, formState.id]
//   );

//   return (
//     <main className="pt-16 min-h-screen bg-surface">
//       <div className="p-lg max-w-[1280px] mx-auto w-full">
//             <div className="mb-lg">
//               <PageHeader
//                 title="Quản lý danh mục"
//                 subtitle="Quản lý danh mục, bao gồm phân cấp cha / con."
//                 actions={<button
//                 type="button"
//                 onClick={openCreateForm}
//                 className="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-lg py-sm rounded-lg transition-all duration-200"
//               >
//                 <span className="material-symbols-outlined">add</span>
//                 Thêm danh mục
//                 </button>}
//               />
//             </div>

//             {error && (
//               <div className="mb-md p-md bg-error-container text-on-error-container rounded-lg text-body-sm">
//                 {error}
//                 <button onClick={() => setError(null)} className="ml-4 underline hover:no-underline">
//                   Đóng
//                 </button>
//               </div>
//             )}

//             {isLoading && rows.length === 0 ? (
//               <div className="text-center py-lg text-on-surface-variant">
//                 Đang tải danh mục...
//               </div>
//             ) : rows.length === 0 ? (
//               <div className="text-center py-lg text-on-surface-variant">Chưa có danh mục nào.</div>
//             ) : (
//               <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-outline-variant">
//                 <table className="min-w-full border-collapse">
//                   <thead>
//                     <tr className="bg-surface-container text-left text-on-surface-variant text-sm uppercase tracking-[0.08em]">
//                       <th className="px-6 py-4 border-b border-divider">
//                     <button
//                       type="button"
//                       onClick={() => setSortConfig((prev) => ({
//                         key: 'name',
//                         direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc',
//                       }))}
//                       className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
//                     >
//                       Tên danh mục
//                       <span className="material-symbols-outlined text-[16px]">
//                         {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
//                       </span>
//                     </button>
//                   </th>
//                   <th className="px-6 py-4 border-b border-divider">
//                     <button
//                       type="button"
//                       onClick={() => setSortConfig((prev) => ({
//                         key: 'parentName',
//                         direction: prev.key === 'parentName' && prev.direction === 'asc' ? 'desc' : 'asc',
//                       }))}
//                       className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
//                     >
//                       Danh mục cha
//                       <span className="material-symbols-outlined text-[16px]">
//                         {sortConfig.key === 'parentName' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
//                       </span>
//                     </button>
//                   </th>
//                   <th className="px-6 py-4 border-b border-divider">
//                     <button
//                       type="button"
//                       onClick={() => setSortConfig((prev) => ({
//                         key: 'childrenCount',
//                         direction: prev.key === 'childrenCount' && prev.direction === 'asc' ? 'desc' : 'asc',
//                       }))}
//                       className="inline-flex items-center gap-2 font-semibold text-on-surface hover:text-primary"
//                     >
//                       Số con
//                       <span className="material-symbols-outlined text-[16px]">
//                         {sortConfig.key === 'childrenCount' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
//                       </span>
//                     </button>
//                   </th>
//                   <th className="px-6 py-4 border-b border-divider text-right">Hành động</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {rows.map((row) => (
//                       <tr key={row.id} className="hover:bg-surface-container-lowest transition-colors">
//                         <td className="px-6 py-4 align-top text-body-md">
//                           <span className="inline-flex items-center gap-2">
//                             <span className="inline-block w-2 h-2 rounded-full bg-surface-variant" />
//                             <span style={{ marginLeft: `${row.level * 16}px` }}>{row.name}</span>
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 align-top text-body-md">{row.parentName || 'Không'}</td>
//                         <td className="px-6 py-4 align-top text-body-md">{row.childrenCount}</td>
//                         <td className="px-6 py-4 align-top text-right space-x-2">
//                           <button
//                             type="button"
//                             onClick={() => openEditForm(row)}
//                             className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
//                           >
//                             Sửa
//                           </button>
//                           <button
//                             type="button"
//                             onClick={() => handleDeleteCategory(row)}
//                             className="px-4 py-2 rounded-lg border border-red-600 text-red-600 hover:bg-red-50 transition"
//                           >
//                             Xóa
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}

//             {formState.isOpen && (
//               <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
//                 <div className="relative w-full min-w-80 max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
//                   <div className="sticky top-0 z-20 bg-white px-6 py-5 border-b border-divider flex items-center justify-between">
//                     <div>
//                       <h3 className="text-xl font-semibold text-on-surface">
//                         {formState.id ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
//                       </h3>
//                       <p className="text-sm text-on-surface-variant mt-1">
//                         {formState.id ? 'Cập nhật thông tin danh mục.' : 'Tạo danh mục mới cho cửa hàng.'}
//                       </p>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={closeForm}
//                       className="text-on-surface-variant hover:text-on-surface"
//                     >
//                       ✕
//                     </button>
//                   </div>

//                   <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-96px)]">
//                     <div>
//                       <label className="block text-sm font-medium text-on-surface-variant mb-2">Tên danh mục</label>
//                       <input
//                         type="text"
//                         value={formState.name}
//                         onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
//                         className="w-full rounded-xl border border-outline px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none"
//                         placeholder="Ví dụ: Áo thun"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-on-surface-variant mb-2">Danh mục cha</label>
//                       <select
//                         value={formState.parent_id}
//                         onChange={(event) => setFormState((prev) => ({ ...prev, parent_id: event.target.value }))}
//                         className="w-full rounded-xl border border-outline px-4 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none"
//                       >
//                         {parentOptions.map((option) => (
//                           <option key={option.value} value={option.value}>
//                             {option.label}
//                           </option>
//                         ))}
//                       </select>
//                     </div>
//                     <div className="flex items-center justify-end gap-3 pt-3 border-t border-divider">
//                       <button
//                         type="button"
//                         onClick={closeForm}
//                         className="px-5 py-3 rounded-xl border border-outline text-on-surface hover:bg-surface-container transition"
//                       >
//                         Hủy
//                       </button>
//                       <button
//                         type="submit"
//                         disabled={isLoading}
//                         className="px-5 py-3 rounded-xl bg-primary text-white hover:bg-primary-container transition disabled:opacity-50"
//                       >
//                         {formState.id ? 'Cập nhật' : 'Tạo mới'}
//                       </button>
//                     </div>
//                   </form>
//                 </div>
//               </div>
//             )}

//             <ConfirmModal
//               isOpen={deleteConfirm.isOpen}
//               title="Xác nhận xóa danh mục"
//               message={`Bạn có chắc chắn muốn xóa danh mục "${deleteConfirm.name}"?`}
//               confirmText="Xóa"
//               cancelText="Hủy"
//               isDangerous
//               onConfirm={confirmDeleteCategory}
//               onCancel={cancelDeleteCategory}
//             />
//       </div>
//     </main>
//   );
// };

// export default AdminCategoryListPage;
