import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { Plus, Trash2, X } from 'lucide-react-native';
import apiClient from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { useCategories } from '../context/CategoriesContext';
import { formatCurrency } from '../utils/currency';
import { formatAmountInput, parseAmountInput } from '../utils/amountInput';
import { Spinner } from './Spinner';

export interface BudgetItem {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  pctUsed: number;
  category: { id: string; name: string; icon: string | null };
}

interface CategoryOption {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  isHidden?: boolean;
}

interface Props {
  budgets: BudgetItem[];
  month: number;
  year: number;
  onChanged: () => Promise<void> | void;
}

export const BudgetsSection: React.FC<Props> = ({ budgets, month, year, onChanged }) => {
  const { colors, isDark } = useTheme();
  const { showAlert, showConfirm } = useDialog();
  const { categories: allCategories, refreshCategories } = useCategories();

  const [isOpen, setIsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = allCategories.filter((c) => c.type === 'EXPENSE' && !c.isHidden);

  const openModal = () => {
    setCategoryId(null);
    setAmount('');
    setIsOpen(true);
    if (allCategories.length === 0) {
      void refreshCategories();
    }
  };

  const handleSave = async () => {
    const value = parseAmountInput(amount);
    if (!categoryId) {
      await showAlert({ title: 'Falta la categoría', message: 'Elegí una categoría para el presupuesto.' });
      return;
    }
    if (isNaN(value) || value <= 0) {
      await showAlert({ title: 'Monto inválido', message: 'Ingresá un monto mayor a cero.' });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/budgets', { categoryId, amount: value.toFixed(2), month, year });
      await Promise.resolve(onChanged());
      setIsOpen(false);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'No se pudo guardar el presupuesto';
      await showAlert({ title: 'Error', message: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: BudgetItem) => {
    const confirmed = await showConfirm({
      title: 'Eliminar límite',
      message: `¿Querés eliminar el límite de gasto de "${b.category.name}"?`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingId(b.id);
    try {
      await apiClient.delete(`/budgets/${b.id}`);
      await Promise.resolve(onChanged());
    } catch (e: any) {
      const msg = e.response?.data?.message || 'No se pudo eliminar el presupuesto';
      await showAlert({ title: 'Error', message: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary }}>
          Límites por Categoría
        </Text>
        <TouchableOpacity
          onPress={openModal}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.brandLight }}
        >
          <Plus size={14} color={colors.brand} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.brand }}>Definir límite</Text>
        </TouchableOpacity>
      </View>

      {budgets.length === 0 ? (
        <View style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted }}>
            No tenés límites de gasto definidos por categoría para este mes.
          </Text>
        </View>
      ) : (
        budgets.map((b) => {
          const over = b.pctUsed >= 100;
          const barColor =
            b.pctUsed <= 25
              ? '#10B981'
              : b.pctUsed <= 55
                ? '#EAB308'
                : b.pctUsed <= 80
                  ? '#F97316'
                  : '#EF4444';
          return (
            <View key={b.id} style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 3, elevation: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary }}>{b.category.name}</Text>
                <TouchableOpacity
                  onPress={() => handleDelete(b)}
                  disabled={deletingId === b.id}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deletingId === b.id ? (
                    <Spinner size={15} color={colors.textMuted} />
                  ) : (
                    <Trash2 size={15} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bgSubtle, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, b.pctUsed)}%`, height: '100%', backgroundColor: barColor, borderRadius: 4 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textMuted }}>
                  {formatCurrency(b.spent)} de {formatCurrency(b.amount)}
                </Text>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: over ? '#EF4444' : colors.textSecondary }}>
                  {over ? `Excedido ${formatCurrency(Math.abs(b.remaining))}` : `Disponible ${formatCurrency(b.remaining)}`}
                </Text>
              </View>
            </View>
          );
        })
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!saving) setIsOpen(false); }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }}
          onPress={() => { if (!saving) setIsOpen(false); }}
        >
          <Pressable style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 24 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary }}>
                Límite de gasto por categoría
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                disabled={saving}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ opacity: saving ? 0.4 : 1 }}
              >
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
              Definí cuánto es lo máximo que planeás gastar este mes en una categoría de gasto.
            </Text>

            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Categoría de gasto</Text>
            <ScrollView style={{ maxHeight: 150, marginBottom: 14 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((c) => {
                  const selected = c.id === categoryId;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      disabled={saving}
                      onPress={() => setCategoryId(c.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: selected ? colors.brand : colors.bgInput, borderWidth: 1, borderColor: selected ? colors.brand : colors.border, opacity: saving ? 0.6 : 1 }}
                    >
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: selected ? '#fff' : colors.textPrimary }}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>Tope máximo mensual ($)</Text>
            <TextInput
              value={amount}
              onChangeText={(text) => setAmount(formatAmountInput(text))}
              editable={!saving}
              placeholder="Ej: 50.000"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', fontVariant: ['tabular-nums'], color: colors.textPrimary, backgroundColor: colors.bgInput, marginBottom: 18, opacity: saving ? 0.6 : 1 }}
            />

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              accessibilityState={{ disabled: saving }}
              style={{
                width: '100%',
                paddingVertical: 14,
                backgroundColor: colors.brand,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <>
                  <Spinner size={18} color="#fff" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' }}>Guardando límite...</Text>
                </>
              ) : (
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' }}>Guardar límite</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
