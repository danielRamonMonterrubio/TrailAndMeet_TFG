import { TouchableOpacity, Text, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
};

const PrimaryButton = ({ title, onPress }: Props) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.button}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default PrimaryButton;

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  text: {
    color: "white",
    fontWeight: "600",
  },
});