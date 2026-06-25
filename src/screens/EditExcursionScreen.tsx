import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import excursionDetailService from '../services/excursionDetailService';
import { excursionManagementService } from '../services/excursionManagementService';
import FormInput from '../components/form/FormInput';
import FormSelect from '../components/form/FormSelect';
import PrimaryButton from '../components/buttons/PrimaryButton';
import { RootStackParamList } from '../navigation/AppNavigation';
import { EXCURSION_DIFFICULTIES, EXCURSION_TYPES } from '../models/Excursion';

interface RouteParams {
  excursionId: string;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditExcursion'>;
};

const EditExcursionScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { excursionId } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [dificultad, setDificultad] = useState('');
  const [tipoExcursion, setTipoExcursion] = useState('');
  const [puntoEncuentro, setPuntoEncuentro] = useState('');
  const [meetingLat, setMeetingLat] = useState('');
  const [meetingLng, setMeetingLng] = useState('');

  useEffect(() => {
    loadData();
  }, [excursionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const detail = await excursionDetailService.getExcursionDetail(excursionId);
      setTitulo(detail.title);
      setCapacidad(String(detail.capacity));
      setDificultad(detail.difficulty);
      setTipoExcursion(detail.type);
      setPuntoEncuentro(detail.meetingPoint);
      setMeetingLat(String(detail.meetingLat));
      setMeetingLng(String(detail.meetingLng));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error cargando datos');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }
    const capNum = parseInt(capacidad, 10);
    if (isNaN(capNum) || capNum < 1) {
      Alert.alert('Error', 'La capacidad debe ser un número mayor que 0');
      return;
    }
    const latNum = parseFloat(meetingLat);
    const lngNum = parseFloat(meetingLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert('Error', 'Las coordenadas del punto de encuentro no son válidas');
      return;
    }

    setSaving(true);
    try {
      await excursionManagementService.updateExcursion({
        excursionId,
        titulo: titulo.trim(),
        capacidad: capNum,
        dificultad,
        tipoExcursion,
        puntoEncuentro: puntoEncuentro.trim(),
        meetingLat: latNum,
        meetingLng: lngNum,
      });
      Alert.alert('Guardado', 'Los cambios se han guardado correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error guardando cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryGradientStart} />
      </View>
    );
  }

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar excursión</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>Nota: la fecha de inicio y el GPX no son editables.</Text>

        <FormInput
          label="Título"
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Nombre de la excursión"
        />

        <FormInput
          label="Capacidad (participantes)"
          value={capacidad}
          onChangeText={setCapacidad}
          placeholder="Ej: 15"
          keyboardType="numeric"
        />

        <FormSelect
          label="Dificultad"
          value={dificultad}
          options={EXCURSION_DIFFICULTIES}
          onSelect={setDificultad}
        />

        <FormSelect
          label="Tipo de excursión"
          value={tipoExcursion}
          options={EXCURSION_TYPES}
          onSelect={setTipoExcursion}
        />

        <FormInput
          label="Punto de encuentro"
          value={puntoEncuentro}
          onChangeText={setPuntoEncuentro}
          placeholder="Descripción del punto"
        />

        <FormInput
          label="Latitud del punto de encuentro"
          value={meetingLat}
          onChangeText={setMeetingLat}
          placeholder="Ej: 40.4168"
          keyboardType="numeric"
        />

        <FormInput
          label="Longitud del punto de encuentro"
          value={meetingLng}
          onChangeText={setMeetingLng}
          placeholder="Ej: -3.7038"
          keyboardType="numeric"
        />

        <View style={styles.saveButton}>
          <PrimaryButton
            title={saving ? 'Guardando...' : 'Guardar cambios'}
            onPress={handleSave}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default EditExcursionScreen;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundSoft },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
    backgroundColor: colors.white,
  },
  backButton: { width: 80 },
  backText: { color: colors.primaryGradientStart, fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  content: { padding: 16, gap: 4, paddingBottom: 40 },
  note: { fontSize: 12, color: colors.textMuted, marginBottom: 12, fontStyle: 'italic' },
  saveButton: { marginTop: 16 },
});
