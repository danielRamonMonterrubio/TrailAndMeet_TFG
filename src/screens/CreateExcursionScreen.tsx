import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import LinearGradient from "react-native-linear-gradient";
import { colors } from "../theme/colors";
import { Alert } from "react-native";

import FormCard from "../components/FormCard";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import FilePickerInput from "../components/FilePickerInput";
import PrimaryButton from "../components/PrimaryButton";
import { AppFile } from "../types/AppFile";

import { ExcursionDifficulty } from "../models/Excursion";

const CreateExcursionScreen = () => {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<AppFile | null>(null);
  const [difficulty, setDifficulty] = useState<ExcursionDifficulty | "">("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [slots, setSlots] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
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

    console.log("READY PARA BACKEND");
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
              options={["Facil", "Medio", "Dificil"]}
              onSelect={(v) => setDifficulty(v as ExcursionDifficulty)}
            />
          </FormCard>

          {/* FECHA */}
          <FormCard>
            <FormInput
              label="Fecha *"
              value={date}
              onChangeText={setDate}
              placeholder="dd/mm/aaaa"
            />
            <FormInput
              label="Hora *"
              value={time}
              onChangeText={setTime}
              placeholder="--:--"
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
            <FormInput
              label="Número de plazas *"
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
            title="Crear Excursión"
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