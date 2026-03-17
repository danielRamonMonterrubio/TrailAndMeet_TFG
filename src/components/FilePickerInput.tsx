import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { colors } from "../theme/colors";
import { AppFile } from "../types/AppFile";

type Props = {
  fileName: string;
  onFileSelected: (file: AppFile) => void;
};

const FilePickerInput = ({ fileName, onFileSelected }: Props) => {
  const pickFile = async () => {
    const result = await launchImageLibrary({
      mediaType: "mixed", 
    });

    if (result.assets && result.assets.length > 0) {
      const file = result.assets[0];

      onFileSelected({
        name: file.fileName || "archivo",
        uri: file.uri || "",
        type: file.type || "",
      });
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={pickFile}>
        <Text style={styles.buttonText}>Seleccionar archivo</Text>
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
  },
  buttonText: {
    color: "#065F46",
    fontWeight: "600",
  },
  fileText: {
    color: colors.textMuted,
  },
});