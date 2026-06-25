import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { profileService, Especialidad, calcularEdad } from '../services/profileService';
import { AuthContext } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigation';
import { EXCURSION_TYPES, EXCURSION_DIFFICULTIES } from '../models/Excursion';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  Facil: 'Fácil',
  Medio: 'Medio',
  Dificil: 'Difícil',
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Facil: { bg: colors.easyBg, text: colors.easyText, border: colors.easyText },
  Medio: { bg: colors.mediumBg, text: colors.mediumText, border: colors.mediumText },
  Dificil: { bg: colors.hardBg, text: colors.hardText, border: colors.hardText },
};

const formatFecha = (date: Date): string =>
  date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { session } = useContext(AuthContext);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [materialDisponible, setMaterialDisponible] = useState('');
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(null);
  const [mostrarEdad, setMostrarEdad] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { profile } = await profileService.getOwnProfile();
      setNombreUsuario(profile.nombreUsuario ?? '');
      setNombre(profile.nombre ?? '');
      setApellido(profile.apellido ?? '');
      setTelefono(profile.telefono ?? '');
      setDescripcion(profile.descripcion ?? '');
      setMaterialDisponible(profile.materialDisponible ?? '');
      setEspecialidades(profile.especialidades ?? []);
      setFotoUrl(profile.fotoUrl ?? null);
      setMostrarEdad(profile.mostrarEdad ?? false);
      if (profile.fechaNacimiento) {
        setFechaNacimiento(new Date(profile.fechaNacimiento + 'T12:00:00'));
      }
    } catch {
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  const isSelected = (tipo: string) => especialidades.some(e => e.tipo === tipo);
  const getNivel = (tipo: string) => especialidades.find(e => e.tipo === tipo)?.nivel ?? 'Facil';

  const toggleEspecialidad = (tipo: string) => {
    setEspecialidades(prev =>
      isSelected(tipo)
        ? prev.filter(e => e.tipo !== tipo)
        : [...prev, { tipo, nivel: 'Facil' }]
    );
  };

  const setNivelForTipo = (tipo: string, nivel: string) => {
    setEspecialidades(prev => prev.map(e => e.tipo === tipo ? { ...e, nivel } : e));
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setFechaNacimiento(date);
  };

  const handleChangePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const newUrl = await profileService.pickAndUploadPhoto();
      if (newUrl) {
        await profileService.updateProfile({ fotoUrl: newUrl });
        setFotoUrl(newUrl);
      }
    } catch {
      Alert.alert('Error', 'No se pudo cambiar la foto de perfil');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert(
      'Eliminar foto',
      '¿Quieres eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (session?.user.id) {
                await profileService.deletePhoto(session.user.id);
                await profileService.updateProfile({ fotoUrl: null });
                setFotoUrl(null);
              }
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la foto');
            }
          },
        },
      ]
    );
  };

  const validate = (): boolean => {
    setError('');
    if (nombreUsuario.length < 3 || nombreUsuario.length > 20) {
      setError('El nombre de usuario debe tener entre 3 y 20 caracteres');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(nombreUsuario)) {
      setError('Solo letras, números y guiones bajos (_)');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await profileService.updateProfile({
        nombreUsuario,
        nombre,
        apellido,
        fechaNacimiento: fechaNacimiento ? fechaNacimiento.toISOString().split('T')[0] : null,
        mostrarEdad,
        telefono,
        descripcion,
        materialDisponible,
        especialidades,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const avatarLetter = nombreUsuario?.charAt(0).toUpperCase() ?? '?';
  const edadPreview = fechaNacimiento ? calcularEdad(fechaNacimiento.toISOString().split('T')[0]) : null;

  if (loadingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryGradientStart} />
      </View>
    );
  }

  return (
    <View style={shared.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerSide} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primaryGradientStart} />
            : <Text style={styles.saveText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Foto */}
          <View style={styles.photoSection}>
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.photoBtn} onPress={handleChangePhoto} disabled={uploadingPhoto}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color={colors.primaryGradientStart} />
                : <>
                    <MaterialDesignIcons name="camera-outline" size={16} color={colors.primaryGradientStart} />
                    <Text style={styles.photoBtnText}>Cambiar foto</Text>
                  </>
              }
            </TouchableOpacity>
            {fotoUrl ? (
              <TouchableOpacity onPress={handleDeletePhoto}>
                <Text style={styles.deletePhotoText}>Eliminar foto</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {error ? <Text style={shared.errorText}>{error}</Text> : null}

          {/* ── Datos básicos ── */}
          <View style={shared.card}>
            <Text style={styles.cardTitle}>Información básica</Text>

            <Text style={shared.label}>Nombre de usuario *</Text>
            <TextInput
              style={shared.input}
              value={nombreUsuario}
              onChangeText={setNombreUsuario}
              autoCapitalize="none"
              placeholder="tu_usuario"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={shared.label}>Nombre</Text>
            <TextInput
              style={shared.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={shared.label}>Apellido</Text>
            <TextInput
              style={shared.input}
              value={apellido}
              onChangeText={setApellido}
              placeholder="Tu apellido"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={shared.label}>Teléfono</Text>
            <TextInput
              style={shared.input}
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              placeholder="+34 600 000 000"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* ── Fecha de nacimiento ── */}
          <View style={shared.card}>
            <Text style={styles.cardTitle}>Fecha de nacimiento</Text>

            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <MaterialDesignIcons name="calendar-outline" size={18} color={colors.primaryGradientStart} />
              <Text style={[styles.datePickerText, !fechaNacimiento && styles.datePlaceholder]}>
                {fechaNacimiento ? formatFecha(fechaNacimiento) : 'Seleccionar fecha de nacimiento'}
              </Text>
              <MaterialDesignIcons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {edadPreview !== null && (
              <Text style={styles.edadPreview}>Edad calculada: {edadPreview} años</Text>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={fechaNacimiento ?? new Date(1990, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                onChange={onDateChange}
              />
            )}

            {/* Toggle mostrar edad */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Mostrar edad en mi perfil</Text>
                <Text style={styles.switchSubtext}>
                  {mostrarEdad && edadPreview !== null
                    ? `Se mostrará "${edadPreview} años"`
                    : 'Tu edad no será visible para otros'}
                </Text>
              </View>
              <Switch
                value={mostrarEdad}
                onValueChange={setMostrarEdad}
                trackColor={{ false: colors.grayLight, true: colors.primaryGradientStart }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          {/* ── Sobre mí ── */}
          <View style={shared.card}>
            <Text style={styles.cardTitle}>Sobre mí</Text>
            <TextInput
              style={[shared.input, styles.textArea]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Cuéntanos algo sobre ti, tu experiencia en la montaña..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* ── Material ── */}
          <View style={shared.card}>
            <Text style={styles.cardTitle}>Material disponible</Text>
            <TextInput
              style={shared.input}
              value={materialDisponible}
              onChangeText={setMaterialDisponible}
              placeholder="Ej: bastones, crampones, cuerda, piolet..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* ── Especialidades ── */}
          <View style={shared.card}>
            <Text style={styles.cardTitle}>Especialidades</Text>
            <Text style={styles.cardSubtitle}>Marca las disciplinas que practicas e indica tu nivel en cada una</Text>
            {EXCURSION_TYPES.map(tipo => {
              const selected = isSelected(tipo);
              const nivel = getNivel(tipo);
              return (
                <View key={tipo} style={styles.especialidadBlock}>
                  <TouchableOpacity
                    style={[styles.tipoRow, selected && styles.tipoRowSelected]}
                    onPress={() => toggleEspecialidad(tipo)}
                    activeOpacity={0.7}
                  >
                    <MaterialDesignIcons
                      name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={selected ? colors.primaryGradientStart : colors.textMuted}
                    />
                    <Text style={[styles.tipoText, selected && styles.tipoTextSelected]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>

                  {selected && (
                    <View style={styles.nivelRow}>
                      {EXCURSION_DIFFICULTIES.map(diff => {
                        const dc = DIFFICULTY_COLORS[diff];
                        const active = nivel === diff;
                        return (
                          <TouchableOpacity
                            key={diff}
                            style={[
                              styles.nivelChip,
                              active && { backgroundColor: dc.bg, borderColor: dc.border },
                            ]}
                            onPress={() => setNivelForTipo(tipo, diff)}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.nivelChipText,
                              active && { color: dc.text, fontWeight: '700' },
                            ]}>
                              {DIFFICULTY_LABELS[diff]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={[shared.primaryButton, { marginTop: 4 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={colors.white} />
              : <Text style={shared.primaryButtonText}>Guardar cambios</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
    backgroundColor: colors.white,
  },
  headerSide: { width: 80 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cancelText: { fontSize: 15, color: colors.textSecondary },
  saveText: { fontSize: 15, color: colors.primaryGradientStart, fontWeight: '700', textAlign: 'right' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  photoSection: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryGradientStart,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarLetter: { fontSize: 40, fontWeight: '700', color: colors.white },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primaryGradientStart,
  },
  photoBtnText: { color: colors.primaryGradientStart, fontWeight: '600', fontSize: 14 },
  deletePhotoText: { color: colors.errorRed, fontSize: 13 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  cardSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 12, marginTop: -8 },
  textArea: { height: 100, paddingTop: 10 },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.white,
  },
  datePickerText: { flex: 1, fontSize: 15, color: colors.textPrimary },
  datePlaceholder: { color: colors.textMuted },
  edadPreview: {
    marginTop: 8,
    fontSize: 13,
    color: colors.primaryGradientStart,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  switchSubtext: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  especialidadBlock: { marginBottom: 2 },
  tipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  tipoRowSelected: { backgroundColor: colors.backgroundSoft },
  tipoText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  tipoTextSelected: { color: colors.textPrimary, fontWeight: '600' },
  nivelRow: { flexDirection: 'row', gap: 8, paddingLeft: 32, paddingBottom: 8 },
  nivelChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.grayLight,
    backgroundColor: colors.white,
  },
  nivelChipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
});
