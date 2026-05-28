import React, { useState, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Image, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../navigation/AppNavigation';
import { forumService } from '../services/forumService';
import { forumStorageService } from '../services/forumStorageService';
import { AuthContext } from '../context/AuthContext';
import { shared } from '../theme/styles';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIAS_PREDEFINIDAS = [
  'Zonas geográficas', 'Niveles técnicos', 'Meteorología',
  'Material', 'Seguridad', 'Entrenamiento', 'Refugios', 'Iniciación',
];

const CreateForumScreen = () => {
  const navigation = useNavigation<Nav>();
  const { session } = useContext(AuthContext);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [esPrivado, setEsPrivado] = useState(false);
  const [password, setPassword] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [portadaPath, setPortadaPath] = useState<string | null>(null);
  const [portadaPreview, setPortadaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const toggleCategoria = (cat: string) => {
    setCategorias(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const añadirCategoriaCustom = () => {
    const trimmed = categoriaCustom.trim();
    if (trimmed && !categorias.includes(trimmed)) {
      setCategorias(prev => [...prev, trimmed]);
      setCategoriaCustom('');
    }
  };

  const seleccionarPortada = async () => {
    if (!session?.user?.id) return;
    setSubiendoImagen(true);
    try {
      const result = await forumStorageService.pickAndUploadCover(session.user.id);
      if (result) {
        setPortadaPath(result.path);
        setPortadaPreview(result.localUri);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setSubiendoImagen(false);
    }
  };

  const crear = async () => {
    if (!titulo.trim()) { Alert.alert('Error', 'El título es obligatorio'); return; }
    if (!descripcion.trim()) { Alert.alert('Error', 'La descripción es obligatoria'); return; }
    if (esPrivado && !password.trim()) { Alert.alert('Error', 'Los foros privados necesitan contraseña'); return; }

    setLoading(true);
    try {
      await forumService.createForum({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo: esPrivado ? 'privado' : 'publico',
        categorias,
        password: esPrivado ? password.trim() : undefined,
        portada_url: portadaPath,
      });
      Alert.alert('¡Foro creado!', 'Tu foro ya está disponible.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={shared.screenTitle}>Crear Foro</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Portada */}
        <TouchableOpacity style={styles.portadaBtn} onPress={seleccionarPortada} disabled={subiendoImagen}>
          {portadaPreview ? (
            <Image source={{ uri: portadaPreview }} style={styles.portadaImg} />
          ) : (
            <View style={styles.portadaPlaceholder}>
              {subiendoImagen ? (
                <ActivityIndicator color={colors.primaryGradientStart} />
              ) : (
                <>
                  <MaterialDesignIcons name="image-plus" size={36} color={colors.textMuted} />
                  <Text style={styles.portadaText}>Añadir foto de portada</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        <Text style={shared.label}>Título *</Text>
        <TextInput
          style={shared.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Nombre del foro"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />

        <Text style={shared.label}>Descripción *</Text>
        <TextInput
          style={[shared.input, styles.textArea]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="¿De qué trata este foro?"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />

        <Text style={shared.label}>Categorías</Text>
        <View style={styles.chipsContainer}>
          {CATEGORIAS_PREDEFINIDAS.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, categorias.includes(cat) && styles.chipActivo]}
              onPress={() => toggleCategoria(cat)}
            >
              <Text style={[styles.chipText, categorias.includes(cat) && styles.chipTextActivo]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customCatRow}>
          <TextInput
            style={[shared.input, { flex: 1, marginBottom: 0 }]}
            value={categoriaCustom}
            onChangeText={setCategoriaCustom}
            placeholder="Añadir categoría personalizada..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={añadirCategoriaCustom}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addCatBtn} onPress={añadirCategoriaCustom}>
            <MaterialDesignIcons name="plus" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        {categorias.filter(c => !CATEGORIAS_PREDEFINIDAS.includes(c)).length > 0 && (
          <View style={[styles.chipsContainer, { marginTop: 8 }]}>
            {categorias.filter(c => !CATEGORIAS_PREDEFINIDAS.includes(c)).map(cat => (
              <TouchableOpacity key={cat} style={[styles.chip, styles.chipActivo]} onPress={() => toggleCategoria(cat)}>
                <Text style={[styles.chipText, styles.chipTextActivo]}>{cat}</Text>
                <MaterialDesignIcons name="close" size={12} color={colors.white} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.switchRow}>
          <View>
            <Text style={shared.label}>Foro privado</Text>
            <Text style={styles.switchDesc}>Acceso solo con contraseña</Text>
          </View>
          <Switch
            value={esPrivado}
            onValueChange={setEsPrivado}
            trackColor={{ true: colors.primaryGradientStart, false: colors.grayLight }}
            thumbColor={colors.white}
          />
        </View>

        {esPrivado && (
          <>
            <Text style={shared.label}>Contraseña *</Text>
            <TextInput
              style={shared.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña de acceso"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </>
        )}

        <TouchableOpacity
          style={[shared.primaryButton, loading && { opacity: 0.6 }]}
          onPress={crear}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={shared.primaryButtonText}>Crear Foro</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: { padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  portadaBtn: { marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  portadaImg: { width: '100%', height: 160, borderRadius: 12 },
  portadaPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: colors.backgroundSoft,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderStyle: 'dashed',
  },
  portadaText: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  textArea: { height: 100, textAlignVertical: 'top' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  chipActivo: { backgroundColor: colors.primaryGradientStart, borderColor: colors.primaryGradientStart },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  chipTextActivo: { color: colors.white },
  customCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addCatBtn: {
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 8,
  },
  switchDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});

export default CreateForumScreen;
