import { View, Text, TouchableOpacity, StyleSheet, Alert, NativeModules } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { colors } from "../../theme/colors";
import { AppFile } from "../../types/AppFile";

const { GpxPicker } = NativeModules;

type Props = {
  fileName: string;
  onFileSelected: (file: AppFile) => void;
};

const FilePickerInput = ({ fileName, onFileSelected }: Props) => {
  const pickGpxFile = async () => {
    try {
      const file = await GpxPicker.pickGpxFile();

      if (!file.name.endsWith(".gpx")) {
        Alert.alert("Error", "Selecciona un archivo GPX");
        return;
      }

      console.log("Archivo seleccionado:", file);

      onFileSelected({
        name: file.name,
        base64: file.base64,
        type: file.type || "application/gpx+xml",
      });
    } catch (err: any) {
      console.log("Error o cancelado:", err);
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={pickGpxFile}>
        <MaterialDesignIcons name="file-document" size={18} color="#065F46" />
        <Text style={styles.buttonText}>Seleccionar archivo GPX</Text>
      </TouchableOpacity>

      <Text style={styles.fileText}>
        {fileName || "Ningún archivo seleccionado"}
      </Text>
    </View>
  );
};

export default FilePickerInput;

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#D1FAE5",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#065F46",
    fontWeight: "600",
  },
  fileText: {
    color: colors.textMuted,
  },
});
