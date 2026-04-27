import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigation";

import LinearGradient from "react-native-linear-gradient";
import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { Alert } from "react-native";

import FormCard from "../components/form/FormCard";
import FormInput from "../components/form/FormInput";
import FormSelect from "../components/form/FormSelect";
import FilePickerInput from "../components/form/FilePickerInput";
import DatePickerInput from "../components/form/DatePickerInput";
import TimePickerInput from "../components/form/TimePickerInput";
import SlotsInput from "../components/form/SlotsInput";
import PrimaryButton from "../components/buttons/PrimaryButton";
import { AppFile } from "../types/AppFile";

import { ExcursionDifficulty, ExcursionType, EXCURSION_DIFFICULTIES, EXCURSION_TYPES } from "../models/Excursion";
import { supabase } from "../services/supabaseClient";
import { excursionStorageService } from "../services/excursionStorageService";
import excursionCreationService from "../services/excursionCreationService";

const CreateExcursionScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<AppFile | null>(null);
  const [difficulty, setDifficulty] = useState<ExcursionDifficulty | "">("");
  const [excursionType, setExcursionType] = useState<ExcursionType | "">("Senderismo");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [slots, setSlots] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toIsoDateTime = (dateText: string, timeText: string) => {
    const [day, month, year] = dateText.split("/").map((v) => Number(v));
    const [hours, minutes] = timeText.split(":").map((v) => Number(v));

    if (
      !day ||
      !month ||
      !year ||
      Number.isNaN(day) ||
      Number.isNaN(month) ||
      Number.isNaN(year) ||
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      return null;
    }

    return new Date(year, month - 1, day, hours, minutes).toISOString();
  };

  const handleSubmit = async () => {
    if (
      !title ||
      !file ||
      !difficulty ||
      !date ||
      !time ||
      !place ||
      !slots ||
      !material
    ) {
      Alert.alert("Error", "Completa todos los campos obligatorios");
      return;
    }

    // Validar que sea .gpx
    if (!excursionStorageService.validateGpxFile(file.name)) {
      Alert.alert("Error", "El archivo debe tener extensión .gpx");
      return;
    }

    const capacidad = Number(slots);
    const fechaInicio = toIsoDateTime(date, time);

    if (Number.isNaN(capacidad)) {
      Alert.alert("Error", "Plazas debe ser numérico");
      return;
    }

    if (!fechaInicio) {
      Alert.alert("Error", "Fecha u hora inválidas. Usa formato dd/mm/aaaa y hh:mm");
      return;
    }

    setIsSubmitting(true);

    try {
      // Paso 1: Subir archivo a Storage
      console.log('📤 Iniciando upload de GPX:', file.name);
      const gpxStoragePath = await excursionStorageService.uploadGpxFile(
        file.base64,
        file.name
      );

      console.log('📤 Resultado upload:', gpxStoragePath);

      if (!gpxStoragePath) {
        Alert.alert("Error", "No se pudo subir el archivo GPX");
        setIsSubmitting(false);
        return;
      }

      // Paso 2: Llamar Edge Function que parsea GPX y crea la excursión
      const response = await excursionCreationService.createExcursionWithGpx({
        gpxBase64: file.base64,
        p_titulo: title,
        p_dificultad: difficulty,
        p_fecha_inicio: fechaInicio,
        p_capacidad: capacidad,
        p_tipo_excursion: excursionType,
        p_punto_encuentro: place,
        p_imagen_url: null,
        p_gpx_path: gpxStoragePath,
        p_status: "published",
      });

      setIsSubmitting(false);

      if (response.success) {
        const routeInfo = response.routeInfo;
        
        // Limpiar formulario
        setTitle("");
        setFile(null);
        setDifficulty("");
        setExcursionType("Senderismo");
        setDate("");
        setTime("");
        setPlace("");
        setLat("");
        setLng("");
        setSlots("");
        setMaterial("");
        setDescription("");

        // Navegar y reemplazar la pantalla (sin poder volver atrás)
        navigation.reset({
          index: 0,
          routes: [{ name: 'ExcursionList' }],
        });

        // Mostrar confirmación después
        setTimeout(() => {
          Alert.alert(
            "¡Excursión creada!",
            `Punto de encuentro detectado automáticamente:\nLat: ${routeInfo?.startPoint.lat.toFixed(
              6
            )}\nLon: ${routeInfo?.startPoint.lng.toFixed(6)}\n\nDistancia: ${
              routeInfo?.totalDistance
            }km\nElevación máxima: ${routeInfo?.maxElevation}m`
          );
        }, 300);
      }
    } catch (error) {
      setIsSubmitting(false);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container}>
        {/* HEADER */}
        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Crear Excursión</Text>
          <Text style={styles.headerSubtitle}>
            Organiza tu próxima aventura
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* TITULO */}
          <FormCard>
            <FormInput
              label="Título de la excursión *"
              value={title}
              onChangeText={setTitle}
              placeholder="Ej: Ruta del Cares"
            />
          </FormCard>

          {/* GPX */}
          <FormCard>
            <Text style={shared.label}>Archivo GPX *</Text>
            <FilePickerInput
                fileName={file?.name || ""}
                onFileSelected={(f) => setFile(f)}
                />
            <Text style={styles.helperText}>
              Las coordenadas de inicio se extraerán automáticamente del archivo GPX
            </Text>
          </FormCard>

          {/* DIFICULTAD */}
          <FormCard>
            <FormSelect
              label="Nivel de dificultad *"
              value={difficulty}
              options={EXCURSION_DIFFICULTIES}
              onSelect={(v) => setDifficulty(v as ExcursionDifficulty)}
            />
          </FormCard>

          {/* TIPO DE EXCURSION */}
          <FormCard>
            <FormSelect
              label="Tipo de excursión *"
              value={excursionType}
              options={EXCURSION_TYPES}
              onSelect={(v) => setExcursionType(v as ExcursionType)}
            />
          </FormCard>

          {/* FECHA */}
          <FormCard>
            <DatePickerInput
              label="Fecha *"
              value={date}
              onDateSelected={setDate}
            />
            <TimePickerInput
              label="Hora *"
              value={time}
              onTimeSelected={setTime}
            />
          </FormCard>

          {/* UBICACION */}
          <FormCard>
            <FormInput
              label="Punto de encuentro *"
              value={place}
              onChangeText={setPlace}
              placeholder="Nombre del lugar"
            />
          </FormCard>

          {/* PLAZAS */}
          <FormCard>
            <SlotsInput
              label="Número de plazas"
              value={slots}
              onChangeText={setSlots}
            />
          </FormCard>

          {/* MATERIAL */}
          <FormCard>
            <FormInput
              label="Material recomendado *"
              value={material}
              onChangeText={setMaterial}
              multiline
            />
          </FormCard>

          {/* DESCRIPCION */}
          <FormCard>
            <FormInput
              label="Descripción (opcional)"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </FormCard>

          <PrimaryButton
            title={isSubmitting ? "Creando..." : "Crear Excursión"}
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateExcursionScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSoft,
  },
  header: {
    padding: 20,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: colors.white,
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
});