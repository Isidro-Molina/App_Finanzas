import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Calendar, Download } from 'lucide-react-native';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import apiClient from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { Spinner } from '../Spinner';
import {
  ExportCsvType,
  buildCsvFileName,
  formatCsvDisplayDate,
  formatCsvQueryDate,
} from '../../utils/exportCsv';

type PresetKey = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'CUSTOM';

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'THIS_MONTH', label: 'Este mes' },
  { key: 'LAST_MONTH', label: 'Mes anterior' },
  { key: 'LAST_3_MONTHS', label: 'Últimos 3 meses' },
  { key: 'THIS_YEAR', label: 'Este año' },
  { key: 'CUSTOM', label: 'Personalizado' },
];

const TYPE_OPTIONS: Array<{ key: ExportCsvType; label: string }> = [
  { key: 'ALL', label: 'Todos' },
  { key: 'EXPENSE', label: 'Gastos' },
  { key: 'INCOME', label: 'Ingresos' },
];

function getPresetRange(preset: PresetKey): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'THIS_MONTH':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: today,
      };
    case 'LAST_MONTH':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case 'LAST_3_MONTHS':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to: today,
      };
    case 'THIS_YEAR':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: today,
      };
    default:
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: today,
      };
  }
}

export const ExportCsvModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { showAlert } = useDialog();

  const [preset, setPreset] = useState<PresetKey>('THIS_MONTH');
  const [exportType, setExportType] = useState<ExportCsvType>('ALL');
  const [fromDate, setFromDate] = useState<Date>(() => getPresetRange('THIS_MONTH').from);
  const [toDate, setToDate] = useState<Date>(() => getPresetRange('THIS_MONTH').to);
  const [pickerTarget, setPickerTarget] = useState<'FROM' | 'TO' | null>(null);
  const [maxPickerDate] = useState(() => new Date());

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [cachedCsv, setCachedCsv] = useState<string>('');
  const [counting, setCounting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const rangeValidationError = useMemo(() => {
    const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (start > end) {
      return 'La fecha "Desde" no puede ser posterior a "Hasta".';
    }
    if (end > today) {
      return 'La fecha "Hasta" no puede superar el día de hoy.';
    }
    const monthsDiff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (monthsDiff > 24) {
      return 'El rango máximo permitido es de 24 meses.';
    }
    return null;
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!visible || rangeValidationError) {
      setPreviewCount(null);
      setCachedCsv('');
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCounting(true);
      try {
        const params = new URLSearchParams({
          from: formatCsvQueryDate(fromDate),
          to: formatCsvQueryDate(toDate),
        });
        if (exportType !== 'ALL') {
          params.set('type', exportType);
        }
        const res = await apiClient.get(`/transactions/export-csv?${params.toString()}`);
        if (cancelled) return;
        setPreviewCount(typeof res.data?.count === 'number' ? res.data.count : 0);
        setCachedCsv(res.data?.csv || '');
      } catch {
        if (!cancelled) {
          setPreviewCount(null);
          setCachedCsv('');
        }
      } finally {
        if (!cancelled) setCounting(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, fromDate, toDate, exportType, rangeValidationError]);

  const handleSelectPreset = (key: PresetKey) => {
    setPreset(key);
    setPickerTarget(null);
    if (key !== 'CUSTOM') {
      const range = getPresetRange(key);
      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  const handleExport = async () => {
    if (rangeValidationError || !cachedCsv || !previewCount) return;

    setExporting(true);
    try {
      const fileName = buildCsvFileName(fromDate, toDate, exportType);
      const file = new File(Paths.document, fileName);
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(cachedCsv);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: fileName,
          UTI: 'public.comma-separated-values-text',
        });
        onClose();
      } else {
        await showAlert({
          title: 'Exportación lista',
          message: `Archivo guardado como "${fileName}".`,
        });
        onClose();
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al exportar los datos';
      await showAlert({
        title: 'Error',
        message: Array.isArray(msg) ? msg[0] : msg,
      });
    } finally {
      setExporting(false);
    }
  };

  const canExport =
    !rangeValidationError && !counting && !exporting && (previewCount ?? 0) > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => { if (!exporting) onClose(); }}
    >
      <Pressable
        onPress={() => { if (!exporting) onClose(); }}
        style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 36,
            maxHeight: '88%',
            borderTopWidth: isDark ? 1 : 0,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 19, color: colors.textPrimary }}>
              Exportar datos (CSV)
            </Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={exporting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ opacity: exporting ? 0.4 : 1 }}
            >
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tipo de movimientos: Todos | Gastos | Ingresos */}
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              Movimientos a incluir
            </Text>
            <View style={{ flexDirection: 'row', backgroundColor: colors.bgInput, padding: 4, borderRadius: 12, gap: 4, marginBottom: 18 }}>
              {TYPE_OPTIONS.map((opt) => {
                const selected = exportType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    disabled={exporting}
                    onPress={() => setExportType(opt.key)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 9,
                      alignItems: 'center',
                      backgroundColor: selected ? colors.brand : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: selected ? '#FFFFFF' : colors.textMuted }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Atajos de rango */}
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              Período
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {PRESETS.map((p) => {
                const selected = preset === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    disabled={exporting}
                    onPress={() => handleSelectPreset(p.key)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.brand : colors.border,
                      backgroundColor: selected ? colors.brandLight : colors.bgInput,
                    }}
                  >
                    <Text style={{ fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_400Regular', fontSize: 12, color: selected ? colors.brand : colors.textSecondary }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selectores Desde / Hasta */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                disabled={exporting}
                onPress={() => {
                  setPreset('CUSTOM');
                  setPickerTarget(pickerTarget === 'FROM' ? null : 'FROM');
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.bgInput,
                  borderWidth: 1.5,
                  borderColor: pickerTarget === 'FROM' ? colors.brand : colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                  Desde
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color={colors.brand} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>
                    {formatCsvDisplayDate(fromDate)}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={exporting}
                onPress={() => {
                  setPreset('CUSTOM');
                  setPickerTarget(pickerTarget === 'TO' ? null : 'TO');
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.bgInput,
                  borderWidth: 1.5,
                  borderColor: pickerTarget === 'TO' ? colors.brand : colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                  Hasta
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color={colors.brand} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>
                    {formatCsvDisplayDate(toDate)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {pickerTarget ? (
              <View style={{ marginBottom: 12 }}>
                <DateTimePicker
                  value={pickerTarget === 'FROM' ? fromDate : toDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={maxPickerDate}
                  themeVariant={isDark ? 'dark' : 'light'}
                  onChange={(_event, date) => {
                    if (Platform.OS !== 'ios') setPickerTarget(null);
                    if (date) {
                      if (pickerTarget === 'FROM') setFromDate(date);
                      else setToDate(date);
                    }
                  }}
                />
              </View>
            ) : null}

            {/* Vista previa / Error */}
            <View
              style={{
                backgroundColor: rangeValidationError ? '#FEF2F2' : colors.bgInput,
                borderRadius: 12,
                padding: 12,
                marginBottom: 18,
                borderWidth: 1,
                borderColor: rangeValidationError ? '#FCA5A5' : colors.borderSubtle,
              }}
            >
              {rangeValidationError ? (
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#DC2626' }}>
                  {rangeValidationError}
                </Text>
              ) : counting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Spinner size={14} color={colors.brand} />
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>
                    Calculando movimientos...
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>
                    {previewCount === 0
                      ? 'No hay movimientos en el período seleccionado'
                      : `Se exportarán ${previewCount ?? 0} movimientos`}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                    Archivo: {buildCsvFileName(fromDate, toDate, exportType)}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={handleExport}
            disabled={!canExport}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.brand,
              borderRadius: 14,
              paddingVertical: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: canExport ? 1 : 0.45,
            }}
          >
            {exporting ? (
              <>
                <Spinner size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
                  Exportando...
                </Text>
              </>
            ) : (
              <>
                <Download size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
                  Exportar CSV
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
