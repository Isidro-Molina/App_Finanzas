import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface Category {
  id: string;
  name: string;
  icon: string | null; // color hex
  type: 'INCOME' | 'EXPENSE';
  userId: string | null; // null = global category
}

const COLOR_OPTIONS = [
  '#2563EB', '#7C3AED', '#DB2777', '#059669',
  '#D97706', '#0891B2', '#DC2626', '#65A30D',
  '#9333EA', '#0F172A', '#64748B', '#EA580C',
];

export const ManageCategoriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  // Edit/create modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0]);
  const [editType, setEditType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      setCategories(res.data);
    } catch (e) {
      console.error('Error fetching categories:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCategories(); }, []));

  const openCreate = () => {
    setEditingCategory(null);
    setEditName('');
    setEditColor(COLOR_OPTIONS[0]);
    setEditType('EXPENSE');
    setModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditColor(cat.icon && cat.icon.startsWith('#') ? cat.icon : COLOR_OPTIONS[0]);
    setEditType(cat.type);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Nombre requerido', 'Ingresá un nombre para la categoría');
      return;
    }
    setSaving(true);
    try {
      if (editingCategory) {
        await apiClient.patch(`/categories/${editingCategory.id}`, {
          name: editName.trim(),
          icon: editColor,
          type: editType,
        });
      } else {
        await apiClient.post('/categories', {
          name: editName.trim(),
          icon: editColor,
          type: editType,
        });
      }
      setModalVisible(false);
      fetchCategories();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al guardar';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Estás seguro de que querés eliminar "${cat.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/categories/${cat.id}`);
              fetchCategories();
            } catch (e: any) {
              const msg = e.response?.data?.message || 'Error al eliminar';
              Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
            }
          },
        },
      ]
    );
  };

  const filtered = categories.filter((c) => filterType === 'ALL' || c.type === filterType);

  const getCatColor = (icon: string | null, i: number) => {
    if (icon && icon.startsWith('#')) return icon;
    return COLOR_OPTIONS[i % COLOR_OPTIONS.length];
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary, flex: 1 }}>
          Mis Categorías
        </Text>
        <TouchableOpacity
          onPress={openCreate}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, padding: 5, borderRadius: 14, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
          {(['ALL', 'EXPENSE', 'INCOME'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilterType(f)}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: filterType === f ? colors.brand : 'transparent' }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: filterType === f ? '#fff' : colors.textMuted }}>
                {f === 'ALL' ? 'Todas' : f === 'EXPENSE' ? 'Gastos' : 'Ingresos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCategories(); }} tintColor={colors.brand} />}
      >
        {filtered.length === 0 ? (
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 18, padding: 32, alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary, marginBottom: 6 }}>
              Sin categorías aún
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
              Tocá el "+" para crear tu primera categoría.
            </Text>
          </View>
        ) : (
          filtered.map((cat, i) => {
            const catColor = getCatColor(cat.icon, i);
            return (
              <View
                key={cat.id}
                style={{ backgroundColor: colors.bgCard, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}
              >
                {/* Color circle */}
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${catColor}18`, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: catColor }} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary }}>
                      {cat.name}
                    </Text>
                    {cat.userId === null && (
                      <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#2563EB' }}>GLOBAL</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ backgroundColor: cat.type === 'EXPENSE' ? '#FEF2F2' : '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: cat.type === 'EXPENSE' ? '#DC2626' : '#059669' }}>
                      {cat.type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
                    </Text>
                  </View>
                </View>

                {/* Only show edit/delete for personal categories */}
                {cat.userId !== null && (
                  <>
                    <TouchableOpacity
                      onPress={() => openEdit(cat)}
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Pencil size={15} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(cat)}
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })

        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setModalVisible(false)}>
          <Pressable style={{ backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 10 }} onPress={() => {}}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>
                {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.bgInput, padding: 5, borderRadius: 12, marginBottom: 16, gap: 4 }}>
              <TouchableOpacity onPress={() => setEditType('EXPENSE')} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: editType === 'EXPENSE' ? '#EFF6FF' : 'transparent' }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: editType === 'EXPENSE' ? '#2563EB' : colors.textMuted }}>Gasto</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditType('INCOME')} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: editType === 'INCOME' ? '#ECFDF5' : 'transparent' }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: editType === 'INCOME' ? '#059669' : colors.textMuted }}>Ingreso</Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Nombre de la categoría"
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textPrimary, backgroundColor: colors.bgInput, marginBottom: 16 }}
            />

            {/* Color picker */}
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              Color
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setEditColor(color)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: editColor === color ? 3 : 0, borderColor: '#fff', shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: editColor === color ? 0.5 : 0, shadowRadius: 6, elevation: editColor === color ? 3 : 0 }}
                >
                  {editColor === color && <Check size={16} color="#fff" strokeWidth={3} />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{ backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4 }}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>{editingCategory ? 'Guardar cambios' : 'Crear categoría'}</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
