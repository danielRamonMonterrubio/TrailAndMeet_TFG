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
      !lat ||
      !lng ||
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

    const meetingLat = Number(lat);
    const meetingLng = Number(lng);
    const capacidad = Number(slots);
    const fechaInicio = toIsoDateTime(date, time);

    if (
      Number.isNaN(meetingLat) ||
      Number.isNaN(meetingLng) ||
      Number.isNaN(capacidad)
    ) {
      Alert.alert("Error", "Latitud, longitud y plazas deben ser numéricos");
      return;
    }

    if (!fechaInicio) {
      Alert.alert("Error", "Fecha u hora inválidas. Usa formato dd/mm/aaaa y hh:mm");
      return;
    }

    setIsSubmitting(true);

    // Paso 1: Subir archivo a Storage
    const gpxStoragePath = await excursionStorageService.uploadGpxFile(
      file.base64,
      file.name
    );

    if (!gpxStoragePath) {
      setIsSubmitting(false);
      Alert.alert("Error", "No se pudo subir el archivo GPX");
      return;
    }

    // Paso 2: Llamar RPC con la ruta real
    const rpcPayload = {
      p_dificultad: difficulty,
      p_fecha_inicio: fechaInicio,
      p_capacidad: capacidad,
      p_tipo_excursion: excursionType,
      p_punto_encuentro: place,
      p_titulo: title,
      p_imagen_url: null,
      p_gpx_path: gpxStoragePath,
      p_meeting_lat: meetingLat,
      p_meeting_lng: meetingLng,
      p_status: "published",
    };

    const { error } = await (supabase as any).rpc(
      "crear_excursion",
      rpcPayload
    );

    setIsSubmitting(false);

    if (error) {
      console.error("Error create_excursion:", error);
      // Rollback: borrar el archivo subido
      await excursionStorageService.deleteGpxFile(gpxStoragePath);
      Alert.alert("Error", "No se pudo crear la excursión. El archivo fue eliminado.");
      return;
    }

    Alert.alert("Éxito", "Excursión creada correctamente");
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
    
    // Volver a la pantalla anterior después de 1 segundo
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
    setDescription("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "android" ? "height" : "padding"}
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
            <Text style={styles.label}>Archivo GPX *</Text>
            <FilePickerInput
                fileName={file?.name || ""}
                onFileSelected={(f) => setFile(f)}
                />
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
            <FormInput
              label="Latitud *"
              value={lat}
              onChangeText={setLat}
            />
            <FormInput
              label="Longitud *"
              value={lng}
              onChangeText={setLng}
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
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "white",
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
  },
});